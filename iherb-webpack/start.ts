const webpack = require("webpack")
const config = require('./webpack.config')
const fs = require("fs")
const path = require("path")

fs.rmdirSync(path.join(__dirname, "dist"), { recursive: true });

const compiler = webpack(config)

compiler.run((err, stats) => {
  if (err) console.log(err);

  const jsonStats = stats.toJson();

  if (jsonStats.errors.length > 0) {
    const error = new Error(jsonStats.errors[0]);

    // error.errors = jsonStats.errors;
    // error.warnings = jsonStats.warnings;
    console.log(error);
  }

  console.log("done");
});