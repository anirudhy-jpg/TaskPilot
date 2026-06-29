/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');

try {
  execSync('./node_modules/.bin/tsc --noEmit > tsc_output.txt 2>&1');
} catch {
  // It will throw if tsc returns non-zero exit code
}
