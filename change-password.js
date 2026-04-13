const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const newPassword = process.argv[2];
if (!newPassword) {
  console.log('❌ Usage: node change-password.js <new-password>');
  console.log('Example: node change-password.js "MyNewPassword123"');
  process.exit(1);
}

const dbPath = path.join(__dirname, 'data', 'cms.db');
const db = new Database(dbPath);

const hash = bcrypt.hashSync(newPassword, 10);
db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'admin');

console.log('✅ Password updated successfully!');
console.log('New password:', newPassword);
console.log('You can now login at: http://localhost:3000/admin');

db.close();
