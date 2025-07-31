const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
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
  devtool: 'cheap-module-source-map',
  // NO watch mode for single build
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
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              removeComments: false,
            },
          },
        },
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
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
          from: 'manifest.json',
          to: 'manifest.json'
        },

        {
          from: 'src/options/options.html',
          to: 'options.html'
        },
        {
          from: 'src/assets/icons',
          to: 'icons'
        }
      ]
    })
  ],
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false,
            drop_debugger: false,
          },
        },
      }),
    ],
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
