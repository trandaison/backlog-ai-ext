const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 1000
  },
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
    path: path.resolve(__dirname, 'dev-build'),
    filename: '[name].js',
    clean: true
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
        exclude: /options\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      },
      {
        test: /options\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/options/options.html',
          to: 'options.html',
          noErrorOnMissing: true
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
    minimize: false
  },
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }
};
