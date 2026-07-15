// Rasterizes the brand SVGs into every icon size the PWA + Play Store need.
// Run with: npm run icons   (also runs automatically before `vite build`)
import sharp from 'sharp'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const brand = (f) => join(root, 'brand', f)
const pub = (...p) => join(root, 'public', ...p)

const CREAM = { r: 253, g: 249, b: 245, alpha: 1 } // #fdf9f5

// [source svg, output path, size, background]  (null bg = transparent)
const TARGETS = [
  ['logo.svg', 'icons/icon-192.png', 192, null],
  ['logo.svg', 'icons/icon-512.png', 512, null],
  ['logo-maskable.svg', 'icons/maskable-192.png', 192, null],
  ['logo-maskable.svg', 'icons/maskable-512.png', 512, null],
  // Apple devices don't honor transparency well — flatten onto cream.
  ['logo.svg', 'apple-touch-icon.png', 180, CREAM],
  // Favicons
  ['logo.svg', 'favicon-32.png', 32, CREAM],
  ['favicon.svg', 'favicon-16.png', 16, CREAM],
  // Play Store listing / large tile (optional but handy)
  ['logo-maskable.svg', 'icons/playstore-512.png', 512, null],
]

async function run() {
  await mkdir(pub('icons'), { recursive: true })

  // A tiny standalone favicon.svg (also referenced directly in index.html).
  const faviconSvg = (await readFile(brand('logo.svg'), 'utf8')).replace(
    '<rect',
    '<rect',
  )
  await writeFile(pub('favicon.svg'), faviconSvg)

  for (const [src, out, size, bg] of TARGETS) {
    const svg = await readFile(brand(src === 'favicon.svg' ? 'logo.svg' : src))
    let img = sharp(svg, { density: 384 }).resize(size, size, {
      fit: 'contain',
      background: bg || { r: 0, g: 0, b: 0, alpha: 0 },
    })
    if (bg) img = img.flatten({ background: bg })
    await img.png({ compressionLevel: 9 }).toFile(pub(out))
    console.log('✓', out, `(${size}×${size})`)
  }

  console.log('\nAll icons generated into /public.')
}

run().catch((e) => {
  console.error('Icon generation failed:', e)
  process.exit(1)
})
