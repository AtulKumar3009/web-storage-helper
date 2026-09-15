const path = require('path');

module.exports = {
    entry: './src/index.ts', // Entry file
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        library: {
            name: 'web-storage-helper',
            type: 'umd',
        },
        globalObject: 'this',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    mode: 'production',
    optimization: {
        minimize: true,
    },
    devtool: false,
};
