const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
let outdated = false;
for (const name of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
  const file = path.join(root, name);
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replace(/((?:href|src)=")((?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^" ]*)?"/g, (_, prefix, asset) => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12);
    return `${prefix}${asset}?v=${hash}"`;
  });
  if (source !== updated) {
    outdated = true;
    if (!check) fs.writeFileSync(file, updated);
  }
}
if (check && outdated) {
  console.error('Версии ресурсов устарели. Выполните npm run version-assets.');
  process.exitCode = 1;
} else {
  console.log(check ? 'Версии CSS и JS соответствуют содержимому файлов.' : 'Версии CSS и JS обновлены на всех страницах.');
}
