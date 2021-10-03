import path from 'path'
import webpack from 'webpack'

const baseConfig: webpack.Configuration = {
  mode: 'production',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [{ test: /\.tsx?$/, loader: 'ts-loader' }],
  },
  context: __dirname,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    // devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  },
  externals: {
    electron: 'commonjs2 electron',
    webpack: 'commonjs2 webpack',
    npm: 'commonjs2 npm',
    'csp-html-webpack-plugin': 'commonjs2 csp-html-webpack-plugin',
    'html-webpack-plugin': 'commonjs2 html-webpack-plugin',
    'inject-body-webpack-plugin': 'commonjs2 inject-body-webpack-plugin',
    'webpack-dev-server': 'commonjs2 webpack-dev-server',
    'fork-ts-checker-webpack-plugin': 'commonjs2 fork-ts-checker-webpack-plugin',
    'react-refresh-typescript': 'commonjs2 react-refresh-typescript',
  },
}

const electron_main_dev: webpack.Configuration = {
  ...baseConfig,
  mode: 'development',

  target: 'electron-main',
  entry: {
    main: './src/main.ts',
  },
  output: {
    ...baseConfig.output,
    filename: '[name].dev.js',
    // devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  },
}

const electron_main_prod: webpack.Configuration = {
  ...electron_main_dev,
  mode: 'production',
  output: {
    ...electron_main_dev.output,
    filename: '[name].js',
  },
}

const reactor_cli: webpack.Configuration = {
  ...baseConfig,
  target: 'node',
  entry: {
    reactor: './src/reactor.ts',
  },
  plugins: [new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true })],
}

export default [electron_main_dev, electron_main_prod, reactor_cli]
