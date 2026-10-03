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

// Number of verses for each of the 114 Surahs (index 0 = Surah 1)
const surahVerseCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53,
  89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12,
  12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26,
  30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

// Generate routes for all 114 Surahs and their individual verses
const dynamicRoutes = [];
surahVerseCounts.forEach((verseCount, index) => {
  const surahNum = index + 1;
  dynamicRoutes.push(`/surah/${surahNum}`); // Surah route
  
  for (let verseNum = 1; verseNum <= verseCount; verseNum++) {
    dynamicRoutes.push(`/surah/${surahNum}/verse/${verseNum}`); // Verse route
  }
});

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
