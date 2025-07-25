const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    content: './src/content/content.ts',
    background: './src/background/background.ts',
    popup: './src/popup/popup.tsx',
    chatbot: './src/chatbot/chatbot.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
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
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'src/popup/popup.html',
          to: 'popup.html'
        },
        {
          from: 'src/content/content.css',
          to: 'content.css'
        },
        {
          from: 'src/chatbot/chatbot.css',
          to: 'chatbot.css'
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
  ]
};
