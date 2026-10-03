import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace this with your actual production domain when you have it.
// You can also pass it in via the VITE_APP_URL environment variable.
const BASE_URL = process.env.VITE_APP_URL || 'https://quranarabic.suyena.com';

const staticRoutes = [
  '/',
  '/login',
  '/register',
  '/learn',
  '/surahs',
  '/practice'
];

// Generate routes for all 114 Surahs dynamically
const dynamicRoutes = Array.from({ length: 114 }, (_, i) => `/surah/${i + 1}`);

const allRoutes = [...staticRoutes, ...dynamicRoutes];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>${route === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

const outputPath = path.join(__dirname, 'public', 'sitemap.xml');

try {
  fs.writeFileSync(outputPath, sitemap.trim());
  console.log(`✅ Sitemap successfully generated at ${outputPath}`);
} catch (error) {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
}
