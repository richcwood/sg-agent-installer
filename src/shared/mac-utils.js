"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const fse = require('fs-extra');
const os = require('os');
const shell = require('shelljs');
const { RunCommand } = require('./utils');


const plistFileName = 'com.saasglue.agent.plist'
const plistFilePath = `${os.homedir()}/Library/LaunchAgents/${plistFileName}`;


let CreatePlistFile = async (execPath) => {
    const strPlistFile = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>Label</key>
        <string>com.saasglue.agent</string>
    
        <key>StandardErrorPath</key>
        <string>${execPath}/log/stderr.log</string>
    
        <key>StandardOutPath</key>
        <string>${execPath}/log/stdout.log</string>
    
        <key>WorkingDirectory</key>
        <string>${execPath}/bin/</string>
    
        <key>Program</key>
        <string>${execPath}/bin/sg-agent-launcher</string>
    
        <key>KeepAlive</key>
        <true/>
    </dict>
    </plist>`

    fs.writeFileSync(plistFileName, strPlistFile);

    await fse.move(plistFileName, plistFilePath, { overwrite: true });
}


let InstallAsLaunchdService = async (execPath) => {
    await CreatePlistFile(execPath);

    let resInstall = await RunCommand('launchctl', ['load', plistFilePath]);
    if (resInstall.err && resInstall.err.code != 0) {
        throw resInstall.err;
    }
};


let RemoveLaunchdService = async () => {
    let resInstall = await RunCommand('launchctl', ['unload', plistFilePath]);
    if (resInstall.code != 0) {
        process.exit(resInstall.code);
    }
};


module.exports.InstallAsLaunchdService = InstallAsLaunchdService;
module.exports.RemoveLaunchdService = RemoveLaunchdService;
