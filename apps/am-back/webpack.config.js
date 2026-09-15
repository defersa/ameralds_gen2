const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
const webpack = require('webpack');

const isHmr = process.env.NEST_HMR === 'true';
const outputFileName = 'server.js';

module.exports = {
    entry: {},
    target: 'node',
    watch: isHmr,
    externals: isHmr
        ? [
              nodeExternals({
                  allowlist: ['webpack/hot/poll?100'],
              }),
          ]
        : [],
    output: {
        path: join(__dirname, '../../dist/apps/am-back'),
        filename: outputFileName,
    },
    plugins: [
        new NxAppWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: isHmr ? './src/main.hmr.ts' : './src/main.ts',
            tsConfig: './tsconfig.app.json',
            optimization: false,
            sourceMap: isHmr,
            watch: isHmr,
            outputFileName,
            outputHashing: 'none',
            generatePackageJson: true,
            externalDependencies: isHmr ? [] : 'all',
            mergeExternals: isHmr,
            transformers: [
                {
                    name: '@nestjs/swagger/plugin',
                    options: {
                        dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
                        controllerFileNameSuffix: ['.controller.ts'],
                        classValidatorShim: true,
                        classTransformerShim: true,
                        introspectComments: true,
                    },
                },
            ],
        }),
        ...(isHmr
            ? [
                  new webpack.HotModuleReplacementPlugin(),
                  new RunScriptWebpackPlugin({
                      name: outputFileName,
                      autoRestart: false,
                  }),
              ]
            : []),
    ],
};
