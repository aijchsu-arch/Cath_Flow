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

## 目前功能(第一~三階段)

- **PWA**:manifest(繁中)、Service Worker(自動更新)、App 圖示,
  iPhone/Android 可加入主畫面。
- **首頁**:病歷號輸入(大字體、數字鍵盤、8 碼自動查詢)→ 顯示病人基本資料卡
  (目前為寫死的假資料,`TODO(FHIR)` 標注待接院內 FHIR R4 API);
  「拍照/錄影/查詢報告」三大按鈕(查詢報告為佔位頁)。
- **拍照**:後鏡頭即時取景拍照、相簿選取備援、縮圖列表、單張刪除、
  每張一行註記、相機權限遭拒時的中文引導。
- **錄影**:MediaRecorder 後鏡頭無聲錄影(不錄音以減少容量,故只需相機權限)、
  紅點+mm:ss 計時、單段上限 60 秒自動停止(`MAX_RECORDING_SECONDS` 可調)、
  iOS Safari 錄出 mp4/H.264、Android Chrome 錄出 webm 皆可正確回放、
  不支援 MediaRecorder 時自動改用「從相簿選取影片」(`capture` 會開內建相機)、
  影片縮圖(第一幀)+長度+檔案大小、點縮圖全螢幕回放。
- **檢查紀錄整合**:同一次檢查(同病歷號 session)的照片與影片合併為一筆紀錄,
  總大小統計、超過 200MB 警告(`TOTAL_SIZE_WARN_BYTES` 可調);
  確認上傳(模擬,存於瀏覽器記憶體)後,摘要頁顯示照片張數/影片段數/總大小。
  真實上傳介面已定義於 `services/uploadService.ts`(`ExamUploadService`),
  之後以分段上傳+續傳實作替換(見 `TODO(上傳)`)。
- **常用片語與報告**:內建片語庫(LV function/瓣膜/心包膜,分類中英並列、
  片語英文,見 `data/phraseLibrary.ts`);個人自訂片語可新增/編輯/刪除、
  選擇歸屬分類,存 localStorage 依模擬使用者 ID(`TODO(帳號)` 之後綁
  HIS 帳號存後端跨裝置同步);片語兩個入口 —— 每個媒體項目的「片語」鈕
  (附加後報告標注 [Image 1]/[Video 2],與縮圖上的編號一致)、
  報告頁的水平滑動分類選單(點選加入、再點取消);報告自動彙整
  (依分類列出 Findings),內文可完整編輯,編輯後點片語改為插入
  游標位置或文末、取消片語從內文移除該句,絕不覆蓋已編輯內容;
  「重新產生」可放棄手動編輯重新彙整;報告與媒體同筆紀錄一起上傳,
  成功頁顯示報告全文預覽。

### 手機實測注意(錄影)

- **iPhone**:需 iOS **14.3 以上**的 Safari 才支援 MediaRecorder(錄出 mp4/H.264);
  更舊版本會自動顯示「從相簿選取影片」備援。實測請確認手機未開低電量模式
  (可能影響相機影格率)。
- **Android**:Chrome 錄出 webm(VP8/VP9)。錄出的 webm 中繼資料沒有長度
  (duration=Infinity),App 內已處理,回放與長度顯示皆正常。

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
    ├── constants.ts            # 錄影上限 60s、大小警告 200MB、位元率(可調)
    ├── types.ts                # Patient / ExamMedia / PhraseRef / CompletedExam
    ├── data/mockPatients.ts    # 虛構病人資料 + 模擬 FHIR 查詢(TODO(FHIR))
    ├── data/phraseLibrary.ts   # 內建片語庫(分類中英並列,之後增修改此檔)
    ├── services/uploadService.ts # 上傳服務介面 ExamUploadService + 模擬實作
    │                             #(TODO(上傳):分段上傳、續傳)
    ├── store/ExamContext.tsx   # 記憶體內狀態:病人、媒體、報告草稿、已上傳紀錄
    ├── store/PhraseContext.tsx # 個人自訂片語 CRUD + localStorage(TODO(帳號))
    ├── hooks/useCameraStream.ts  # 共用相機取景 + 權限錯誤中文引導
    ├── utils/format.ts         # 檔案大小 / mm:ss 格式化
    ├── utils/videoMeta.ts      # 影片長度與第一幀縮圖(含 webm Infinity 處理)
    ├── utils/report.ts         # 媒體編號(Image/Video N)與報告自動彙整
    ├── components/
    │   ├── PatientCard.tsx
    │   ├── MediaList.tsx       # 媒體列表、註記、片語附加、刪除、回放、大小警告
    │   └── PhrasePicker.tsx    # 片語面板:分類水平滑動 + chips + 自訂片語管理
    └── pages/
        ├── HomePage.tsx        # 病歷號查詢 + 三大按鈕
        ├── CameraPage.tsx      # 取景拍照/相簿選取
        ├── VideoPage.tsx       # MediaRecorder 錄影/相簿選取影片
        ├── ReportPage.tsx      # 片語選單 + 報告編輯 + 確認上傳
        ├── UploadSuccessPage.tsx
        └── PlaceholderPage.tsx # 查詢報告佔位
```

## 開發階段規劃

1. ✅ 拍照上傳介面
2. ✅ 錄影上傳
3. ✅ 常用片語面板與報告生成(本階段)
4. 語音轉文字
5. 後端與 FHIR 介接
6. 簽收流程

詳細背景見 repo 根目錄的 `CLAUDE.md`。
