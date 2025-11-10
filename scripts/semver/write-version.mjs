import fs from 'fs';
import path from 'path';

const root = process.cwd();
const version = process.argv[2];
if (!version) {
  console.error('Missing version argument');
  process.exit(1);
}

const pkgPath = path.join(root, 'projects', 'connectome', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Updated projects/connectome/package.json to version ${version}`);
