"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const arch = require('arch');
const { DownloadAgent, DownloadNSSM, CreateConfigFile, PromptUserForAgentConfig, RestAPILogin } = require('../shared/utils')
const { UnzipFile, InstallAsWindowsService } = require('../shared/win-utils');
const fs = require("fs");


let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

let agentPathUncompressed = `${rootPath}sg-agent-launcher.exe`;
let nssmPathUncompressed = `${rootPath}nssm.exe`;

(async () => {
    try {
        const command = process.argv[2]

        if (command == 'download') {
            let accessKeyId = process.argv[3];
            let accessKeySecret = process.argv[4];

            console.log('Downloading SaasGlue agent');
            let res = await DownloadAgent(UnzipFile, agentPathUncompressed, accessKeyId, accessKeySecret, 'win', arch());
            console.log('Download Complete');
        } else if (command == 'install') {
            let accessKeyId = process.argv[3];
            let accessKeySecret = process.argv[4];

            if (!accessKeyId || !accessKeySecret) {
                let resUserConfig = await PromptUserForAgentConfig();
                accessKeyId = resUserConfig.SG_ACCESS_KEY_ID;
                accessKeySecret = resUserConfig.SG_ACCESS_KEY_SECRET;
                tags = resUserConfig.tags;

                if (!accessKeyId) {
                    console.log('Unable to install SaasGlue agent: Missing access key id');
                    process.exit(1);
                }


                if (!accessKeySecret) {
                    console.log('Unable to install SaasGlue agent: Missing access key secret');
                    process.exit(1);
                }
            }

            console.log('Creating sg.cfg');
            await CreateConfigFile(accessKeyId, accessKeySecret, tags);
            console.log('Configuration file created');

            console.log('Downloading and installing SaasGlue agent');
            let res = await DownloadAgent(UnzipFile, agentPathUncompressed, accessKeyId, accessKeySecret, 'win', arch());
            let serviceName = `SGAgent-${res._teamId}`;
            console.log('Download Complete');

            if (!fs.existsSync(nssmPathUncompressed)) {
                console.log(`Downloading nssm`);
                await DownloadNSSM(UnzipFile, nssmPathUncompressed, accessKeyId, accessKeySecret, arch());
            }

            console.log(`Installing SaasGlue agent windows service for team "${res._teamId}" - ${serviceName}"`);
            await InstallAsWindowsService(serviceName, agentPathUncompressed);
            console.log('Install Complete');
        } else if (command == 'uninstall') {
            let serviceName = undefined;
            if (process.argv.length > 3)
                serviceName = process.argv[3];

            if (!fs.existsSync(nssmPathUncompressed)) {
                let cfg = await GetAgentConfig();
                let accessKeyId = cfg.SG_ACCESS_KEY_ID;
                let accessKeySecret = cfg.SG_ACCESS_KEY_SECRET;

                console.log(`Downloading nssm`);
                await DownloadNSSM(UnzipFile, nssmPathUncompressed, accessKeyId, accessKeySecret, arch());
            }

            if (serviceName) {
                await RemoveWindowsService(serviceName);
            } else {
                let cfgAsString = fs.readFileSync('sg.cfg');
                let cfg = JSON.parse(cfgAsString);
                let resLogin = await RestAPILogin(cfg['SG_ACCESS_KEY_ID'], cfg['SG_ACCESS_KEY_SECRET']);
                let serviceName = `SGAgent-${resLogin._teamId}`;
                await RemoveWindowsService(serviceName);
            }
        }
        process.exit(0);
    } catch (err) {
        console.log('Error installing SaasGlue agent: ', err);
        process.exit(1);
    }
})();
