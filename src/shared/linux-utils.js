"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require('fs');
const fse = require('fs-extra');
const os = require('os');
const shell = require('shelljs');
const { RunCommand, DeleteFile } = require('./utils');


const serviceFileName = 'sg_agent_launcher.service'
const serviceFileDirectory = `/etc/systemd/system`;
const serviceFilePath = `${serviceFileDirectory}/${serviceFileName}`;


let CreateServiceFile = async (execPath, currentUser) => {
    const strServiceFile = `[Unit]
Description=sg agent launcher 
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${path.dirname(execPath)}
ExecStart=${execPath}
Restart=always
RestartSec=3
Environment=NODE_ENV=production
User=${currentUser}

[Install]
WantedBy=multi-user.target`

    fs.writeFileSync(serviceFileName, strServiceFile);

    await fse.move(serviceFileName, serviceFilePath, { overwrite: true });
}


let InstallAsSystemdService = async (execPath, currentUser) => {
    await CreateServiceFile(execPath, currentUser);

    await StartSystemdService();
};


let UninstallSystemdService = async () => {
    await StopSystemdService();
    await DisableSystemdService();
    await DeleteFile(serviceFilePath);
    await ReloadSystemdService();
    await ResetFailedSystemdService();
};


let StartSystemdService = async () => {
    let res = await RunCommand('systemctl', ['start', serviceFileName]);
    if (res.err && res.err.code != 0) {
        throw res.err;
    }
};


let StopSystemdService = async () => {
    try {
        let res = await RunCommand('systemctl', ['stop', serviceFileName]);
    } catch (Exception) {};
};


let DisableSystemdService = async () => {
    try {
        let res = await RunCommand('systemctl', ['disable', serviceFileName]);
    } catch (Exception) {};
};


let ReloadSystemdService = async () => {
    try {
        let res = await RunCommand('systemctl', ['daemon-reload']);
    } catch (Exception) { };
};


let ResetFailedSystemdService = async () => {
    try {
        let res = await RunCommand('systemctl', ['reset-failed']);
    } catch (Exception) { };
};


module.exports.InstallAsSystemdService = InstallAsSystemdService;
module.exports.StartSystemdService = StartSystemdService;
module.exports.StopSystemdService = StopSystemdService;
module.exports.UninstallSystemdService = UninstallSystemdService;
