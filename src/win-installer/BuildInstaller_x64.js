const pkg_1 = require("pkg");

const build = process.argv[2];

pkg_1.exec([`install_sg_agent_win.js`, '--config', `package-x64.json`, '--targets', 'node10-win-x64', '--out-path', `./build/${build}`]);
