const pkg_1 = require("pkg");

const build = process.argv[2];

const pkg_path = './src/win-installer'

pkg_1.exec([`${pkg_path}/install_sg_agent_win.js`, '--config', `${pkg_path}/package.json`, '--targets', 'node10-win-x64', '--out-path', `./${pkg_path}/build/${build}`]);
