require('dotenv').config();
const fs = require('fs');
const path = require('path');

const configPath = process.env.CONFIG_PATH
  ? path.resolve(__dirname, `config.${process.env.CONFIG_PATH}.js`)
  : '';
const config = fs.existsSync(configPath) ? require(configPath) : {};

module.exports = config;