const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

function findDbs(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) findDbs(p, out);
    else if (/\.(db|sqlite|sqlite3)$/i.test(f.name)) out.push(p);
  }
  return out;
}

const dbs = findDbs(process.cwd(), []);
console.log('DB files found:', dbs);

dbs.forEach(file => {
  const db = new sqlite3.Database(file);
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (e, tables) => {
    if (e) return console.log(file, e.message);
    tables.forEach(t => {
      db.all(`PRAGMA table_info(${t.name})`, (e2, cols) => {
        console.log(`[${path.basename(file)}] ${t.name}: ` + cols.map(c => c.name).join(', '));
      });
    });
  });
});
