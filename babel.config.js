module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@services': './src/services',
          '@screens': './src/screens',
          '@components': './src/components',
          '@types': './src/types',
          '@utils': './src/utils',
        },
      },
    ],
  ],
};

