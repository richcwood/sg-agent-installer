"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unzipper = require('unzipper');
const fs = require('fs');
const { RunCommand, RestAPILogin } = require('./utils');

let UnzipFile = async (filePath, uncompressedFilePath) => {
    await new Promise(async (resolve, reject) => {
        const zip = await unzipper.Open.file(filePath);
        zip.files[0]
            .stream()
            .pipe(fs.createWriteStream(uncompressedFilePath))
            .on('error', reject)
            .on('finish', resolve)
    });
    return uncompressedFilePath;
};


let GetServiceName = async (configFilePath) => {
    let cfgAsString = fs.readFileSync(configFilePath);
    let cfg = JSON.parse(cfgAsString);
    let resLogin = await RestAPILogin(cfg['SG_ACCESS_KEY_ID'], cfg['SG_ACCESS_KEY_SECRET']);
    let serviceName = `SGAgent-${resLogin._teamId}`;

    return serviceName;
};


let InstallAsWindowsService = async (serviceName, binPath, nssmPathUncompressed) => {
    let resInstall = await RunCommand("\"" + nssmPathUncompressed + "\"", ['install', serviceName, binPath]);
    if (resInstall.code != 0) {
        process.exit(resInstall.code);
    }
    await StartWindowsService(serviceName, nssmPathUncompressed);
};


let StartWindowsService = async (serviceName, nssmPathUncompressed) => {
    let resStartService = await RunCommand("\"" + nssmPathUncompressed + "\"", ['start', serviceName]);
    if (resStartService.code != 0) {
        console.log('An error occurred: ', resStartService);
        await RunCommand('pause', []);        
        process.exit(resStartService.code);
    }
};


let RemoveWindowsService = async (serviceName, nssmPathUncompressed) => {
    await StopWindowsService(serviceName, nssmPathUncompressed);
    let resInstall = await RunCommand("\"" + nssmPathUncompressed + "\"", ['remove', serviceName, 'confirm']);
    if (resInstall.code != 0) {
        process.exit(resInstall.code);
    }
};


let StopWindowsService = async (serviceName, nssmPathUncompressed) => {
    let resStartService = await RunCommand("\"" + nssmPathUncompressed + "\"", ['stop', serviceName]);
    if (resStartService.code != 0) {
        process.exit(resStartService.code);
    }
};


module.exports.UnzipFile = UnzipFile;
module.exports.GetServiceName = GetServiceName;
module.exports.InstallAsWindowsService = InstallAsWindowsService;
module.exports.StartWindowsService = StartWindowsService;
module.exports.RemoveWindowsService = RemoveWindowsService;
module.exports.StopWindowsService = StopWindowsService;
