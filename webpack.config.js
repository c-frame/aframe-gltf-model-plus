const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    libraryTarget: "umd",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
    filename:
      process.env.NODE_ENV === "production"
        ? "gltf-model-plus.min.js"
        : "gltf-model-plus.js",
  },
  externals: {
    // Stubs out `import ... from 'three'` so it returns `import ... from window.THREE` effectively using THREE global variable that is defined by AFRAME.
    three: "THREE",
  },
  devtool: "source-map",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devServer: {
    port: process.env.PORT || 8080,
    hot: false,
    liveReload: true,
    server: {
      type: "https",
    },
    static: ["."],
  },
  performance: {
    assetFilter: function (assetFilename) {
      // Exclude specific assets from the performance checks
      return !assetFilename.endsWith(".cube") && !assetFilename.endsWith(".map");
    },
  },
  module: {
    rules: [
      {
        test: /\.(jpg|png|cube)$/,
        type: "asset/resource",
        generator: {
          filename: "assets/[hash][ext]",
        },
      },
    ],
  },
};
