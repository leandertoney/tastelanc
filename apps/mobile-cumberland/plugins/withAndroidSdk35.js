const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSdk35(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Replace compileSdk/compileSdkVersion with 35
    contents = contents.replace(
      /compileSdk\s*=?\s*\d+/g,
      'compileSdk = 35'
    );
    contents = contents.replace(
      /compileSdkVersion\s*=?\s*\d+/g,
      'compileSdkVersion = 35'
    );

    // Replace targetSdk/targetSdkVersion with 35
    contents = contents.replace(
      /targetSdk\s*=?\s*\d+/g,
      'targetSdk = 35'
    );
    contents = contents.replace(
      /targetSdkVersion\s*=?\s*\d+/g,
      'targetSdkVersion = 35'
    );

    config.modResults.contents = contents;
    return config;
  });
};
