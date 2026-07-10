import { STT_MODEL, STT_PROXY_PATH } from '../constants'

/**
 * 語音轉文字服務(口述報告用)。
 * 介面與 OpenAI Audio API 相容,後端為院內自建 Whisper
 * (開發測試:本機/VM 跑 speaches 容器,見 docs/whisper-setup.md)。
 * 語音檔只送到 STT_PROXY_PATH 代理的院內端點,不出外網。
 */
export interface SttService {
  /** 回傳辨識出的文字;失敗丟出帶中文訊息的 Error */
  transcribe(audio: Blob): Promise<string>
}

/**
 * Whisper 的 initial_prompt:先塞入心超常用詞彙(中英),
 * 提高專有名詞與中英夾雜口述的辨識率。
 */
const ECHO_VOCABULARY_PROMPT =
  'Bedside echocardiography report. LVEF, RWMA, aortic stenosis, ' +
  'mitral regurgitation, tricuspid regurgitation, pericardial effusion, ' +
  'E/A ratio, TAPSE, IVC, 左心室收縮功能, 主動脈瓣狹窄, 二尖瓣逆流, ' +
  '三尖瓣逆流, 心包膜積液, 建議安排正式心臟超音波.'

const TRANSCRIBE_TIMEOUT_MS = 60_000

export const whisperSttService: SttService = {
  async transcribe(audio: Blob): Promise<string> {
    const form = new FormData()
    // 副檔名依實際錄音格式(iOS 為 audio/mp4,Android 為 audio/webm)
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('webm') ? 'webm' : 'wav'
    form.append('file', audio, `dictation.${ext}`)
    form.append('model', STT_MODEL)
    form.append('language', 'zh')
    form.append('prompt', ECHO_VOCABULARY_PROMPT)
    form.append('response_format', 'json')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`${STT_PROXY_PATH}/v1/audio/transcriptions`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('語音辨識逾時,請縮短口述長度或確認 Whisper 伺服器負載')
      }
      throw new Error(
        '無法連線到語音辨識服務。請確認 Whisper 伺服器已啟動' +
          '(見 docs/whisper-setup.md),且以本機開發伺服器測試(Vercel 網址無法連到區網的 Whisper)',
      )
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`語音辨識服務回應錯誤(HTTP ${res.status})${detail ? `:${detail.slice(0, 120)}` : ''}`)
    }
    const data = (await res.json()) as { text?: string }
    return (data.text ?? '').trim()
  },
}

/** 目前使用的語音辨識服務(院內正式部署時仍為 Whisper,只換端點) */
export const sttService: SttService = whisperSttService
