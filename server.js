const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const dbPath = path.join(__dirname, 'data', 'cms.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    author TEXT DEFAULT 'Workeron Team',
    category TEXT DEFAULT '',
    image TEXT DEFAULT '',
    excerpt TEXT DEFAULT '',
    content TEXT DEFAULT '',
    meta_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    keywords TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('workeron2026', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
  console.log('Default admin created: admin / workeron2026');
}

const articleCount = db.prepare('SELECT COUNT(*) as cnt FROM articles').get().cnt;
if (articleCount === 0) {
  try {
    const articlesRaw = fs.readFileSync(path.join(__dirname, 'articles.js'), 'utf8');
    const match = articlesRaw.match(/const\s+articles\s*=\s*(\[[\s\S]*?\n\]);\s*\n/);
    if (match) {
      const articles = new Function(`return ${match[1]}`)();
      const insert = db.prepare(`
        INSERT INTO articles (title, slug, date, author, category, image, excerpt, content, meta_title, meta_description, keywords, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((items) => {
        for (const a of items) {
          insert.run(
            a.title, a.slug, a.date, a.author || 'Workeron Team',
            a.category || '', a.image || '', a.excerpt || '', a.content || '',
            a.metaTitle || '', a.metaDescription || '', JSON.stringify(a.keywords || []),
            a.id || 0
          );
        }
      });
      insertMany(articles);
      console.log(`Imported ${articles.length} articles`);
    }
  } catch (e) {
    console.log('Import failed:', e.message);
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'workeron-cms-secret-' + uuidv4(),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    if (!allowed.includes(ext)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/admin/login.html');
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ username: req.session.username });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

const contentPath = path.join(__dirname, 'data', 'content.json');
const settingsPath = path.join(__dirname, 'data', 'settings.json');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function regenerateCMSClient() {
  try {
    console.log('Regenerating cms-client.js...');
    execSync('python3 generate_client.py', { cwd: __dirname });
    console.log('cms-client.js regenerated successfully');
  } catch (error) {
    console.error('Failed to regenerate cms-client.js:', error.message);
  }
}

app.get('/api/content', (req, res) => {
  res.json(readJSON(contentPath));
});

app.get('/api/settings', (req, res) => {
  res.json(readJSON(settingsPath));
});

app.put('/api/content', requireAuth, (req, res) => {
  writeJSON(contentPath, req.body);
  regenerateCMSClient();
  res.json({ ok: true });
});

app.put('/api/content/:section', requireAuth, (req, res) => {
  const content = readJSON(contentPath);
  content[req.params.section] = req.body;
  writeJSON(contentPath, content);
  regenerateCMSClient();
  res.json({ ok: true });
});

app.put('/api/settings', requireAuth, (req, res) => {
  writeJSON(settingsPath, req.body);
  res.json({ ok: true });
});

app.get('/api/articles', (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY date DESC, sort_order DESC').all();
  articles.forEach(a => { a.keywords = JSON.parse(a.keywords || '[]'); });
  res.json(articles);
});

app.get('/api/articles/:slug', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!article) return res.status(404).json({ error: 'Not found' });
  article.keywords = JSON.parse(article.keywords || '[]');
  res.json(article);
});

app.post('/api/articles', requireAuth, (req, res) => {
  const { title, slug, date, author, category, image, excerpt, content, meta_title, meta_description, keywords } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });

  const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) return res.status(400).json({ error: 'Slug already exists' });

  const result = db.prepare(`
    INSERT INTO articles (title, slug, date, author, category, image, excerpt, content, meta_title, meta_description, keywords)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, slug, date || new Date().toISOString().split('T')[0], author || 'Workeron Team',
    category || '', image || '', excerpt || '', content || '',
    meta_title || '', meta_description || '', JSON.stringify(keywords || []));

  res.json({ ok: true, id: result.lastInsertRowid });
});

app.put('/api/articles/:id', requireAuth, (req, res) => {
  const { title, slug, date, author, category, image, excerpt, content, meta_title, meta_description, keywords } = req.body;

  const existing = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(slug, req.params.id);
  if (existing) return res.status(400).json({ error: 'Slug already exists' });

  db.prepare(`
    UPDATE articles SET title=?, slug=?, date=?, author=?, category=?, image=?, excerpt=?, content=?,
    meta_title=?, meta_description=?, keywords=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(title, slug, date, author, category, image, excerpt, content,
    meta_title || '', meta_description || '', JSON.stringify(keywords || []), req.params.id);

  res.json({ ok: true });
});

app.delete('/api/articles/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ ok: true, url: '/uploads/' + req.file.filename, filename: req.file.filename });
});

app.get('/api/uploads', requireAuth, (req, res) => {
  const dir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir)
    .filter(f => !f.startsWith('.'))
    .map(f => ({
      filename: f,
      url: '/uploads/' + f,
      size: fs.statSync(path.join(dir, f)).size
    }));
  res.json(files);
});

app.delete('/api/uploads/:filename', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', path.basename(req.params.filename));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

app.get('/admin/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/admin.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.css'));
});
app.get('/admin/admin.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.js'));
});

app.use('/admin', requireAuth, express.static(path.join(__dirname, 'admin')));

app.get('/articles.js', (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY date DESC, sort_order DESC').all();
  articles.forEach(a => { a.keywords = JSON.parse(a.keywords || '[]'); });
  res.type('application/javascript');
  res.send(`const articles = ${JSON.stringify(articles)};`);
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html']
}));

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});
