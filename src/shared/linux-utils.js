"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require('fs');
const fse = require('fs-extra');
const os = require('os');
const shell = require('shelljs');
const { RunCommand } = require('./utils');

    
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

    await fse.move(serviceFileName, serviceFilePath, {overwrite: true});
}


let InstallAsSystemdService = async (execPath, currentUser) => {
    await CreateServiceFile(execPath, currentUser);

    let resInstall = await RunCommand('systemctl', ['start', serviceFileName]);
    if (resInstall.err && resInstall.err.code != 0) {
        throw resInstall.err;
    }
};


let RemoveSystemdService = async () => {
    let resInstall = await RunCommand('systemctl', ['stop', serviceFileName]);
    if (resInstall.code != 0) {
        process.exit(resInstall.code);
    }
};


module.exports.InstallAsSystemdService = InstallAsSystemdService;
module.exports.RemoveSystemdService = RemoveSystemdService;