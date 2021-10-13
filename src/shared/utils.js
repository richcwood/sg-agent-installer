"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const axios_1 = require("axios");
const child_process_1 = require("child_process");
const readline = require('readline');
const compressing = require("compressing");
const os = require("os");
const path = require("path");
const shell = require('shelljs');


const apiUrl = 'https://console.saasglue.com';
const apiVersion = 'v0';
const apiPort = '';

let token;
let _teamId;

let sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

let CreateDir = (dir) => {
  return shell.mkdir('-p', dir);
}

let ChangeFileExt = async (filePath, ext) => {
  const index = filePath.lastIndexOf(".");
  if (index < 0) {
    if (ext == '')
      return filePath;
    else
      return filePath + "." + ext;
  }
  if (ext == '')
    return filePath.substr(0, index);
  return filePath.substr(0, index) + "." + ext;
};

let GunzipFile = async (filePath) => {
  const uncompressedFilePath = await ChangeFileExt(filePath, "");
  await new Promise((resolve, reject) => {
    compressing.gzip.uncompress(filePath, uncompressedFilePath)
      .then(() => { resolve(); })
      .catch((err) => { reject(err); });
  });
  return uncompressedFilePath;
};

let RestAPILogin = async (accessKeyId, accessKeySecret) => {
  if (!accessKeyId || !accessKeySecret) {
    console.log(`Missing SaasGlue API credentials`);
    process.exit(1);
  }
  let localApiUrl = apiUrl;
  if (apiPort != '')
    localApiUrl += `:${apiPort}`;
  const url = `${localApiUrl}/login/apiLogin`;
  const response = await axios_1.default({
    url,
    method: 'POST',
    responseType: 'text',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      'accessKeyId': accessKeyId,
      'accessKeySecret': accessKeySecret
    }
  });
  token = response.data.config1;
  _teamId = response.data.config3;

  return { _teamId };
};


let RestAPICall = async (url, method, headers = {}, data = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      let localApiUrl = apiUrl;
      if (apiPort != '')
        localApiUrl += `:${apiPort}`;
      localApiUrl += `/api/${apiVersion}/${url}`;

      // console.log('RestAPICall -> url ', localApiUrl, ', method -> ', method, ', headers -> ', JSON.stringify(combinedHeaders, null, 4), ', data -> ', JSON.stringify(data, null, 4), ', token -> ', token);
      // this.logger.LogDebug(`RestAPICall`, { url, method, combinedHeaders, data, token: this.params.token });

      const response = await axios_1.default({
        url: localApiUrl,
        method: method,
        responseType: 'text',
        headers,
        data: data
      });
      resolve({ success: true, data: response.data.data });
    }
    catch (error) {
      let newError = { success: false };
      if (error.config)
        newError = Object.assign(newError, { config: error.config });
      if (error.response) {
        newError = Object.assign(newError, { data: error.response.data, status: error.response.status, headers: error.response.headers });
        // this.logger.LogError(`RestAPICall error:`, '', newError);
      }
      // else {
      //     this.logger.LogError(`RestAPICall error`, '', newError);
      // }
      newError = Object.assign(newError, { Error: error.message });
      resolve(newError);
    }
  });
};


let DownloadNSSM = async (fnUnzipFile, nssmPathUncompressed, accessKeyId, accessKeySecret, agentPlatform) => {
  let nssmS3URL;

  let url = `agentDownload/nssm/${agentPlatform}`;
  let result = await RestAPICall(url, 'GET', accessKeyId, accessKeySecret, {}, null);
  if (result.success) {
    nssmS3URL = result.data;
  } else {
    console.log(`Error downloading nssm: ${JSON.stringify(result)}`);
    process.exit(-1);
  }

  const nssmPathCompressed = nssmPathUncompressed + ".zip";
  const writer = fs.createWriteStream(nssmPathCompressed);
  const response = await axios_1.default({
    url: nssmS3URL,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on('finish', async () => {
      await fnUnzipFile(nssmPathCompressed, nssmPathUncompressed);
      if (fs.existsSync(nssmPathCompressed))
        fs.unlinkSync(nssmPathCompressed);
      resolve();
      return;
    });
    writer.on('error', reject);
  });
};


let DownloadAgent_GetUrl = async (agentPlatform, arch, numTries = 0) => {
  return new Promise(async (resolve, reject) => {
    while (true) {
      try {
        let url = `agentDownload/agentstub/${agentPlatform}`;
        if (arch != '')
          url += `/${arch}`;
        let result = await RestAPICall(url, 'GET', {}, null);
        if (result.success) {
          resolve(result.data);
        } else {
          console.log(`Error downloading SaasGlue agent: ${JSON.stringify(result)}`);
          process.exit(-1);
        }
        // this.logger.LogDebug(`Agent download url`, { url, agentDownloadUrl });
        // resolve(agentDownloadUrl);
        break;
      }
      catch (err) {
        if (err && err.status) {
          if (err.status == 303) {
            if (++numTries > waitForAgentCreateMaxRetries) {
              reject(`Exceeded max tries to get agent download url: ${err}`);
              break;
            }
            else {
              await sleep(waitForAgentCreateInterval);
            }
          }
          else {
            reject(err);
            break;
          }
        }
        else {
          reject(err);
          break;
        }
      }
    }
  });
};


let DownloadAgent = async (fnUnzipFile, agentPathUncompressed, agentPlatform, arch) => {
  const agentS3URL = await DownloadAgent_GetUrl(agentPlatform, arch);
  const agentPathCompressed = agentPathUncompressed + ".gz";
  const writer = fs.createWriteStream(agentPathCompressed);
  const response = await axios_1.default({
    url: agentS3URL,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on('finish', async () => {
      await fnUnzipFile(agentPathCompressed, agentPathUncompressed);
      if (fs.existsSync(agentPathCompressed))
        fs.unlinkSync(agentPathCompressed);
      resolve();
      return;
    });
    writer.on('error', reject);
  });

  return { _teamId };
};


// let RunCommand = async (commandString, args) => {
//   return new Promise((resolve, reject) => {
//     try {
//       // this.logger.LogDebug('AgentLauncher running command', { commandString, args });
//       let cmd = child_process_1.exec(commandString, args, (err, stdout, stderr) => {
//         resolve({ err, stdout, stderr});
//       });

//       // cmd.on('error', (err) => {
//       //   reject(`Error running command "${commandString}": ${e.toString()}`);
//       // });

//       // cmd.on('exit', (code) => {
//       //   resolve({ 'code': code });
//       // });
//     }
//     catch (e) {
//       reject(`Error running command "${commandString}": ${e.toString()}`);
//     }
//   });
// };


let RunCommand = async (commandString, args) => {
  return new Promise((resolve, reject) => {
    try {
      // this.logger.LogDebug('AgentLauncher running command', { commandString, args });
      let cmd = child_process_1.spawn(commandString, args, { stdio: 'inherit', shell: true });

      cmd.on('error', (err) => {
        reject(`Error running command "${commandString}": ${e.toString()}`);
      });

      cmd.on('exit', (code) => {
        resolve({ 'code': code });
      });
    }
    catch (e) {
      reject(`Error running command "${commandString}": ${e.toString()}`);
    }
  });
};


let CreateConfigFile = async (cfgFileName, accessKeyId, accessKeySecret, tags) => {
  return new Promise((resolve, reject) => {
    CreateDir(path.dirname(cfgFileName));
    let cfg = {};
    cfg['SG_ACCESS_KEY_ID'] = accessKeyId;
    cfg['SG_ACCESS_KEY_SECRET'] = accessKeySecret;
    cfg['tags'] = {};
    if (tags) {
      let tagsArray = tags.split(',');
      for (let i = 0; i < tagsArray.length; i++) {
        let tagKVP = tagsArray[i].split('=');
        if (tagKVP.length != 2) {
          reject('Invalid tags - tags should be formatted like "tag_name_1=tag_value_1,tag_name_2=tag_value_2"');
        }
        cfg['tags'][tagKVP[0]] = tagKVP[1];
      }
    }
    fs.writeFileSync(cfgFileName, JSON.stringify(cfg, null, 4));
    resolve();
  });
};


let GetAgentConfig = async () => {
  let cfg = {};
  cfg['tags'] = {};

  if (fs.existsSync(cfgFileName)) {
    cfg = JSON.parse(fs.readFileSync(cfgFileName).toString());
  }

  return cfg;
};


let PromptUserForAgentConfig = async () => {
  return new Promise(async (resolve, reject) => {

    let cfg = await GetAgentConfig();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`Access key id${cfg['SG_ACCESS_KEY_ID'] ? ' (*****' + cfg['SG_ACCESS_KEY_ID'].substr(cfg['SG_ACCESS_KEY_ID'].length - 4) + ')' : ''}: `, (accessKeyId) => {
      if (accessKeyId == '')
        accessKeyId = cfg['SG_ACCESS_KEY_ID'];
      rl.question(`Access key secret${cfg['SG_ACCESS_KEY_SECRET'] ? ' (*****' + cfg['SG_ACCESS_KEY_SECRET'].substr(cfg['SG_ACCESS_KEY_SECRET'].length - 4) + ')' : ''}: `, (accessKeySecret) => {
        if (accessKeySecret == '')
          accessKeySecret = cfg['SG_ACCESS_KEY_SECRET'];
        let tagsAsString = '';
        if (cfg['tags'] && Object.keys(cfg['tags']).length > 0) {
          tagsAsString = Object.keys(cfg['tags']).map((k) => { return `${k}=${cfg['tags'][k]}` }).join(",");
        }
        rl.question(`Tags${tagsAsString ? '(' + tagsAsString + ')' : ''}: `, (tags) => {
          if (tags)
            tagsAsString = tags;

          resolve({ SG_ACCESS_KEY_ID: accessKeyId, SG_ACCESS_KEY_SECRET: accessKeySecret, tags: tagsAsString });
        });
      });
    });
  });
};


let MakeFileExecutable = async (filePath) => {
  await new Promise(async (resolve, reject) => {
      fs.chmod(filePath, 0o0755, ((err) => {
          if (err) {
              reject(err);
              return;
          }
          resolve();
          return;
      }));
  });
};


module.exports.sleep = sleep;
module.exports.ChangeFileExt = ChangeFileExt;
module.exports.RestAPILogin = RestAPILogin;
module.exports.DownloadAgent = DownloadAgent;
module.exports.RunCommand = RunCommand;
module.exports.CreateConfigFile = CreateConfigFile;
module.exports.GetAgentConfig = GetAgentConfig;
module.exports.PromptUserForAgentConfig = PromptUserForAgentConfig;
module.exports.DownloadAgent_GetUrl = DownloadAgent_GetUrl;
module.exports.GunzipFile = GunzipFile;
module.exports.CreateDir = CreateDir;
module.exports.DownloadNSSM = DownloadNSSM;
module.exports.MakeFileExecutable = MakeFileExecutable;