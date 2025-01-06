const webpack = require("webpack");
const { config } = require("dotenv");

config(); // Load .env

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
  ],
};
