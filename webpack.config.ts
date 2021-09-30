import webpack from 'webpack'
import path from 'path'

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
  externals: {
    express: 'commonjs2 express',
    webpack: 'commonjs2 webpack',
    'webpack-dev-middleware': 'commonjs2 webpack-dev-middleware',
    'csp-html-webpack-plugin': 'commonjs2 csp-html-webpack-plugin',
    'html-webpack-plugin': 'commonjs2 html-webpack-plugin',
    'inject-body-webpack-plugin': 'commonjs2 inject-body-webpack-plugin',
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
  externals: {
    webpack: 'commonjs2 webpack',
    npm: 'commonjs2 npm',
    'csp-html-webpack-plugin': 'commonjs2 csp-html-webpack-plugin',
    'html-webpack-plugin': 'commonjs2 html-webpack-plugin',
    'inject-body-webpack-plugin': 'commonjs2 inject-body-webpack-plugin',
  },
  plugins: [
    new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
  ],
}

export default [electron_main_dev, electron_main_prod, reactor_cli]
