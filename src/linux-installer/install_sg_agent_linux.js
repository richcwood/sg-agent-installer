"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const {DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable} = require('../shared/utils')
const {InstallAsSystemdService, RemoveSystemdService} = require('../shared/linux-utils');
const {ApplicationUsageError} = require('../shared/errors');
const fs = require("fs");
const fse = require("fs-extra");


const command = process.argv[2]
const accessKeyId = process.argv[3];
const accessKeySecret = process.argv[4];
const tags = process.argv[5];

let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

const agentName = 'sg-agent-launcher';
const agentPathUncompressed = `${rootPath}${agentName}`;
const agentInstallLocation = '/usr/bin/saasglue/';
const agentInstallPath = `${agentInstallLocation}/${agentName}`

let Download = async () => {
  try {
    console.log('Downloading SaasGlue agent');
    await DownloadAgent(GunzipFile, agentPathUncompressed, 'linux', '');
    await MakeFileExecutable(agentPathUncompressed);
    let resMkdDir = CreateDir(agentInstallLocation);
    await fse.move(agentPathUncompressed, `${agentInstallLocation}/${agentName}`, {overwrite: true});
    console.log('Download complete');
  } catch (err) {
    console.log('Error downloading SaasGlue agent: ', err);
    process.exit(1);
  }
}

(async () => {
  try {
    if (command == 'download') {
      await Download();
    } else if (command == 'install') {
      await Download();

      if (accessKeyId && accessKeySecret) {
        console.log('Creating sg.cfg');
        const cfgFileName = `/etc/saasglue/sg.cfg`;
        await CreateConfigFile(cfgFileName, accessKeyId, accessKeySecret, tags);
        console.log('Configuration file created');
      }
  
      console.log('Installing SaasGlue agent');
      await InstallAsSystemdService(agentInstallPath);
      console.log('SaasGlue agent installed successfully');
    } else if (command == 'uninstall') {
      console.log('Uninstalling SaasGlue agent');
      await RemoveSystemdService();
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
