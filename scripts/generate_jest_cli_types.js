const { readFileSync, writeFileSync } = require('fs');

// this sticks everything exported in this module onto the export
// thing we declare above
eval(String(readFileSync('./node_modules/jest-cli/build/cli/args.js')));

function filterOptions(type) {
  return Object.entries(exports.options)
    .filter(([k, v]) => v.type === type)
    .map(([k]) => k);
}

let out = [];

out.push(`export const JEST_BOOLEAN_OPTS = ${JSON.stringify(filterOptions('boolean'))} as const;`);
out.push('');

out.push(`export const JEST_STRING_OPTS = ${JSON.stringify(filterOptions('string'))} as const;`);
out.push('');

out.push(`export const JEST_ARRAY_OPTS = ${JSON.stringify(filterOptions('array'))} as const;`);
out.push('');

writeFileSync('./src/testing/jest/jest-cli-options.ts', out.join('\n'));
