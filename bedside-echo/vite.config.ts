import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// 手機相機(getUserMedia)只能在 HTTPS 或 localhost 使用,
// 因此開發伺服器一律走 HTTPS:
// 1. 若 certs/ 目錄下有 mkcert 產生的憑證(dev-cert.pem / dev-key.pem),
//    優先使用 —— iPhone 安裝並信任 mkcert 根憑證後即可正常實測(見 README)。
// 2. 否則退回 @vitejs/plugin-basic-ssl 的臨時自簽憑證(瀏覽器會顯示警告,
//    需手動「仍要前往」;iOS 上 Service Worker 可能無法註冊)。
const certDir = path.resolve(import.meta.dirname, 'certs')
const certFile = path.join(certDir, 'dev-cert.pem')
const keyFile = path.join(certDir, 'dev-key.pem')
const hasLocalCert = fs.existsSync(certFile) && fs.existsSync(keyFile)

export default defineConfig({
  plugins: [
    react(),
    ...(hasLocalCert ? [] : [basicSsl()]),
    VitePWA({
      registerType: 'autoUpdate',
      // 開發模式也啟用 Service Worker,方便手機實測「加入主畫面」
      devOptions: { enabled: true },
      includeAssets: ['icons/apple-touch-icon-180.png'],
      manifest: {
        name: '床邊心臟超音波簡易報告',
        short_name: '床邊心超',
        description: '床邊心臟超音波檢查的照片記錄與簡易報告工具(院內使用)',
        lang: 'zh-TW',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        theme_color: '#1d4e89',
        background_color: '#f4f7fb',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    // 0.0.0.0:讓同一 Wi-Fi 的手機能以電腦的區網 IP 連入實測
    host: true,
    port: 5173,
    https: hasLocalCert
      ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
      : undefined,
  },
})
