const Dotenv = require('dotenv-webpack');  // Requires the dotenv-webpack plugin to manage environment variables.

module.exports = {
  entry: {  // Entry points for the application, specifying which files Webpack should use to begin building out its internal dependency graph.
    content: './content.ts',
    popup: './popup.ts',
    "options-react": './options-react.tsx',
    background: './background.ts',
  },
  mode: 'development',  // Sets the mode to development to enable debugging features.
  output: {  // Output directive for Webpack on how and where it should output your bundles, assets, and anything else you bundle or load with Webpack.
    filename: '[name].bundle.js',
  },
  devtool: 'cheap-module-source-map',  // This option controls if and how source maps are generated.
  module: {  // How different types of modules within a project will be treated.
    rules: [
      {
        test: /\.tsx?$/,  // Identifies files that should be transformed by the ts-loader.
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,  // Identifies files that should be transformed by style-loader and css-loader.
        sideEffects: true,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {  // Configures how modules are resolved. For example, when calling require('lodash').
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "path": require.resolve("path-browserify"),
      "url": require.resolve("url/"),
      "crypto": require.resolve("crypto-browserify"),
      "timers": require.resolve("timers-browserify")
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [  // Add additional plugins to the compiler.
    new Dotenv(),  // Loads environment variables from a .env file into process.env.
  ],
};
