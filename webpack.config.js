const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { execSync } = require('child_process');

// Get version from manifest.json
const manifest = require('./manifest.json');

// Get commit ID (short form)
let commitId;
try {
  commitId = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  commitId = 'unknown';
}

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    content: './src/content/content.ts',
    background: './src/background/background.ts',
    options: './src/options/options.tsx',
    chatbot: './src/chatbot/chatbot.tsx',
    'chatbot-aside-panel': './src/content/ChatbotAsidePanelEntry.tsx',
    // SCSS entries
    'content-styles': './src/content/content.scss',
    'sidebar-styles': './src/content/sidebar.scss',
    'chatbot-styles': './src/chatbot/chatbot.scss'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    publicPath: '/'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(manifest.version),
      __COMMIT_ID__: JSON.stringify(commitId),
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [

        {
          from: 'src/options/options.html',
          to: 'options.html'
        },
        {
          from: 'src/assets/icons',
          to: 'icons',
          noErrorOnMissing: true
        },
        {
          from: 'manifest.json',
          to: 'manifest.json'
        }
      ]
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  }
};
