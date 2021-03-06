var webpack = require('webpack')

module.exports = function (config) {
  config.set({
    browserNoActivityTimeout: 30000
  , browsers: [ process.env.CONTINUOUS_INTEGRATION ? 'Firefox' : 'Chrome' ]
  , singleRun: process.env.CONTINUOUS_INTEGRATION === 'true'
  , frameworks: [ 'mocha' ]
  , plugins: [
      'karma-mocha'
    , 'karma-chrome-launcher'
    , 'karma-firefox-launcher'
    , 'karma-webpack'
    , 'karma-sourcemap-loader'
    ]
  , files: [
      'test/browser/**/*.js'
    , 'test/*.js'
    ]
  , preprocessors: {
      'test/**/*.js': [ 'webpack', 'sourcemap' ]
    }
  // , reporters: [ 'dots' ]
  , webpack: {
      devtool: 'inline-source-map'
    , module: {
        loaders: [{
          test: /\.js$/
        , exclude: /node_modules/
        , loader: 'babel-loader'
        }]
      }
    , plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('test')
        })
      ]
    }
  , webpackMiddleware: {
      noInfo: true
    }
  })
}
