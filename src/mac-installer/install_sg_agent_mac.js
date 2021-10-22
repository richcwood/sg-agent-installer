"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const { DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable, DeleteFolderRecursive, DeleteFile } = require('../shared/utils')
const { InstallAsLaunchdService, UninstallLaunchdService, StopLaunchdService, StartLaunchdService } = require('../shared/mac-utils');
const { ApplicationUsageError } = require('../shared/errors');
const fs = require("fs");
const fse = require("fs-extra");
const os = require('os');


let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

const agentPathUncompressed = `${rootPath}sg-agent-launcher`;
const agentInstallLocation = '/usr/local/lib/saasglue';
let configFilePath = `${os.homedir()}/.saasglue/sg.cfg`;


let Download = async () => {
  try {
    console.log('Downloading SaaSGlue agent');
    await DownloadAgent(GunzipFile, agentPathUncompressed, 'macos', '');
    await MakeFileExecutable(agentPathUncompressed);
    let resMkdDir = CreateDir(`${agentInstallLocation}/bin`);
    await fse.move(agentPathUncompressed, `${agentInstallLocation}/bin/${path.basename(agentPathUncompressed)}`, { overwrite: true });
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

      await Download();

      if (command == 'install') {
        console.log('Installing SaaSGlue agent');
        await InstallAsLaunchdService(agentInstallLocation);
        console.log('SaaSGlue agent installed successfully');
      } else {
        console.log('To start the SaaSGlue Agent run sg-agent-launcher');
      }
    } else if (command == 'uninstall') {
      console.log('Uninstalling SaaSGlue agent');
      await UninstallLaunchdService();
      DeleteFolderRecursive(agentInstallLocation);
      await DeleteFile(configFilePath);
      console.log('SaaSGlue agent uninstalled successfully');
    } else if (command == 'start') {
      console.log('Starting SaaSGlue agent');
      await StartLaunchdService();
      console.log('SaaSGlue agent started successfully');
    } else if (command == 'stop') {
      console.log('Stopping SaaSGlue agent');
      await StopLaunchdService();
      console.log('SaaSGlue agent stopped successfully');
    } else {
      throw new ApplicationUsageError();
    }
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
