const pkg_1 = require("pkg");

const build = process.argv[2];

pkg_1.exec([`install_sg_agent_linux.js`, '--config', `package.json`, '--targets', 'node10-linux', '--out-path', `./build/${build}`]);
