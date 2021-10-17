"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const arch = require('arch');
const { DownloadAgent, DownloadNSSM, CreateConfigFile, PromptUserForAgentConfig, RestAPILogin, RunCommand } = require('../shared/utils')
const { UnzipFile, InstallAsWindowsService, RemoveWindowsService, GetServiceName, StartWindowsService, StopWindowsService } = require('../shared/win-utils');
const {ApplicationUsageError} = require('../shared/errors');
const fs = require("fs");


// let rootPath = "C:\\Program Files\\SaaSGlue\\";
let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

const agentPathUncompressed = `${rootPath}sg-agent-launcher.exe`;
const nssmPathUncompressed = `${rootPath}nssm.exe`;
const configFileName = `${rootPath}sg.cfg`;
let serviceName;


(async () => {
    try {
        let command = process.argv[2]
        if (!command)
            command = 'install';

        if (command == 'install' || command == 'download') {
            let accessKeyId = process.argv[3];
            let accessKeySecret = process.argv[4];
            let tags = process.argv[5];

            if (!accessKeyId || !accessKeySecret) {
                let resUserConfig = await PromptUserForAgentConfig(configFileName);
                accessKeyId = resUserConfig.SG_ACCESS_KEY_ID;
                accessKeySecret = resUserConfig.SG_ACCESS_KEY_SECRET;
                tags = resUserConfig.tags;

                if (!accessKeyId) {
                    console.log('Unable to download SaaSGlue agent: Missing access key id');
                    process.exit(1);
                }

                if (!accessKeySecret) {
                    console.log('Unable to download SaaSGlue agent: Missing access key secret');
                    process.exit(1);
                }
            }

            console.log('Creating ', configFileName);
            await CreateConfigFile(configFileName, accessKeyId, accessKeySecret, tags);
            console.log('Configuration file created');

            console.log('Downloading SaaSGlue agent');
            await DownloadAgent(UnzipFile, agentPathUncompressed, 'win', arch());
            console.log('Download Complete');

            if (command == 'install') {
                if (!fs.existsSync(nssmPathUncompressed)) {
                    console.log(`Downloading nssm`);
                    await DownloadNSSM(UnzipFile, nssmPathUncompressed, arch());
                }
    
                let resLogin = await RestAPILogin(accessKeyId, accessKeySecret);
                serviceName = `SGAgent-${resLogin._teamId}`;
                console.log(`Installing SaaSGlue agent windows service for team "${resLogin._teamId}" - ${serviceName}"`);
                await InstallAsWindowsService(serviceName, "\"" + agentPathUncompressed + "\"", nssmPathUncompressed);
                console.log('Install Complete');
            } else {
                console.log('To start the SaaSGlue Agent run sg-agent-launcher.exe');
            }
        } else if (command == 'uninstall') {
            if (process.argv.length > 3)
                serviceName = process.argv[3];

            if (!fs.existsSync(nssmPathUncompressed)) {
                console.log(`Downloading nssm`);
                await DownloadNSSM(UnzipFile, nssmPathUncompressed, arch());
            }

            let serviceName = await GetServiceName(configFileName);
            await RemoveWindowsService(serviceName, nssmPathUncompressed);
        } else if (command == 'start') {
            if (!fs.existsSync(nssmPathUncompressed)) {
                console.log(`Downloading nssm`);
                await DownloadNSSM(UnzipFile, nssmPathUncompressed, arch());
            }

            let serviceName = await GetServiceName(configFileName);
            await StartWindowsService(serviceName, nssmPathUncompressed);
        } else if (command == 'stop') {
            if (!fs.existsSync(nssmPathUncompressed)) {
                console.log(`Downloading nssm`);
                await DownloadNSSM(UnzipFile, nssmPathUncompressed, arch());
            }

            let serviceName = await GetServiceName(configFileName);
            await StopWindowsService(serviceName, nssmPathUncompressed);
        }
        process.exit(0);
    } catch (err) {
        if (err instanceof ApplicationUsageError) {
            console.log(`
      usage: /sg-agent-installer-win-x64.exe <command> [parameters]
      
        sg_agent download  
        sg_agent install [sg agent access key id] [sg agent access secret key]
        sg_agent start
        sg_agent stop
        sg_agent uninstall
        `)
        } else {
            console.log(err);
        }
        process.exit(1);
    }
})();
