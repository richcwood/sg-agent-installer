"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const { DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable } = require('../shared/utils')
const { InstallAsLaunchdService, StopLaunchdService, StartLaunchdService } = require('../shared/mac-utils');
const { ApplicationUsageError } = require('../shared/errors');
const fs = require("fs");
const fse = require("fs-extra");
const os = require('os');


let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

const agentPathUncompressed = `${rootPath}sg-agent-launcher`;
const agentInstallLocation = '/usr/local/lib/saasglue';
const configFileName = `${os.homedir()}/.saasglue/sg.cfg`;


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

      await Download();

      if (command == 'install') {
        console.log('Installing SaaSGlue agent');
        await InstallAsLaunchdService(agentInstallLocation);
        console.log('SaaSGlue agent installed successfully');
      } else {
        console.log('To start the SaaSGlue Agent run sg-agent-launcher');
      }
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
      `)
    } else {
      console.log(err);
    }
    process.exit(1);
  }
})();
