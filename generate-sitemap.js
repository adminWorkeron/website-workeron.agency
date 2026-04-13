const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'cms.db');
const db = new Database(dbPath);

// Get all published articles
const articles = db.prepare('SELECT slug, date FROM articles ORDER BY date DESC').all();

// Get current date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// Build sitemap XML
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

    <!-- Homepage -->
    <url>
        <loc>https://workeron.agency/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>

    <!-- Blog Main Page -->
    <url>
        <loc>https://workeron.agency/blog.html</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>

`;

// Add each article
articles.forEach(article => {
    // Normalize date format to YYYY-MM-DD
    let articleDate = article.date || today;
    
    // Try to parse various date formats
    try {
        const parsedDate = new Date(articleDate);
        if (!isNaN(parsedDate.getTime())) {
            articleDate = parsedDate.toISOString().split('T')[0];
        } else {
            articleDate = today;
        }
    } catch (e) {
        articleDate = today;
    }
    
    sitemap += `    <!-- Blog Article: ${article.slug} -->
    <url>
        <loc>https://workeron.agency/blog.html?article=${article.slug}</loc>
        <lastmod>${articleDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>

`;
});

sitemap += `</urlset>
`;

// Write sitemap
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ Sitemap generated with ${articles.length} articles`);
console.log('📍 Location: sitemap.xml');

db.close();
