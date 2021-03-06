const glob = require('glob');
const globParent = require('glob-parent');
const _merge = require('lodash.merge');
const notifier = require('node-notifier');
const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const { debugLog, jsonLog } = require('../lib/utils.js');

function buildWebpackConfig(config) {
    const webpackConfig = {
        entry: {},
        output: {
            path: config.paths.dist.js,
            filename: '[name].[contenthash].js'
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }
            ]
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
            },
        },
        plugins: [
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                'window.jQuery': 'jquery'
            })
        ]
    }

    if(config.flags.analyze) {
        webpackConfig.plugins.push(new BundleAnalyzerPlugin());
    }

    if(config.flags.production) {
        webpackConfig.mode = 'production';
    }
    else {
        webpackConfig.mode = 'development';
        webpackConfig.devtool = 'inline-source-map';
    }

    // Make separate entry point for each file in top level src js folder
    const entryFiles = path.join(config.src.dir, globParent(config.src.js), '/*.js');

    glob.sync(entryFiles).forEach(filename => {
        webpackConfig.entry[path.parse(filename).name] = `./${filename}`;
    });

    // Merge in project config
    _merge(webpackConfig, config.options.webpack);

    return webpackConfig;
}

const errorHandler = (err, stats) => {
    // console.log(stats.toString({ colors: true }));

    if(err) {
        console.error(err.stack || err);
        if(err.details) {
            console.error(err.details);
        }
        return;
    }

    const statsJson = stats.toJson();

    if(stats.hasErrors()) {
        statsJson.errors.forEach(error => {
            console.error(error);

            notifier.notify({
                title: 'Error running Gulp',
                message: error,
                sound: 'Frog',
                icon: path.join(__dirname, '../node_modules/gulp-notify/assets/gulp-error.png'),
            });
        });
    }

    if(stats.hasWarnings()) {
        statsJson.warnings.forEach(warning => console.error(warning));
    }
}

module.exports = config => {
    const webpackConfig = buildWebpackConfig(config);

    const webpackTask = cb => {
        if(config.flags.debug) {
            debugLog('Webpack config');
            jsonLog(webpackConfig);
        }

        return webpack(webpackConfig, (err, stats) => {
            if(config.flags.debug) {
                console.log(stats.toString({ colors: true }));
            }

            errorHandler(err, stats);
            cb();
        });
    }

    webpackTask.displayName = 'webpack';
    return webpackTask;
}
