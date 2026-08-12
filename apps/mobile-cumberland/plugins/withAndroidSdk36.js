const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSdk36(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Replace compileSdk/compileSdkVersion with 36
    contents = contents.replace(
      /compileSdk\s*=?\s*\d+/g,
      'compileSdk = 36'
    );
    contents = contents.replace(
      /compileSdkVersion\s*=?\s*\d+/g,
      'compileSdkVersion = 36'
    );

    // Replace targetSdk/targetSdkVersion with 36
    contents = contents.replace(
      /targetSdk\s*=?\s*\d+/g,
      'targetSdk = 36'
    );
    contents = contents.replace(
      /targetSdkVersion\s*=?\s*\d+/g,
      'targetSdkVersion = 36'
    );

    config.modResults.contents = contents;
    return config;
  });
};
