/**
 * 產生 PWA App 圖示(免外部繪圖工具,用 Node 內建 zlib 直接輸出 PNG)。
 * 圖案:深藍底 + 白色愛心 + 超音波扇形掃描線示意。
 * 執行:node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BG = [29, 78, 137] // 深藍 #1d4e89
const FG = [255, 255, 255]

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 心形內部判定:經典隱函數 (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0 */
function inHeart(x, y) {
  const f = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y
  return f <= 0
}

function makePng(size, { padding = 0.12 } = {}) {
  const px = new Uint8Array(size * size * 3)
  const cx = size / 2
  const cy = size / 2
  // 心形繪製範圍(padding 越大心越小,maskable 圖示需要較大安全區)
  const scale = (size * (1 - padding * 2)) / 2.9
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // 座標轉換:心形公式的 y 軸朝上
      const x = (i - cx) / scale
      const y = -(j - cy - size * 0.04) / scale
      let color = BG
      if (inHeart(x, y)) {
        color = FG
        // 心形內畫三條「超音波掃描弧線」(藍色鏤空)
        const r = Math.sqrt(x * x + (y - 1.15) * (y - 1.15))
        for (const ring of [0.55, 0.95, 1.35]) {
          if (Math.abs(r - ring) < 0.07) color = BG
        }
      }
      const o = (j * size + i) * 3
      px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]
    }
  }
  // 每條 scanline 前加 filter byte 0
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let j = 0; j < size; j++) {
    raw[j * (size * 3 + 1)] = 0
    Buffer.from(px.buffer, j * size * 3, size * 3).copy(raw, j * (size * 3 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(outDir, 'icon-192.png'), makePng(192))
writeFileSync(join(outDir, 'icon-512.png'), makePng(512))
writeFileSync(join(outDir, 'icon-512-maskable.png'), makePng(512, { padding: 0.2 }))
writeFileSync(join(outDir, 'apple-touch-icon-180.png'), makePng(180))
console.log('icons written to', outDir)
