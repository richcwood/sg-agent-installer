"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const fse = require('fs-extra');
const os = require('os');
const shell = require('shelljs');
const { RunCommand, CreateDir, ChangeDirOwnerRecursive } = require('./utils');


const plistFileName = 'com.saasglue.agent.plist'
const plistFilePath = `/Library/LaunchDaemons/${plistFileName}`;


let CreatePlistFile = async (execPath, envPath, userName) => {
    const logsPath = `${execPath}/launchd`;
    CreateDir(logsPath);
    const strPlistFile = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>Label</key>
        <string>com.saasglue.agent</string>
    
        <key>StandardErrorPath</key>
        <string>${logsPath}/stderr.log</string>
    
        <key>StandardOutPath</key>
        <string>${logsPath}/stdout.log</string>
    
        <key>WorkingDirectory</key>
        <string>${execPath}/</string>

        <key>EnvironmentVariables</key>
        <dict>
          <key>PATH</key>
          <string>${envPath}</string>
        </dict>

        <key>Program</key>
        <string>${execPath}/sg-agent-launcher</string>

        <key>UserName</key>
        <string>${userName}</string>
    
        <key>KeepAlive</key>
        <true/>

        <key>RunAtLoad</key>
        <true/>        
    </dict>
    </plist>`

    fs.writeFileSync(plistFileName, strPlistFile);

    await fse.move(plistFileName, plistFilePath, { overwrite: true });
}


let InstallAsLaunchdService = async (execPath, envPath) => {
    const currentUser = process.env.SUDO_USER;

    await CreatePlistFile(execPath, envPath, currentUser);

    await ChangeDirOwnerRecursive(execPath, currentUser)

    await StartLaunchdService(execPath);
};


let UninstallLaunchdService = async () => {
    try {
        let res = await RunCommand('launchctl', ['remove', 'com.saasglue.agent']);
    } catch (Exception) {}
    // if (res.err && res.err.code != 0) {
    //     throw res.err;
    // }
};


let StartLaunchdService = async (execPath) => {
    let res = await RunCommand('launchctl', ['load', plistFilePath]);
    if (res.err && res.err.code != 0) {
        throw res.err;
    }
};


let StopLaunchdService = async () => {
    let res = await RunCommand('launchctl', ['unload', plistFilePath]);
    if (res.err && res.err.code != 0) {
        process.exit(res.err);
    }
};


module.exports.InstallAsLaunchdService = InstallAsLaunchdService;
module.exports.StartLaunchdService = StartLaunchdService;
module.exports.StopLaunchdService = StopLaunchdService;
module.exports.UninstallLaunchdService = UninstallLaunchdService;
