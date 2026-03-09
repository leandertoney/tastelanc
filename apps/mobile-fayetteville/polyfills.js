// Polyfill SharedArrayBuffer for Expo Go / Hermes environments where it's not exposed as a global.
// Required by the Node.js `util` polyfill package which checks SharedArrayBuffer at module load time.
if (typeof global.SharedArrayBuffer === 'undefined') {
  global.SharedArrayBuffer = ArrayBuffer;
}
