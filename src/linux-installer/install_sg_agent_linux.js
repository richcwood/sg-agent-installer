"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const { DownloadAgent, GunzipFile, CreateConfigFile, CreateDir, PromptUserForAgentConfig, MakeFileExecutable, ChangeDirOwnerRecursive, DeleteFile, DeleteFolderRecursive } = require('../shared/utils')
const { InstallAsSystemdService, StartSystemdService, StopSystemdService, UninstallSystemdService } = require('../shared/linux-utils');
const { ApplicationUsageError } = require('../shared/errors');
const fse = require("fs-extra");
const os = require('os');
const { program, Option } = require('commander');
program.version('0.0.1');


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
      await ChangeDirOwnerRecursive(agentInstallLocation, currentUser, currentUser)
    }
    console.log('Download complete');
  } catch (err) {
    console.log('Error downloading SaaSGlue agent: ', err);
    process.exit(1);
  }
}

(async () => {
  try {
    const userName = os.userInfo().username;
    if (userName != 'root') {
      let args = [];
      for (let i = 2; i < process.argv.length; ++i)
        args[i-2] = process.argv[i];
      console.log(`Installer must be run as sudo, e.g.:\n\nsudo ./sg-agent-installer-linux ${args.join(' ')}\n`);
      process.exit(1);  
    }

    program
    .addOption(new Option('-c, --command <command>', 'command to run').default('install', 'install the agent as a service').choices(['install', 'download', 'uninstall', 'start', 'stop']))
    .option('-i, --id <id>', 'agent access key id')
    .option('-s, --secret <secret>', 'agent access key secret')
    .option('-t, --tags <tags>', 'agent tags')
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
