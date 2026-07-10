# Whisper 語音辨識服務架設(口述報告用)

口述報告功能需要一個 Whisper 語音辨識服務。開發測試階段在自己的電腦
(或虛擬機)上架;院內正式部署時由資訊室在院內伺服器架同一套,
語音檔全程不出院內網路。

## 一、最快的架法:Docker(電腦裝 Docker Desktop 即可,不一定要 VM)

```bash
docker run -d --name whisper -p 8000:8000 \
  ghcr.io/speaches-ai/speaches:latest-cpu
```

- [speaches](https://github.com/speaches-ai/speaches)(前身 faster-whisper-server)
  提供與 OpenAI Audio API 相容的 `POST /v1/audio/transcriptions` 端點。
- 第一次辨識時會自動下載模型(預設用 App 指定的
  `Systran/faster-whisper-small`,約 500MB),稍等即可。
- CPU 版對「幾秒~幾十秒的口述」足夠;正式多人使用再評估 GPU。

### 在 Ubuntu 虛擬機架(若偏好 VM)

VM 規格建議:4 核 CPU、8GB RAM、10GB 硬碟,網路用**橋接模式**
(讓 VM 拿到跟電腦同網段的 IP,方便代理轉發)。

```bash
sudo apt update && sudo apt install -y docker.io
sudo docker run -d --name whisper -p 8000:8000 \
  ghcr.io/speaches-ai/speaches:latest-cpu
ip addr   # 記下 VM 的區網 IP,例如 192.168.1.30
```

## 二、驗證服務活著

```bash
# 健康檢查(回 OK 就是活著)
curl http://localhost:8000/health

# 實際轉一段音檔(換成任一 wav/m4a/webm 檔)
curl -F file=@test.m4a -F model=Systran/faster-whisper-small \
  -F language=zh http://localhost:8000/v1/audio/transcriptions
```

## 三、讓 App 連上 Whisper

前端一律呼叫相對路徑 `/api/stt/...`,由 Vite 開發伺服器代理轉發
(手機的 HTTPS 頁面不能直接打 `http://IP:8000`,會被 mixed content 擋):

```bash
cd bedside-echo

# Whisper 跑在本機 Docker(預設 127.0.0.1:8000)→ 直接啟動即可
npm run dev

# Whisper 跑在 VM(例如 192.168.1.30)→ 用環境變數指過去
WHISPER_URL=http://192.168.1.30:8000 npm run dev
```

手機連同一 Wi-Fi,開開發伺服器的 Network 網址(https://電腦IP:5173),
進報告頁按「🎤 口述加入報告」測試。

> **注意**:Vercel 網址測不了口述——它在公網,連不到你家/院內的
> Whisper。語音功能一律用本機開發伺服器實測,其他功能照常用 Vercel。

## 四、調整與除錯

| 問題 | 處理 |
|---|---|
| 中英夾雜辨識不準 | 把 `src/constants.ts` 的 `STT_MODEL` 換成 `Systran/faster-whisper-medium` 或 `deepdml/faster-whisper-large-v3-turbo-ct2`(較慢但準) |
| 專有名詞認不得 | 編輯 `src/services/sttService.ts` 的 `ECHO_VOCABULARY_PROMPT`,加入常用詞 |
| 「無法連線」錯誤 | 確認 `docker ps` 有 whisper 容器、`curl /health` 通、`WHISPER_URL` 指對 IP、VM 防火牆放行 8000 |
| 辨識逾時 | 口述縮短一點;或機器太慢,換小一號模型 |

## 五、院內正式部署(第五階段一併處理)

- 資訊室在院內伺服器跑同一個容器(建議配 GPU 版
  `ghcr.io/speaches-ai/speaches:latest-cuda`,多人同時口述才順)。
- 前端部署的網站伺服器(nginx 等)設定反向代理:
  `location /api/stt/ { proxy_pass http://院內whisper:8000/; }`
  —— 前端程式碼**不用改任何一行**。
