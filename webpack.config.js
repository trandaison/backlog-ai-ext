const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    content: './src/content/content.ts',
    background: './src/background/background.ts',
    popup: './src/popup/popup.tsx',
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
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/popup/popup.html',
          to: 'popup.html'
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
