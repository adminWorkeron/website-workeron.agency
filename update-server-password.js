const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const newPassword = '!91ldnfsik@kfsako23lsal';

const dbPath = path.join(__dirname, 'data', 'cms.db');
const db = new Database(dbPath);

const hash = bcrypt.hashSync(newPassword, 10);
const result = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'admin');

console.log('✅ Password updated successfully on server!');
console.log('Username: admin');
console.log('New password: !91ldnfsik@kfsako23lsal');
console.log('Rows affected:', result.changes);
console.log('You can now login at: https://workeron.agency/admin');

db.close();
