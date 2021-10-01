import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import InjectBodyPlugin from 'inject-body-webpack-plugin'
import path from 'path'
import fs from 'fs'
import webpack from 'webpack'

const config = (env: any, { mode }: { mode: 'development' | 'production' | 'none' }): webpack.Configuration => {
  const pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }))

  return {
    target: 'electron-renderer',
    entry: {
      renderer: './src/renderer.tsx',
    },

    mode: mode,
    devtool: mode == 'development' ? 'inline-source-map' : 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
      rules: [{ test: /\.tsx?$/, loader: 'ts-loader' }],
    },
    context: process.cwd(),
    output: {
      filename: '[name].js',
      path: path.resolve(process.cwd(), 'build', 'dev'),
      devtoolModuleFilenameTemplate: mode == 'development' ? '[absolute-resource-path]' : undefined,
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'renderer-vendor',
          },
        },
      },
    },

    plugins: [
      new HtmlWebpackPlugin({
        title: `${pkg.productName || pkg.name} ${pkg.version}`,
      }),
      new InjectBodyPlugin({
        content: '<div id="root"></div>',
      }),
      new CspHtmlWebpackPlugin({
        'script-src': '',
        'style-src': '',
      }),
    ],
  }
}

export default config
