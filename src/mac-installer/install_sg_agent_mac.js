"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const { DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable, DeleteFolderRecursive, DeleteFile } = require('../shared/utils')
const { InstallAsLaunchdService, UninstallLaunchdService, StopLaunchdService, StartLaunchdService } = require('../shared/mac-utils');
const { ApplicationUsageError } = require('../shared/errors');
const fs = require("fs");
const fse = require("fs-extra");
const os = require('os');
const { program, Option } = require('commander');
program.version('0.0.1');


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
    program
    .addOption(new Option('-c, --command <command>', 'command to run').default('install', 'install the agent as a service').choices(['install', 'download', 'uninstall', 'start', 'stop']))
    .option('-i, --id <id>', 'agent access key id')
    .option('-s, --secret <secret>', 'agent access key secret')
    .option('-t, --tags <tags>', 'agent tags')
    .option('-p, --path <path>', 'the path to use for the agent runtime environment')
    .parse();
  
    const options = program.opts();
    let command = options.command;

    if (command == 'download')
      configFilePath = './sg.cfg';

    if (command == 'install' || command == 'download') {
      let accessKeyId = options.id;
      let accessKeySecret = options.secret;
      let tags = options.tags;

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
        let envPath = options.path;
        if (envPath == null)
          envPath = process.env.PATH;

        console.log('Installing SaaSGlue agent');
        await InstallAsLaunchdService(agentInstallLocation, envPath);
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
      program.outputHelp();
    } else {
      console.log(err);
    }
    process.exit(1);
  }
})();
