const path = require("path");
const webpack = require("webpack");

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === "development";

  return {
    mode: argv.mode,
    entry: "./src/index.js",
    output: {
      path: path.resolve(__dirname, "public"),
      filename: "bundle.js",
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-react"],
            },
          },
        },
      ],
    },
    resolve: {
      extensions: [".js", ".jsx"],
    },
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      compress: true,
      port: 9000,
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.REACT_APP_API_URL": JSON.stringify(
          isDevelopment ? "http://localhost:3000" : ""
        ),
      }),
    ],
  };
};
