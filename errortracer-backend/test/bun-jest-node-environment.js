const streamGlobals = [
  'ReadableStreamBYOBReader',
  'ReadableStreamDefaultReader',
  'WritableStreamDefaultWriter',
];

for (const key of streamGlobals) {
  if (key in globalThis) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: undefined,
    });
  }
}

const { TestEnvironment } = require('jest-environment-node');

module.exports = TestEnvironment;
