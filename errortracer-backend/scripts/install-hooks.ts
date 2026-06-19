import { chmodSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

const hooksPath = '.githooks';
const preCommitPath = resolve(hooksPath, 'pre-commit');

const configResult = spawnSync(
  'git',
  ['config', '--local', 'core.hooksPath', hooksPath],
  {
    stdio: 'inherit',
  },
);

if (configResult.status !== 0) {
  process.exit(configResult.status ?? 1);
}

chmodSync(preCommitPath, 0o755);

console.log(`Git hooks installed from ${hooksPath}`);
