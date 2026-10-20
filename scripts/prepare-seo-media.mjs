// Reproducible WebP variants. Original files and all private family uploads are preserved.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const names = ['family_photo_strip', 'hero_ai_portrait', 'testimonial_1', 'testimonial_2', 'testimonial_3'];
const results = [];
for (const name of names) {
  const source = `public/${name}.jpg`, target = `public/${name}.webp`;
  await sharp(source).rotate().webp({ quality: 82, effort: 6 }).toFile(target);
  results.push({ source, before: (await stat(source)).size, target, after: (await stat(target)).size });
}
// The existing sprout motif, rendered as a raster for social crawlers and logo metadata.
const sprout = `<path d="M126 204 Q122 143 130 100" stroke="#426B4F" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M128 151 Q76 105 38 123 Q60 177 128 161Z" fill="#426B4F"/><path d="M130 119 Q166 47 220 63 Q208 129 132 129Z" fill="#C99030"/>`;
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="56" fill="#F7F1E6"/>${sprout}</svg>`)).webp({ lossless: true }).toFile('public/kahiye-mark.webp');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#F7F1E6"/><circle cx="1080" cy="585" r="285" fill="#EEE1CB"/><g transform="translate(875 180) scale(1.1)">${sprout}</g><text x="80" y="120" font-family="Georgia,serif" font-size="52" fill="#8B4937">kahiye</text><text x="80" y="270" font-family="Georgia,serif" font-size="64" fill="#252C2A">Parenting changes.</text><text x="80" y="355" font-family="Georgia,serif" font-size="64" fill="#252C2A">Find your next small step.</text><text x="82" y="475" font-family="Arial,sans-serif" font-size="28" fill="#48574F">A handbook for everyday parenting.</text><text x="82" y="560" font-family="Arial,sans-serif" font-size="22" fill="#48574F">kahiye.app</text></svg>`)).webp({ quality: 88, effort: 6 }).toFile('public/kahiye-social.webp');
console.log(JSON.stringify(results, null, 2));
