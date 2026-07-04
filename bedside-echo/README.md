# 床邊心超(Bedside Echo Report)

床邊心臟超音波簡易報告系統的前端 PWA。React + Vite + TypeScript。

> ⚠️ 本專案一律使用**虛構測試資料**,不得放入任何真實病人資料。

## 快速開始

```bash
cd bedside-echo
npm install
npm run dev     # HTTPS 開發伺服器,會同時列出 Local 與 Network 網址
```

啟動後終端機會顯示:

```
➜  Local:   https://localhost:5173/
➜  Network: https://192.168.x.x:5173/   ← 手機用這個網址
```

測試用病歷號(虛構):`12345678`、`23456789`、`34567890`、`45678901`

其他指令:

```bash
npm run build    # 型別檢查 + production build(輸出到 dist/)
npm run preview  # 預覽 production build
```

## 用手機實機測試

相機(getUserMedia)只能在 **HTTPS** 或 localhost 使用,所以手機實測必須走 HTTPS。

1. 讓手機與電腦連**同一個 Wi-Fi**(或手機開熱點給電腦連)。
2. 電腦執行 `npm run dev`,記下終端機顯示的 `Network:` 網址
   (例如 `https://192.168.1.20:5173/`)。
   - 若沒顯示 Network 網址,請確認防火牆是否放行 5173 埠。
   - 查電腦 IP:macOS `ipconfig getifaddr en0`;Windows `ipconfig`;Linux `ip addr`。
3. 手機瀏覽器開啟該網址。因為是自簽憑證,第一次會出現安全警告(處理方式見下節)。
4. 允許相機權限後即可拍照。
5. 加入主畫面:
   - **iPhone Safari**:分享按鈕 →「加入主畫面」。
   - **Android Chrome**:右上角「⋮」→「加入主畫面」(或畫面出現的安裝提示)。

### 自簽憑證的兩種做法

#### 做法 A(預設,零設定):plugin-basic-ssl

不做任何事直接 `npm run dev`,Vite 會用 `@vitejs/plugin-basic-ssl`
臨時產生自簽憑證。

- **Android Chrome**:警告頁點「進階」→「仍要前往」。
- **iPhone Safari**:點「顯示詳細資訊」→「前往此網站」。
- 缺點:憑證不受信任,iOS 上 **Service Worker 可能無法註冊**
  (影響 PWA 離線與安裝體驗),但拍照功能在「仍要前往」後可以測。

#### 做法 B(建議):mkcert 產生本機受信任憑證

一次設定,之後 iPhone/Android 都完全信任、無警告、Service Worker 正常。

```bash
# 1. 安裝 mkcert(macOS 範例;其他平台見 https://github.com/FiloSottile/mkcert)
brew install mkcert
mkcert -install

# 2. 在專案內產生含「電腦區網 IP」的憑證(IP 換成你自己的)
cd bedside-echo
mkdir -p certs
mkcert -cert-file certs/dev-cert.pem -key-file certs/dev-key.pem \
  localhost 127.0.0.1 192.168.1.20

# 3. 重新啟動 npm run dev —— vite.config.ts 偵測到 certs/ 內的憑證會自動改用
```

`certs/` 已列入 `.gitignore`,憑證不會進版控。
注意:電腦換了 Wi-Fi、IP 變了,要重跑第 2 步把新 IP 加進憑證。

**讓 iPhone 信任 mkcert 根憑證:**

1. 找到根憑證位置:`mkcert -CAROOT`(目錄裡的 `rootCA.pem`)。
2. 把 `rootCA.pem` 傳到 iPhone:AirDrop 最快(或寄 email 附件)。
3. iPhone 收到後選「儲存到檔案」→ 開啟,會提示「已下載描述檔」。
4. 到「設定」→「一般」→「VPN 與裝置管理」→ 點該描述檔 →「安裝」。
5. **關鍵最後一步**:「設定」→「一般」→「關於本機」→ 最下方
   「憑證信任設定」→ 把 mkcert 根憑證的開關**打開**。
6. Safari 重新開啟網址,應該不再有警告,鎖頭正常。

**讓 Android 信任 mkcert 根憑證(選用):**
把 `rootCA.pem` 傳到手機 → 設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證。

## 目前功能(第一階段)

- **PWA**:manifest(繁中)、Service Worker(自動更新)、App 圖示,
  iPhone/Android 可加入主畫面。
- **首頁**:病歷號輸入(大字體、數字鍵盤、8 碼自動查詢)→ 顯示病人基本資料卡
  (目前為寫死的假資料,`TODO(FHIR)` 標注待接院內 FHIR R4 API);
  「拍照/錄影/查詢報告」三大按鈕(錄影、查詢報告為佔位頁)。
- **拍照**:後鏡頭即時取景拍照、相簿選取備援、多張縮圖列表、單張刪除、
  每張一行註記、確認上傳(模擬,存於瀏覽器記憶體)、上傳成功摘要頁、
  相機權限遭拒時的中文引導。

## 檔案結構

```
bedside-echo/
├── index.html                  # HTML 入口(zh-TW、iOS PWA meta)
├── vite.config.ts              # Vite + PWA manifest + HTTPS 開發憑證邏輯
├── scripts/generate-icons.mjs  # App 圖示產生器(免外部繪圖工具)
├── public/icons/               # 產生的 PNG 圖示(192/512/maskable/apple-touch)
├── certs/                      # (gitignored)mkcert 開發憑證放這裡
└── src/
    ├── main.tsx                # 進入點(Router + ExamProvider)
    ├── App.tsx                 # 路由表
    ├── index.css               # 手機優先樣式
    ├── types.ts                # Patient / ExamPhoto / CompletedExam 型別
    ├── data/mockPatients.ts    # 虛構病人資料 + 模擬 FHIR 查詢(TODO(FHIR))
    ├── store/ExamContext.tsx   # 記憶體內狀態:病人、照片、已上傳紀錄
    ├── components/PatientCard.tsx
    └── pages/
        ├── HomePage.tsx        # 病歷號查詢 + 三大按鈕
        ├── CameraPage.tsx      # 取景拍照/相簿選取/註記/模擬上傳
        ├── UploadSuccessPage.tsx
        └── PlaceholderPage.tsx # 錄影、查詢報告佔位
```

## 開發階段規劃

1. ✅ 拍照上傳介面(本階段)
2. 錄影上傳
3. 常用片語面板
4. 語音轉文字
5. 後端與 FHIR 介接
6. 簽收流程

詳細背景見 repo 根目錄的 `CLAUDE.md`。
