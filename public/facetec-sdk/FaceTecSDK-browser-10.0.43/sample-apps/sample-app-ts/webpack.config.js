const path = require("path");

const libraryName = "SampleAppController";
let compiledCount = 1;

module.exports = function() {
  var buildOptions = {
    target: "web",
    entry: "./src/SampleAppController.ts",
    mode: "development",
    devtool: "source-map",
    watch: true,
    stats: "errors-only",
    performance: {
      maxEntrypointSize: 300000,
      maxAssetSize: 300000
    },
    watchOptions: {
      ignored: ["**.d.ts", "**/node_modules"],
      aggregateTimeout: 100,
      poll: 1000
    },
    output: {
      library: libraryName,
      libraryExport: libraryName,
      libraryTarget: "this",
      filename: libraryName + ".js",
      path: path.resolve(__dirname, "build"),
      sourceMapFilename: "[file].map",
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.ts?$/,
          loader: "ts-loader",
          exclude: /node_modules/
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ["source-map-loader"],
          enforce: "pre"
        },
        {
          test: /\.(mp3|png|jp(e*)g|svg)$/,
          loader: "url-loader"
        }
      ]
    },
    resolve: {
      extensions: [".ts", ".js"]
    },
    plugins: [
      {
        apply: (compiler) => {
          compiler.hooks.done.tapAsync("done", function(stats, callback) {
            if(!stats.compilation.errors || stats.compilation.errors.length === 0) {
              // Clear the console on successful emit
              console.log("\u001b[2J\u001b[0;0H");
              console.log(`Build: ${compiledCount} ${buildOptions.output.filename} Completed.`);
              compiledCount += 1;
            }

            callback();
          });
        }
      }
    ]
  };
  console.log("Creating FaceTec Sample:" + libraryName + " development build ....");

  if(process.argv.indexOf("nowatch") > -1) {
    buildOptions.watch = false;
  }

  return buildOptions;
};
