const path = require("path");
const NextJsSsrImportPlugin = require(path.join(__dirname, './import-plugin.js')).default

const babelOptions = {
  babelrc: false,
  cacheDirectory: true,
  presets: [
    [
        require.resolve('@babel/preset-env'), 
        {
          targets: {
            node: "current"
          },
          // include: ["transform-arrow-functions", "es6.map"],
          // exclude: ["transform-regenerator", "es6.set"],
          modules: false
        }
    ],
    require.resolve('@babel/preset-react')
  ],
  plugins: [
    require.resolve('@babel/plugin-syntax-dynamic-import'),
    require.resolve('babel-plugin-macros'),
    require.resolve(path.join(__dirname, './dynamic-import-plugin.js')),
  ].filter(Boolean)
}

module.exports = {
  entry: path.resolve(__dirname, 'index.tsx'),
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: 'commonjs2'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loaders: [
          {
            loader: require.resolve("babel-loader"),
            options: babelOptions,
          },
        ],
      },
      {
        test: /\.(ts|tsx)$/,
        loaders: [
            {
                loader: require.resolve("babel-loader"),
                options: babelOptions
            },
            {
                loader: require.resolve("ts-loader"),
                options: {
                    transpileOnly: true,
                    happyPackMode: true
                }
            }
        ]
    },
    ],
  },
  plugins: [
    new NextJsSsrImportPlugin(),
  ],
  resolve: {
    extensions: [".js", ".jsx", ".tsx", ".ts"]
  },
  optimization: {
    minimizer: []
  },
  externals: [],
  target: 'node',
  // mode: 'development',
  cache: true,
};
