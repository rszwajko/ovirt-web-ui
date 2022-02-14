import tty from 'tty'
import util from 'util'
import webpack from 'webpack'

import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import ESLintPlugin from 'eslint-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin.js'
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin.js'
import CleanTerminalPlugin from 'clean-terminal-webpack-plugin'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'

import postcssPresetEnv from 'postcss-preset-env'
import paths from './paths.cjs'
import env from './env.js'

const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT, 10) || 8192

// This is the development configuration.
// It is focused on developer experience and fast rebuilds.
export default ({
  userInfo = {},
  publicPath = '/',
  browser = 'chromium-browser',
  engineUrl = 'http://localhost:8080',
  port = 3000,
  host = 'localhost',
  https = false,
  cleanTerminalMessage = 'Dev server running...',
} = {}) => {
  const isClientDefaultAppConfig = publicPath === '/'
  const isServerDefaultAppConfig = publicPath === '/ovirt-engine/web-ui/'

  let fontsToEmbed

  const theConfig = {
    devServer: {
      host,
      port,
      https,
      historyApiFallback: {
        index: publicPath,
      },
      client: {
        logging: 'info',
        progress: true,
      },
      hot: true,
      open: browser !== 'none' && {
        app: {
          name: browser,
        },
      },
      proxy: [
        isClientDefaultAppConfig &&
        {
          /*
            Using client side defaults from src/config.js
            Note: fetching ovirt-web-ui.config relies on hardcoded path and will fail.
           */
          context: ['/auth', '/api', '/services', '/web-ui'],
          target: engineUrl,
          changeOrigin: true,
          secure: false,
          logLevel: 'debug',
        },
        isServerDefaultAppConfig && {
          /*
          Assumptions:
          1. standard ENGINE_URL: host:port/ovirt-engine
          2. standard ovirt-engine/web-ui/ovirt-web-ui.config
        {
          "applicationContext": "/ovirt-engine",
          "applicationURL": "/ovirt-engine/web-ui", with content:
          "applicationLogoutURL": "/ovirt-engine/web-ui/sso/logout",
        }
        */
          context: ['/ovirt-engine'],
          target: engineUrl,
          changeOrigin: true,
          secure: false,
          // remove duplicated "ovirt-engine" section from path
          pathRewrite: { '^/ovirt-engine': '' },
          logLevel: 'debug',
        },
      ].filter(Boolean),
    },
    mode: 'development',
    stats: 'minimal',
    bail: true,
    devtool: 'eval-source-map',

    entry: [
      paths.appIndexJs,
    ],

    output: {
      // The build folder.
      path: paths.appBuild,
      publicPath: publicPath,
    },

    resolve: {
      extensions: ['.js', '.json', '.jsx'],
      alias: {
        _: `${paths.appSrc}`,
      },
      fallback: {
        module: false,
        dgram: false,
        dns: false,
        fs: false,
        http2: false,
        net: false,
        tls: false,
        child_process: false,
      },
    },

    module: {
      parser: {
        javascript: {
          exportsPresence: 'error',
        },
      },
      rules: [
        {
          // oneOf lets us have a loader w/o a test as a default instead of applying to everything
          // https://webpack.js.org/configuration/module/#ruleoneof
          oneOf: [
            // Process application JS with Babel.
            {
              test: /\.(js|jsx)$/,
              include: [
                paths.appSrc,
              ],
              use: {
                loader: 'babel-loader',
                options: {
                  babelrc: false,
                  configFile: false,
                  compact: false,

                  presets: ['./config/babel.app.config.cjs'],

                  // This is a feature of `babel-loader` for webpack (not Babel itself).
                  // It enables caching results in ./node_modules/.cache/babel-loader/
                  // directory for faster rebuilds.
                  cacheDirectory: true,
                  cacheCompression: false,

                  plugins: ['react-refresh/babel', paths.appFancyConsole],
                },
              },
            },

            // inline base64 URLs for <= 8k images, direct URLs for the rest
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              use: {
                loader: 'url-loader',
                options: {
                  limit: imageInlineSizeLimit,
                  name: 'static/media/[name].[hash:8].[ext]',
                },
              },
            },

            // embed the woff2 fonts and any fonts that are used by the PF icons
            // directly in the CSS (to avoid lag applying fonts), export the rest
            // to be loaded separately as needed
            {
              test: fontsToEmbed = [
                /\.woff2(\?v=[0-9].[0-9].[0-9])?$/,
                /PatternFlyIcons-webfont\.ttf/,
              ],
              use: {
                loader: 'url-loader',
                options: {},
              },
            },
            {
              test: /\.(ttf|eot|svg|woff(?!2))(\?v=[0-9].[0-9].[0-9])?$/,
              exclude: fontsToEmbed,
              use: {
                loader: 'file-loader',
                options: {
                  name: 'static/fonts/[name].[hash:8].[ext]',
                },
              },
            },

            // A special case for favicon.ico to place it into build root directory.
            {
              test: /\/favicon.ico$/,
              include: [paths.appSrc],
              use: {
                loader: 'file-loader',
                options: {
                  name: 'favicon.ico?[hash:8]',
                },
              },
            },

            // "postcss-loader" applies autoprefixer to our CSS.
            // "css-loader" resolves paths in CSS and adds assets as dependencies.
            // "style-loader" turns CSS into JS modules that inject <style> tags.
            // MiniCssExtractPlugin extract CSS into separate files.
            // In production, we use a plugin to extract that CSS to a file, but
            // in development "style-loader" loader enables hot editing of CSS.

            // css modules for local style sheets without '-nomodules.css' suffix
            // ALL imported css from app source should be treated as css-modules except '-nomodules.css'
            {
              test: /\.css$/,
              exclude: /(node_modules)|(-nomodules\.css$)/,
              use: [
                'style-loader',
                {
                  loader: 'css-loader',
                  options: {
                    importLoaders: 1,
                    sourceMap: true,
                    modules: {
                      localIdentName: '[path][name]__[local]--[hash:base64:10]',
                    },
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    sourceMap: true,
                    postcssOptions: {
                      ident: 'postcss',
                      plugins: [
                        postcssPresetEnv({
                          autoprefixer: {
                            flexbox: 'no-2009',
                          },
                          stage: 3,
                        }),
                      ],
                    },
                  },
                },
              ],
            },

            // plain css for style sheets of dependencies and local with '-nomodules.css' suffix
            {
              test: /\.css$/,
              include: /(node_modules)|(-nomodules\.css$)/,
              use: [
                'style-loader',
                {
                  loader: 'css-loader',
                  options: {
                    importLoaders: 1,
                    sourceMap: true,
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    sourceMap: true,
                    postcssOptions: {
                      ident: 'postcss',
                      plugins: [
                        postcssPresetEnv({
                          autoprefixer: {
                            flexbox: 'no-2009',
                          },
                          stage: 3,
                        }),
                      ],
                    },
                  },
                },
              ],
              // Don't consider CSS imports dead code (for tree shaking) even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },

            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader **doesn't use a "test"** so it will catch all modules
            // that fall through the other loaders.
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpack's internal loaders.
              exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
              use: {
                loader: 'file-loader',
                options: {
                  name: 'static/media/[name].[hash:8].[ext]',
                },
              },
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ],
        },
      ],
    },

    plugins: [
      // Copy sources not otherwise handled by webpack
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/ovirt-web-ui.config' },
          { from: paths.appBranding, to: 'branding', toType: 'dir' },
        ],
      }),

      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        filename: 'index.html',
        inject: true,
        template: `!!handlebars-loader!${paths.appHtml}`,
        publicPath,
        jspSSO: false,
        userInfo: JSON.stringify(userInfo),
      }),

      // This gives some necessary context to module not found errors, such as the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath),

      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'development') { ... }. See `env.js`.
      new webpack.DefinePlugin(env),

      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      new CaseSensitivePathsPlugin(),

      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      new WatchMissingNodeModulesPlugin(paths.appNodeModules),

      new CleanTerminalPlugin({
        message: cleanTerminalMessage,
        onlyInWatchMode: true,
        skipFirstRun: true,
        beforeCompile: true,
      }),

      new ESLintPlugin(),

      new ReactRefreshWebpackPlugin(),
    ],
  }

  if (process.env.V) {
    const colors = tty.isatty(1)
    console.log('Dev webpack configuration:')
    console.log(util.inspect(theConfig, { compact: false, breakLength: 120, depth: null, colors }))
  }
  return theConfig
}
