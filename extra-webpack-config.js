const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

module.exports = (config, options) => {
  // Membaca file .env
  const env = dotenv.parse(fs.readFileSync('.env'));

  // Inject variabel ke process.env menggunakan Webpack DefinePlugin
  const envKeys = Object.keys(env).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(env[next]);
    return prev;
  }, {});

  config.plugins = [
    ...(config.plugins || []),
    new webpack.DefinePlugin(envKeys),
  ];

  return config;
};
