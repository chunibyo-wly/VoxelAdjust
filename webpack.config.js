const path = require("path");

module.exports = {
    entry: "./src/index.js", // Entry point for your app
    output: {
        filename: "bundle.js", // Output bundle file
        path: path.resolve(__dirname, "public"), // Output directory
    },
    module: {
        rules: [
            {
                test: /\.js$/, // Look for .js files
                exclude: /node_modules/, // Exclude node_modules from transpilation
                use: {
                    loader: "babel-loader", // Use babel-loader for modern JavaScript
                },
            },
        ],
    },
    resolve: {
        modules: [path.resolve(__dirname, "src"), "node_modules"], // Resolves module paths
    },
    mode: "development", // You can change this to 'production' for optimized builds
};
