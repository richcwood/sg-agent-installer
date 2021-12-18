"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const { DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable, ChangeDirOwnerRecursive, DeleteFile, DeleteFolderRecursive } = require('../shared/utils')
const { InstallAsSystemdService, StartSystemdService, StopSystemdService, UninstallSystemdService } = require('../shared/linux-utils');
const { ApplicationUsageError } = require('../shared/errors');
const fs = require("fs");
const fse = require("fs-extra");


let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

const agentName = 'sg-agent-launcher';
const agentPathUncompressed = `${rootPath}${agentName}`;
const agentInstallLocation = '/usr/bin/saasglue/';
const agentInstallPath = `${agentInstallLocation}${agentName}`
let configFilePath = '/etc/saasglue/sg.cfg';
const currentUser = process.env.SUDO_USER;


let Download = async (moveToAgentInstallLocation) => {
  try {
    console.log('Downloading SaaSGlue agent');
    await DownloadAgent(GunzipFile, agentPathUncompressed, 'linux', '');
    await MakeFileExecutable(agentPathUncompressed);
    if (moveToAgentInstallLocation) {
      let resMkdDir = CreateDir(agentInstallLocation);
      await fse.move(agentPathUncompressed, `${agentInstallLocation}/${agentName}`, { overwrite: true });
      await ChangeDirOwnerRecursive(agentInstallLocation, currentUser)
    }
    console.log('Download complete');
  } catch (err) {
    console.log('Error downloading SaaSGlue agent: ', err);
    process.exit(1);
  }
}

(async () => {
  try {
    let command = process.argv[2]
    if (!command)
      command = 'install';

    if (command == 'download')
      configFilePath = './sg.cfg';

    if (command == 'install' || command == 'download') {
      let accessKeyId = process.argv[3];
      let accessKeySecret = process.argv[4];
      let tags = process.argv[5];

      if (!accessKeyId || !accessKeySecret) {
        let resUserConfig = await PromptUserForAgentConfig(configFilePath);
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

      console.log('Creating ', configFilePath);
      await CreateConfigFile(configFilePath, accessKeyId, accessKeySecret, tags);
      console.log('Configuration file created');

      await Download(command == 'install');

      if (command == 'install') {
        console.log('Installing SaaSGlue agent');
        await InstallAsSystemdService(agentInstallPath, currentUser);
        console.log('SaaSGlue agent installed successfully');
      } else {
        console.log('To start the SaaSGlue Agent run sg-agent-launcher');
      }
    } else if (command == 'uninstall') {
      console.log('Uninstalling SaaSGlue agent');
      await UninstallSystemdService();
      DeleteFolderRecursive(agentInstallLocation);
      await DeleteFile(configFilePath)
      console.log('SaaSGlue agent uninstalled successfully');
    } else if (command == 'start') {
      console.log('Starting SaaSGlue agent');
      await StartSystemdService();
      console.log('SaaSGlue agent started successfully');
    } else if (command == 'stop') {
      console.log('Stopping SaaSGlue agent');
      await StopSystemdService();
      console.log('SaaSGlue agent stopped successfully');
    } else {
      throw new ApplicationUsageError();
    }

    // console.log('Downloading SaaSGlue agent');
    // await DownloadAgent(GunzipFile, agentPathUncompressed, 'linux', '');
    // await fse.move(plistFileName, `${os.homedir()}/Library/LaunchAgents/${plistFileName}`, {overwrite: true});
    // console.log('Download complete');

    // if (!accessKeyId || !accessKeySecret) {
    //   let resUserConfig = await PromptUserForAgentConfig();
    //   accessKeyId = resUserConfig.SG_ACCESS_KEY_ID;
    //   accessKeySecret = resUserConfig.SG_ACCESS_KEY_SECRET;
    //   tags = resUserConfig.tags;

    //   if (!accessKeyId) {
    //     console.log('Unable to install SaaSGlue agent: Missing access key id');
    //     process.exit(1);
    //   }


    //   if (!accessKeySecret) {
    //     console.log('Unable to install SaaSGlue agent: Missing access key secret');
    //     process.exit(1);
    //   }
    // }
    process.exit(0);
  } catch (err) {
    if (err instanceof ApplicationUsageError) {
      console.log(`
usage: ./sg-agent-installer-linux <command> [parameters]

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
