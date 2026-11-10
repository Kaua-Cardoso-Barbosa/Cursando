import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const root = path.resolve('..');
await fs.mkdir('public/screens', { recursive: true });
await fs.mkdir('public/assets', { recursive: true });
await fs.copyFile(path.join(root, 'frontend/public/imagens_assets/logo.png'), 'public/assets/logo.png');
const catalog = await fetch('http://127.0.0.1:5000/cursos/home').then(r => { if (!r.ok) throw Error('Catálogo indisponível'); return r.json(); });
const all = [...catalog.destaques, ...catalog.mais_assinados];
const courses = [...new Map(all.map(c => [c.id, c])).values()].slice(0, 6);
for (const [i, course] of courses.entries()) {
  const file = path.join(root, 'backend', course.imagem.replace(/^\//, ''));
  const ext = path.extname(file);
  await fs.copyFile(file, `public/assets/course-${i}${ext}`);
  course.asset = `assets/course-${i}${ext}`;
}
await fs.writeFile('public/catalog.json', JSON.stringify(courses, null, 2));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/verificar_token', r => r.fulfill({ status: 401, json: { autenticado: false } }));
  await page.goto(process.env.CURSANDO_PREVIEW_URL || 'http://127.0.0.1:5199/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/screens/home.png' });
  const coursesSection = page.locator('#cursos');
  await coursesSection.scrollIntoViewIfNeeded();
  await coursesSection.screenshot({ path: 'public/screens/catalog.png' });
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Logo, capas existentes e capturas reais da home e do catálogo preparados.');
} finally { await browser.close(); }
