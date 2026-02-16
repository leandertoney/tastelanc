const { withPodfile } = require('expo/config-plugins');

/**
 * Forces Radar to use the Core subspec (no In-App Messaging) to avoid
 * pulling in optional messaging classes that are causing build failures.
 */
module.exports = function withRadarCoreOnly(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const radarLine = /pod ['"]RadarSDK['"][^\n]*\n/;

    if (radarLine.test(contents)) {
      contents = contents.replace(radarLine, `  pod 'RadarSDK', :subspecs => ['Core']\n`);
    } else {
      // Fallback: inject under use_native_modules! if the pod isn't present
      contents = contents.replace(
        /use_native_modules!\n/,
        "use_native_modules!\n  pod 'RadarSDK', :subspecs => ['Core']\n"
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
