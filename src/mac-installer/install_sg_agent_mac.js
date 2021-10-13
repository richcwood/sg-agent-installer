"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const {DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable} = require('../shared/utils')
const {InstallAsLaunchdService, RemoveLaunchdService} = require('../shared/mac-utils');
const {ApplicationUsageError} = require('../shared/errors');
const fs = require("fs");
const fse = require("fs-extra");


let accessKeyId = process.argv[3];
let accessKeySecret = process.argv[4];
let tags = process.argv[5];

let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

const agentPathUncompressed = `${rootPath}sg-agent-launcher`;
const agentInstallLocation = '/usr/local/lib/saasglue';

let Download = async () => {
  try {
    console.log('Downloading SaasGlue agent');
    await DownloadAgent(GunzipFile, agentPathUncompressed, 'macos', '');
    await MakeFileExecutable(agentPathUncompressed);
    let resMkdDir = CreateDir(`${agentInstallLocation}/bin`);
    await fse.move(agentPathUncompressed, `${agentInstallLocation}/bin/${path.basename(agentPathUncompressed)}`, {overwrite: true});
    console.log('Download complete');
  } catch (err) {
    console.log('Error downloading SaasGlue agent: ', err);
    process.exit(1);
  }
}

(async () => {
  try {
    const command = process.argv[2]

    if (command == 'download') {
      await Download();
    } else if (command == 'install') {
      await Download();

      if (accessKeyId && accessKeySecret) {
        console.log('Creating sg.cfg');
        const cfgFileName = `${os.homedir()}/.saasglue/sg.cfg`;
        await CreateConfigFile(cfgFileName, accessKeyId, accessKeySecret, tags);
        console.log('Configuration file created');
      }
  
      console.log('Installing SaasGlue agent');
      await InstallAsLaunchdService(agentInstallLocation);
      console.log('SaasGlue agent installed successfully');
    } else if (command == 'uninstall') {
      console.log('Uninstalling SaasGlue agent');
      await RemoveLaunchdService();
      console.log('SaasGlue agent uninstalled successfully');
    } else {
      throw new ApplicationUsageError();
    }

    // console.log('Downloading SaasGlue agent');
    // await DownloadAgent(GunzipFile, agentPathUncompressed, 'linux', '');
    // await fse.move(plistFileName, `${os.homedir()}/Library/LaunchAgents/${plistFileName}`, {overwrite: true});
    // console.log('Download complete');

    // if (!accessKeyId || !accessKeySecret) {
    //   let resUserConfig = await PromptUserForAgentConfig();
    //   accessKeyId = resUserConfig.SG_ACCESS_KEY_ID;
    //   accessKeySecret = resUserConfig.SG_ACCESS_KEY_SECRET;
    //   tags = resUserConfig.tags;

    //   if (!accessKeyId) {
    //     console.log('Unable to install SaasGlue agent: Missing access key id');
    //     process.exit(1);
    //   }


    //   if (!accessKeySecret) {
    //     console.log('Unable to install SaasGlue agent: Missing access key secret');
    //     process.exit(1);
    //   }
    // }
    process.exit(0);
  } catch (err) {
    if (err instanceof ApplicationUsageError) {
      console.log(`
usage: sg_agent <command> [parameters]

  sg_agent download  
  sg_agent install [sg agent access key id] [sg agent access secret key]
  sg_agent uninstall`)
    } else {
      console.log(err);
    }
    process.exit(1);
  }
})();
