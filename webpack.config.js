const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const webpack = require("webpack");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  const isDevelopment = !isProduction;

  return {
    mode: argv.mode || "development",
    target: "web",
    entry: {
      main: "./src/client/index.ts",
    },
    output: {
      path: path.resolve(__dirname, "dist/client"),
      filename: isProduction
        ? "static/js/[name].[contenthash:8].js"
        : "static/js/[name].js",
      chunkFilename: isProduction
        ? "static/js/[name].[contenthash:8].chunk.js"
        : "static/js/[name].chunk.js",
      assetModuleFilename: "static/media/[name].[hash:8][ext]",
      clean: true,
      publicPath: "/",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@client": path.resolve(__dirname, "src/client"),
        "@components": path.resolve(__dirname, "src/client/components"),
        "@utils": path.resolve(__dirname, "src/client/utils"),
        "@styles": path.resolve(__dirname, "src/client/styles"),
        "@assets": path.resolve(__dirname, "src/client/assets"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
                compilerOptions: {
                  jsx: "react-jsx",
                },
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          oneOf: [
            // 处理CSS Modules文件（文件名包含.module）
            {
              test: /\.module\.css$/,
              use: [
                isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
                {
                  loader: "css-loader",
                  options: {
                    importLoaders: 1,
                    sourceMap: isDevelopment,
                    modules: {
                      localIdentName: isDevelopment
                        ? "[path][name]__[local]--[hash:base64:5]"
                        : "[hash:base64:5]",
                    },
                  },
                },
                {
                  loader: "postcss-loader",
                  options: {
                    postcssOptions: {
                      plugins: [
                        require("tailwindcss"),
                        require("autoprefixer"),
                      ],
                    },
                  },
                },
              ],
            },
            // 处理全局CSS文件（包括Tailwind）
            {
              use: [
                isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
                {
                  loader: "css-loader",
                  options: {
                    importLoaders: 1,
                    sourceMap: isDevelopment,
                    modules: false, // 不使用CSS Modules
                  },
                },
                {
                  loader: "postcss-loader",
                  options: {
                    postcssOptions: {
                      plugins: [
                        require("tailwindcss"),
                        require("autoprefixer"),
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          test: /\.scss$/,
          use: [
            isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                importLoaders: 2,
                sourceMap: isDevelopment,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [require("tailwindcss"), require("autoprefixer")],
                },
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: isDevelopment,
              },
            },
          ],
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: "@svgr/webpack",
              options: {
                prettier: false,
                svgo: false,
                svgoConfig: {
                  plugins: [{ removeViewBox: false }],
                },
                titleProp: true,
                ref: true,
              },
            },
            {
              loader: "file-loader",
              options: {
                name: "static/media/[name].[hash:8].[ext]",
              },
            },
          ],
          issuer: {
            and: [/\.(ts|tsx|js|jsx|md)$/],
          },
        },
        {
          test: /\.(png|jpg|jpeg|gif|webp|ico)$/i,
          type: "asset/resource",
          generator: {
            filename: "static/media/[name].[hash:8][ext]",
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: {
            filename: "static/fonts/[name].[hash:8][ext]",
          },
        },
        {
          test: /\.json$/,
          type: "json",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/client/index.html",
        inject: true,
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeRedundantAttributes: true,
              useShortDoctype: true,
              removeEmptyAttributes: true,
              removeStyleLinkTypeAttributes: true,
              keepClosingSlash: true,
              minifyJS: true,
              minifyCSS: true,
              minifyURLs: true,
            }
          : false,
      }),
      new MiniCssExtractPlugin({
        filename: isProduction
          ? "static/css/[name].[contenthash:8].css"
          : "static/css/[name].css",
        chunkFilename: isProduction
          ? "static/css/[name].[contenthash:8].chunk.css"
          : "static/css/[name].chunk.css",
      }),
      new WebpackManifestPlugin({
        fileName: "asset-manifest.json",
        publicPath: "/",
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);

          const entrypointFiles = entrypoints.main.filter(
            (fileName) => !fileName.endsWith(".map")
          );

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
      }),
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(argv.mode || "development"),
        "process.env.VERSION": JSON.stringify(
          require("./package.json").version
        ),
        "process.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
      }),
      new webpack.ProvidePlugin({
        React: "react",
      }),
      isDevelopment && new webpack.HotModuleReplacementPlugin(),
    ].filter(Boolean),
    optimization: {
      minimize: isProduction,
      minimizer: [
        new (require("terser-webpack-plugin"))({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
        }),
      ],
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 20,
          },
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
      runtimeChunk: {
        name: (entrypoint) => `runtime-${entrypoint.name}`,
      },
    },
    devtool: isDevelopment ? "cheap-module-source-map" : "source-map",
    devServer: {
      port: 3000,
      host: "0.0.0.0",
      hot: true,
      open: false,
      compress: true,
      static: {
        directory: path.join(__dirname, "public"),
        publicPath: "/",
        // 确保静态资源返回正确的MIME类型
        serveIndex: false,
      },
      historyApiFallback: {
        disableDotRule: true,
        index: "/",
        // 简化配置：只有非静态资源才重定向到index.html
        rewrites: [
          {
            // 排除所有静态资源，只重定向HTML请求
            from: /^(?!.*\.(js|css|json|png|jpg|jpeg|gif|webp|ico|woff|woff2|eot|ttf|otf|svg)$).*/,
            to: "/",
          },
        ],
      },
      client: {
        logging: "info",
        overlay: false, // 临时禁用错误覆盖层以改善用户体验
        webSocketTransport: "sockjs", // 使用SSE替代WebSocket
      },
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
      },
      // 添加缓存控制头和调试
      setupMiddlewares: (middlewares, devServer) => {
        const customMiddleware = (req, res, next) => {
          // 为静态资源添加缓存控制头，防止浏览器缓存
          if (
            req.url.match(
              /\.(js|css|json|png|jpg|jpeg|gif|webp|ico|woff|woff2|eot|ttf|otf|svg)$/
            )
          ) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate"
            );
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          }
          next();
        };

        return [customMiddleware, ...middlewares];
      },
    },
    performance: {
      hints: isProduction ? "warning" : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    stats: {
      all: false,
      modules: true,
      errors: true,
      warnings: true,
      moduleTrace: true,
      errorDetails: true,
      colors: true,
      assets: true,
      chunks: false,
      modulesSort: "size",
      assetsSort: "size",
    },
    ignoreWarnings: [
      {
        module: /node_modules/,
        message: /Critical dependency/,
      },
    ],
  };
};
