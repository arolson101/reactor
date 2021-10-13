import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import fs from 'fs'
import HTMLInlineCSSWebpackPlugin from 'html-inline-css-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import InjectBodyPlugin from 'inject-body-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import path from 'path'
import ReactRefreshTypeScript from 'react-refresh-typescript'
import webpack from 'webpack'

const config = (env: any, { mode }: { mode: 'development' | 'production' | 'none' }): webpack.Configuration => {
  const pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }))
  const reactor_path = path.dirname(path.dirname(__filename))

  const isDevelopment = mode === 'development'
  const isProduction = !isDevelopment

  const externals: Record<string, string> = {}
  for (const dependency in pkg.dependencies) {
    externals[dependency] = `commonjs2 ${dependency}`
  }

  return {
    target: 'electron-renderer',
    entry: {
      renderer: path.join(reactor_path, 'src', 'renderer.tsx'),
    },

    mode,
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@app': path.resolve(process.cwd(), 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: {
            getCustomTransformers: () => ({
              before: [isDevelopment && ReactRefreshTypeScript()].filter(Boolean),
            }),
            // disable type checker - we will use it in fork plugin
            transpileOnly: true,
          },
        },
        {
          test: /\.css$/i,
          use: [
            isDevelopment ? { loader: 'style-loader' } : MiniCssExtractPlugin.loader,
            { loader: 'css-loader', options: { sourceMap: true } },
          ],
        },
      ],
    },
    context: process.cwd(),
    output: {
      filename: '[name].js',
      path: path.resolve(process.cwd(), 'build', isDevelopment ? 'dev' : 'prod'),
      devtoolModuleFilenameTemplate: isDevelopment ? '[absolute-resource-path]' : undefined,
    },
    externals,
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
      isProduction && new MiniCssExtractPlugin(),
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({
        title: `${pkg.productName || pkg.name} ${pkg.version}`,
      }),
      isProduction && new HTMLInlineCSSWebpackPlugin(),
      new InjectBodyPlugin({
        content: '<div id="root"></div>',
      }),
      isDevelopment && new ReactRefreshWebpackPlugin(),
      isProduction &&
        new CspHtmlWebpackPlugin({
          'script-src': '',
          'style-src': '',
        }),
    ].filter(Boolean) as webpack.WebpackPluginInstance[],
  }
}

export default config
