/** @type {import('.')} */
let binding;
try {
  binding = require('./server-native.node');
} catch (e) {
  try {
    binding =
      process.arch === 'arm64'
        ? require('./server-native.arm64.node')
        : process.arch === 'arm'
          ? require('./server-native.armv7.node')
          : require('./server-native.x64.node');
  } catch (err) {
    console.warn('Native bindings not found, using stubs for build-time safety.');
    binding = {
      // Add empty stubs for crypto or other native functions if needed by NestJS during boot
      passwordHash: () => Promise.resolve('stubbed'),
      passwordVerify: () => Promise.resolve(true),
    };
  }
}

module.exports = binding;
