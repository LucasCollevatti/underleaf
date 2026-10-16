const { merge } = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const base = require('./webpack.config')

module.exports = merge(
  base,
  {
    mode: 'production',

    // Enable a full source map. Generates a comment linking to the source map
    devtool: 'hidden-source-map',

    optimization: {
      // Minify JS (with Terser) and CSS (with cssnano)
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: /(Error|Exception)$/,
            keep_fnames: /(Error|Exception)$/,
          },
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            // disable mergeLonghand to avoid a cssnano bug https://github.com/cssnano/cssnano/issues/864
            preset: ['default', { mergeLonghand: false }],
          },
        }),
      ],
    },

    // MathJax, Pyodide, and the Hunspell dictionaries are fetched only when
    // their features are used. Keep them out of the application bundle
    // budget, while still failing the production build if a shipped bundle
    // grows beyond the measured limits below.
    performance: {
      hints: 'error',
      maxAssetSize: 1024 * 1024,
      maxEntrypointSize: 2.5 * 1024 * 1024,
      assetFilter: assetFilename =>
        !/\.map$/.test(assetFilename) &&
        !/^js\/(?:dictionaries\/|libs\/mathjax-[^/]+\/|libs\/pyodide\/)/.test(
          assetFilename
        ),
    },

    plugins: [
      // Extract CSS to a separate file (rather than inlining to a <style> tag)
      new MiniCssExtractPlugin({
        // Output to public/stylesheets directory and append hash for immutable
        // caching
        filename: 'stylesheets/[name]-[contenthash].css',
      }),
    ],
  },
  {}
)
