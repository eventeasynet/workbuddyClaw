# 長期記憶 - WorkBuddy Claw

## 使用者偏好
- **語言**：繁體中文（香港用戶）
- **工作模式**：經常不在電腦旁，希望盡量自動化
- **溝通風格**：喜歡簡潔直接的回覆
- **資料存儲偏好**：希望檔案能放到 Google Drive 方便手機查看

## 使用者背景
- 公司開發了 EventEasy.net（網上報名系統）
- 關注美股投資（特別關注富途牛牛 FUTU、向上融科）
- Google Drive 帳號：dickli.kw@gmail.com、home.vigoradv@gmail.com、EventEasynet@gmail.com

## 自動化任務
| 時間 | 任務 | 任務 ID | 備註 |
|------|------|---------|------|
| 08:00生成→10:00出街 | 每日早上新聞撮要 | automation-1780281485638 | 生成 HTML → GitHub Pages → GDrive 備份 → GAS 已確認 |
| 08:00生成→10:00出街 | EventEasy 宣傳圖每日 3 選項 | automation-1780353918149 | 3 款風格 → GDrive → GAS 待確認（需人手揀選） |
| 10:00生成→12:00出街 | 每日活動花絮 | automation-1780476184986 | 搜尋全球活動 → GAS 待確認 → 排隊出街 |
| 08:30生成→09:00出街 | 潛在客戶情報 | automation-1781556049697 | 搜尋大學/商會/活動策劃公司/社福/體育/文化藝術 → Lead 評分 + Cold Email → HTML → GitHub Pages → GAS 已確認 |
| 09:00生成→09:30出街 | 香港及世界活動 | automation-1781547183025 | 搜羅商會/晚會/婚禮/演唱會/戶外戶內活動 → Lead 評分 + Cold Email → HTML → GitHub Pages → GAS 已確認 |
| 10:00生成→10:30出街 | 各界標書情報 | automation-1781542095309 | 搜羅廣告投放/影視製作/平面廣告/AI/微劇/系統開發標書 → HTML → GitHub Pages → GAS 已確認 |
| 11:00生成→11:30出街 | 天使投資情報 | automation-1781510636701 | 搜羅天使投資項目/基金動態/行業趨勢 → HTML → GitHub Pages → GAS 已確認 |
| 13:00生成→15:00出街 | AI 情報 | （新）| Xcode27 / 鴻蒙7 / 可靈AI 等 |
| 14:00生成→15:00出街 | 板塊追蹤 | automation-1780543582096 | HTML 化（2026-06-12 改，不再只存 notes） |
| 17:00生成 | 下午新聞撮要 | automation-1780542695654 | HTML → GitHub Pages → GDrive 備份 → GAS 已確認 |
| 19:00生成→21:00出街 | 美股分析報告 | automation-1780253895980 | **白底模板**（2026-06-12 改）→ GitHub Pages → GDrive 備份 → GAS 已確認 |
| 每晚 23:00 | 每晚對話總結與記憶寫入 | automation-1780257155139 | |

## Google Drive MCP（2026-06-02 設定）
- 使用 @sowonai/mcp-google-drive 繞過 macOS CloudStorage SIP 限制
- Google Cloud 專案：workbuddy-gdrive-498212（OAuth client_id: 61592320366-...）
- 認證帳戶：eventeasynet@gmail.com
- MCP config：~/.workbuddy/.mcp.json
- 可用工具：listFiles, uploadFile, downloadFile, createFolder, deleteFile, moveFile, getFileDetails, shareFile
- ✅ 讀寫測試通過
- ⚠️ MCP 有時 disconnected，備用方案：直接 Python API（gdrive_upload.py）

### ⚠️ 新聞撮要強制規則（2026-06-15 新增，長期問題！）
- **港聞及中國新聞是核心！** 每日必須了解身邊發生什麼事
- 本港新聞至少5條，其中社會民生至少2條（唔可以只有恆指/新股！）
- 中國新聞至少3條，其中社會/政策至少1條（唔可以只有財經！）
- 必須包含「🇨🇳 中國新聞」section（唔可以冇！）
- 搜尋時必須用 WebFetch 抓取星島日報/香港01等港聞網站，確保有真正本地新聞
- 08:00 和 17:00 自動化已更新，強制遵循以上規則

### ⚠️ 板塊追蹤/持股分析強制規則（2026-06-13 新增）
- 板塊追蹤必須是 Pro 版（_Stock_Tracking_Pro.html）
- 持股分析必須是 Pro 版（_Stock_Report_Pro.html）
- Pro 版必備元素：Chart.js 圖表、綠色漸變 header、分析師標籤、股票 badge、目標價
- Dashboard 只會載入 Pro 版，基本版不會被 Dashboard 使用
- 19:00 自動化唔可以生成 Stock_Tracking（只生成持股分析 Pro 版）
- 14:00 自動化負責生成板塊追蹤 Pro 版

### ⚠️ 各界標書強制規則（2026-06-16 新增）
- **優先搜索香港市場標書**，香港內容應佔至少 50%
- 必須包含「🛥️ 系統開發標書」section（IT系統開發/軟件開發/數碼轉型項目）
- 六大類別：廣告投放/影視製作/平面廣告/AI項目/微劇/系統開發
- 香港標書來源：eTender Hong Kong、政府新聞公報、貿發局採購資訊
- 10:00 自動化已更新，強制遵循以上規則

- **根本原因 1**：上傳檔案後預設為「私有」，用戶點連結會看到「允許Google存取你必要的Cookie」+ 登入牆
- **根本原因 2**：Google Drive 不會渲染 HTML，只顯示原始碼（用戶誤以為是 MD 格式）
- **修復**：
  - gdrive_upload.py 已加入 share_file() 自動設為 type=anyone, role=reader
  - **所有 HTML 報告的 driveUrl 必須用 GitHub Pages 連結**（唔好用 Drive 連結！）
  - Google Drive 只作備份用途，不能作為展示 HTML 的方式
- **強制規則**：
  - 每次上傳 Google Drive 後必須設為公開
  - GAS driveUrl 必須用 GitHub Pages 連結（https://eventeasynet.github.io/workbuddyClaw/news/...）
  - 必須生成 HTML（唔係 MD）—— 呢個係長期出現嘅問題

### Google Drive 資料夾
- 主資料夾：EventEasynet_Promo (fileId: 17mAnC_4KVjjwVI481dTZJuUVjuqLQ2z0)
  - `01_宣傳圖_每日生成` (1DwMG0WE5wMxBnGD7lfxtnQsptfA42u7I)
  - `02_美股報告_每日生成` (1gqLd0GGwDFEyw658ucWiUMqkeEPz5Mz2)
  - `03_新聞撮要_每日生成` (188Q0SexFhgY6i9FbLKL9XI_0q7Xw_bAe)

## GAS Dashboard 系統（2026-06-03 建立）
- **GAS Web App v42**：GET-only + JSONP，支援 status 參數（待確認/已確認）+ list_confirmed
- URL: `https://script.google.com/macros/s/AKfycbw_UeOLvsktIsdYEAHG2fJ2JxktsmdORGtnkEn4leyamj7fD602djoFexgrNNiCUDMv/exec`
- **appsscript.json 正確配置**：`executeAs: USER_DEPLOYING` + `access: ANYONE_ANONYMOUS`（2026-06-05 修復，之前錯誤改成 USER_DEPLOYER + ANYONE 導致全部 API 要登入）
- **Dashboard 網址**：`https://dash.vigoradv.com/`（2026-06-12 啟用 custom domain，原為 `https://eventeasynet.github.io/workbuddyClaw/`）
- **⚠️ Custom Domain 設定**：
  - `CNAME` 檔案內容：`dash.vigoradv.com`
  - DNS：CNAME `dash` → `eventeasynet.github.io`
  - `fixDriveUrl()` 將 `eventeasynet.github.io/workbuddyClaw/` 替換為 `dash.vigoradv.com/`
  - ⚠️ 唔好用 `http://`（github.io 301 重定向會去 http）→ 必須用 `https://`
- **⚠️ 強制規則**：任何 Dashboard 改動後，必須 `git add + commit + push`，因為用戶在 Browser 看 GitHub Pages，唔推就睇唔到新版本
- **⚠️ 活動花絮過濾規則**：`loadEvents()` 只顯示 `status=null` 或 `status=待確認` 的項目，已排隊（待出街）或已出街的會在出街記錄顯示，不會在活動花絮重複
- 美/新聞：自動確認 → GAS 已確認 → Dashboard 直接顯示
- 宣傳圖：待確認 → Dashboard 揀選 → 確認後推送
- **clasp 自動部署**：edit `程式碼.js` → `clasp push` → `clasp deploy -d "描述"`（唔使用戶手動）
- **⚠️ Dashboard 手機響應式（2026-06-12 改）**：
  - 桌面：左邊 Sidebar（新聞/AI/股票/天使投資/各界標書）
  - 手機（< 768px）：頂部 Tab Bar + 底部 Sticky Footer 自動化面板
  - 已加入 `.mobile-footer` + `toggleMobileFooter()` JS

### ⚠️ GAS 標題格式規則（2026-06-09 修復，強制遵循！）
- **所有自動化生成的 GAS 記錄標題必須嚴格遵循統一格式：**
  - 上午新聞：`📰 上午新聞 - M月D日`（type: 新聞撮要）
  - 下午新聞：`🌇 下午新聞 - M月D日`（type: 新聞撮要）
  - 美股報告：`📈 美股分析報告 - M月D日`（type: 美股報告）
  - 板塊追蹤：`📊 板塊追蹤 - M月D日`（type: 美股追蹤）
  - AI情報：`📡 AI情報 - M月D日`（type: AI情報）
  - 天使投資：`👼 天使投資情報 - M月D日`（type: 天使投資）
  - 各界標書：`📋 各界標書情報 - M月D日`（type: 各界標書）
  - 香港及世界活動：`🎪 香港及世界活動 - M月D日`（type: 香港及世界活動）
  - 潛在客戶情報：`🎯 潛在客戶情報 - M月D日`（type: 潛在客戶）
- **⚠️ type 欄位絕對不能包含額外字眼！**
  - 新聞：只能用「新聞撮要」，唔好加其他字
  - AI情報：只能用「AI情報」，唔好加「新聞」字眼（否則 Dashboard 新聞 tab 會誤顯示）
  - 美股：只能用「美股報告」或「美股追蹤」
  - 天使投資：只能用「天使投資」（唔好加「新聞」字眼）
  - 各界標書：只能用「各界標書」（唔好加「新聞」字眼，否則 Dashboard 各界標書 tab 會誤顯示或遺漏）
  - 香港及世界活動：只能用「香港及世界活動」（唔好加「新聞」字眼，否則 Dashboard 活動 tab 會誤顯示或遺漏）
  - 潛在客戶：只能用「潛在客戶」（唔好加「新聞」字眼，否則 Dashboard 潛在客戶 tab 會誤顯示或遺漏）
- **⚠️ Dashboard 按日期分組**：新聞 tab 按 M月D日 分組，每組顯示上午+下午+AI；美股 tab 按 M月D日 分組，每組顯示持股分析+板塊追蹤；天使投資 tab 按 M月D日 分組；各界標書 tab 按 M月D日 分組；香港及世界活動 tab 按 M月D日 分組；潛在客戶情報 tab 按 M月D日 分組
- **⚠️ 板塊追蹤 notes 要簡短（限 200 字）**，因為 GAS URL encode 後過長會失敗

### ⚠️ 各界標書強制規則（2026-06-16 新增）
- **優先搜索香港市場標書**，香港內容應佔至少 50%
- 必須包含「🖥️ 系統開發標書」section（IT系統開發/軟件開發/數碼轉型項目）
- 六大類別：廣告投放/影視製作/平面廣告/AI項目/微劇/系統開發
- 香港標書來源：eTender Hong Kong、政府新聞公報、貿發局採購資訊
- 10:00 自動化已更新，強制遵循以上規則

### ⚠️ 香港及世界活動強制規則（2026-06-16 新增）
- **盡量找活動的聯絡電郵**，放在 event-contact 區塊，方便用戶將 EventEasy.net 介紹給對方
- 七大類別：商會聚會/晚會慶典/畢業相關/婚禮相關/演唱會表演/戶外活動/戶內活動
- 每個 section 至少 2 條內容
- 09:00 自動化已建立，強制遵循以上規則
- **重點推廣機會**：Jewellery & Gem ASIA、Learning & Teaching Expo、大學畢業典禮（11-12月）
- **Lead 評分**：🔥 500+ 人（高優先）、⚡ 100-500 人（中優先）、📝 <100 人（低優先）
- **Cold Email**：每個活動必須生成推廣電郵草稿（繁體中文 + 英文雙語），預先生成好存在 HTML 的 `data-email-zh` 和 `data-email-en` 屬性裡

### ⚠️ 潛在客戶情報強制規則（2026-06-16 新增）
- **優先搜索香港潛在客戶**，香港內容應佔至少 50%
- 六大類別：大學/中學/商會/活動策劃公司/社福機構/體育會/文化藝術（共 6 類）
- 每個 lead 必須有聯絡電郵（如果搵唔到，標記為「未搵到電郵」）
- **Lead 評分**：🔥 500+ 人（高優先）、⚡ 100-500 人（中優先）、📝 <100 人（低優先）
- **Cold Email**：每個 lead 必須生成推廣電郵草稿（繁體中文 + 英文雙語），預先生成好存在 HTML 的 `data-email-zh` 和 `data-email-en` 屬性裡
- 08:30 自動化已建立，強制遵循以上規則
- **重點推廣時機**：大學畢業典禮（11-12月）需提前 4-5 個月聯絡（即係而家 6 月要開始搵客）

## 技術限制筆記
- macOS `~/Library/CloudStorage/` 受 SIP 保護，第三方程序無法直接寫入 → 已改用 Google Drive MCP
- Homebrew 需要 chown 權限才能安裝套件
- PDF 生成最佳方案：Node.js `markdown-pdf`（已驗證可用）
- 系統有 Node.js 可用，npm install 在沙盒內正常運作
- **宣傳圖生成**：用 SVG + Resvg（不能直接 Pillow 畫中文，字體會爛）
  - Resvg 渲染中文字完美（用系統字體）
  - Playwright/qmanage/WeasyPrint 在沙盒內無法使用
  - **render_promo_v2.js**：三款不同設計風格（Hero Banner / 數據對比 / 知識貼士）
  - 每日自動生成 3 選項，全部待確認，用戶從 Dashboard 揀選
- ⚠️ **JS 語法錯誤檢查（2026-06-07 教訓）**：
  - 每次改動 HTML/JS 後，必須用 `node --check` 驗證整體語法
  - `` `` 同 `''` 嵌用時，內層 quote 必須 escape（`\'`），否則成個 script block 靜默失敗
  - 語法錯誤冇 runtime 提示（除非開 browser console），onclick 全部失效
- ⚠️ **HTML 結構錯誤（2026-06-09 教訓）**：
  - `<div>` 絕對不能放進 `<table>` / `<tbody>` / `<thead>` / `<tr>` 裡面
  - 之前把日期分組卡片 `<div>` 塞進 `<table id="news-table">` 導致瀏覽器渲染錯亂，日期分組失效
  - **解決**：需要動態生成多組內容時，外層容器必須用 `<div>`，不能用 `<table>`
- ⚠️ **JS 物件建立 vs loop 覆蓋（2026-06-10 教訓）**：
  - 當你在 `forEach` 入面建立 group object，要 set 嘅 property（如 `dateLabel`）**必須喺 `if (!groups[key])` 分支入面 set**，絕對唔可以喺 `forEach` 主體入面無條件覆蓋
  - 否則最後一個 item 會覆蓋成個 group 嘅值（bug 特徵：所有項目都顯示同一個 Tag / 同一個標籤）
  - 正確寫法：`if (!groups[key]) { groups[key] = { dateLabel: label, items: [] }; }` ← 只喺建立嗰陣 set 一次
  - 錯誤寫法：`groups[key].items.push(item); groups[key].dateLabel = xxx;` ← 每次 loop 都覆蓋，產生 bug

## Buffer API（2026-06-04 凌晨修復）
- **Buffer API 已升級為 GraphQL**（舊 REST API `api.buffer.com/1/updates/...` 已停用）
- **Endpoint**: `POST https://api.buffer.com`（GraphQL）
- **GAS `buffer_post` handler**: 使用 GraphQL mutation `createPost`
- **必需參數**: `schedulingType: automatic`, `mode: shareNow`, `channelId: "..."`
- **Facebook 必需**: `metadata: {facebook: {type: post}}`
- **API Key 來源**: `https://publish.buffer.com/settings/api`（Generate API Key）
- **⚠️ 重要**: Browser DevTools 偷到嘅 Session Token（`status-proxy.buffer.com` 用嘅）唔適用於 GraphQL API
- **有效 Token**: `7mmKJU3HkgZYNtWrbrKiel_xXtoQRpTtqAUfPDTZNR_`（已更新到 Dashboard）
- **Buffer Organization ID**: `6a1de7662d32712827f4dace`
- **Buffer Channels**:
  - Facebook Page: `6a1e74afc687a22dd44f6f6b`
  - Instagram: `6a1e6612c687a22dd44f3a6a`
  - LinkedIn: `6a1e6590c687a22dd44f37f0`

## 專案
- **EventEasy 推廣**：`/Users/home.dnea/WorkBuddy/Claw/EventEasy_Promotion/`
  - ✅ Buffer 已連接 Facebook Page / Instagram / LinkedIn
  - ✅ SVG + Resvg 圖片生成 pipeline 已建立
  - ✅ 每日 10:00 自動化已設定
  - 雲端部署連結：CloudStudio sandbox

## 記憶目錄
- 每日記憶：`/Users/home.dnea/WorkBuddy/Claw/.workbuddy/memory/YYYY-MM-DD.md`
- 長期記憶：`/Users/home.dnea/WorkBuddy/Claw/.workbuddy/memory/MEMORY.md`（本檔案）
- 自動化執行記錄：`/Users/home.dnea/WorkBuddy/Claw/.workbuddy/automations/automation-1780257155139/memory.md`

## ⚠️ 重大問題待修
- **Google Drive OAuth refresh_token 過期**（2026-06-11 起，連續第 2+ 天）：所有 GDrive 備份失敗 `invalid_grant`
  - 影響：5 個自動化嘅 GDrive 備份全部上載唔到
  - 解決方案：用戶手動重新授權 refresh_token，或改用 Service Account
