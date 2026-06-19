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

## 自動化任務（2026-06-16 更新：取消出街延遲，生成完即顯示）
| 時間 | 任務 | ID | 備註 |
|------|------|----|------|
| 08:00 | 早上新聞撮要 | automation-1780281485638 | HTML → GitHub Pages → GDrive → GAS |
| ~~08:00~~ | ~~宣傳圖~~ | ~~automation-1780353918149~~ | **已暫停** |
| 08:30 | 潛在客戶情報 | automation-1781556049697 | Lead評分+Cold Email（✏️編輯/💾保存/📧發送）|
| 09:00 | 香港及世界活動+🌍全球活動花絮 | automation-1781547183025 | Lead評分+Cold Email（✏️編輯/💾保存/📧發送）|
| 10:00 | 各界標書情報 | automation-1781542095309 | 含🏛️已批出項目投標價 section |
| 11:00 | 天使投資情報 | automation-1781510636701 | HTML → GitHub Pages → GAS |
| 13:00 | AI 情報 | automation-1780650857961 | Xcode27/鴻蒙7/可靈AI等 |
| 14:00 | 板塊追蹤 | automation-1780543582096 | Pro 版 HTML |
| 17:00 | 下午新聞撮要 | automation-1780542695654 | HTML → GitHub Pages → GDrive → GAS |
| 19:00 | 美股分析報告 | automation-1780253895980 | Pro 版白底模板 → GitHub Pages → GDrive → GAS |
| 23:00 | 每晚對話總結與記憶寫入 | automation-1780257155139 | |

## GAS Dashboard 系統
- **GAS Web App URL**: `https://script.google.com/macros/s/AKfycbw_UeOLvsktIsdYEAHG2fJ2JxktsmdORGtnkEn4leyamj7fD602djoFexgrNNiCUDMv/exec`
- **Dashboard 網址**：`https://dash.vigoradv.com/`（CNAME `dash` → `eventeasynet.github.io`）
- **appsscript.json**：`executeAs: USER_DEPLOYING` + `access: ANYONE_ANONYMOUS`
- **clasp 部署**：edit `程式碼.js` → `clasp push` → `clasp deploy -d "描述"`
- **手機響應式**：桌面左 Sidebar → 手機頂部 Tab Bar + 底部 Sticky Footer
- **強制規則**：改動後必須 `git add + commit + push`

## Google Drive 資料夾
- 主資料夾：EventEasynet_Promo (17mAnC_4KVjjwVI481dTZJuUVjuqLQ2z0)
  - `01_宣傳圖_每日生成` (1DwMG0WE5wMxBnGD7lfxtnQsptfA42u7I)
  - `02_美股報告_每日生成` (1gqLd0GGwDFEyw658ucWiUMqkeEPz5Mz2)
  - `03_新聞撮要_每日生成` (188Q0SexFhgY6i9FbLKL9XI_0q7Xw_bAe)
- MCP：@sowonai/mcp-google-drive，認證帳戶 eventeasynet@gmail.com
- **強制規則**：上傳後必須設為公開；driveUrl 必須用 GitHub Pages 連結；必須生成 HTML

## GAS 標題格式規則
| 類型 | 標題格式 | type 值 |
|------|---------|---------|
| 上午新聞 | 📰 上午新聞 - M月D日 | 新聞撮要 |
| 下午新聞 | 🌇 下午新聞 - M月D日 | 新聞撮要 |
| 美股報告 | 📈 美股分析報告 - M月D日 | 美股報告 |
| 板塊追蹤 | 📊 板塊追蹤 - M月D日 | 美股追蹤 |
| AI情報 | 📡 AI情報 - M月D日 | AI情報 |
| 天使投資 | 👼 天使投資情報 - M月D日 | 天使投資 |
| 各界標書 | 📋 各界標書情報 - M月D日 | 各界標書 |
| 香港及世界活動 | 🎪 香港及世界活動 - M月D日 | 香港及世界活動 |
| 潛在客戶 | 🎯 潛在客戶情報 - M月D日 | 潛在客戶 |
- **type 欄位絕對不能加額外字眼**（如「新聞」），否則 Dashboard tab 誤顯示

## 強制規則合集

### 新聞撮要
- 本港新聞至少5條（社會民生至少2條），中國新聞至少3條（社會/政策至少1條）
- 必須包含「🇨🇳 中國新聞」section
- 必須用 WebFetch 抓取星島日報/香港01等港聞網站

### 板塊追蹤/持股分析
- 必須是 Pro 版（_Stock_Tracking_Pro / _Stock_Report_Pro）
- Pro 版必備：Chart.js 圖表、綠色漸變 header、分析師標籤、股票 badge、目標價

### 各界標書
- 優先搜索香港市場（至少50%），香港來源：eTender/政府新聞公報/貿發局
- 必須包含「🖥️ 系統開發標書」section
- 六大類別：廣告投放/影視製作/平面廣告/AI項目/微劇/系統開發
- **🏛️ 已批出項目參考 section**（2026-06-16 新增）：搜尋已批出項目的中標金額，至少3條，金色 badge 高亮

### 香港及世界活動
- 盡量找聯絡電郵，七大類別：商會/晚會/畢業/婚禮/演唱會/戶外/戶內
- Lead 評分：🔥 500+人 / ⚡ 100-500人 / 📝 <100人
- Cold Email：繁體中文+英文雙語，存在 data-email-zh / data-email-en
- 全球活動花絮是子 section（紫色 #8b5cf6）

### 潛在客戶情報
- 生成推廣郵件前必須先用 WebFetch 讀取 https://eventeasy.net/guide_V1
- ❌ 不能提及：白標服務/API對接/現場技術支持
- ❌ 不要標明人數（用「大量參與者」等描述）
- ❌ 署名不要用「創辦人」→ ✅ 用「EventEasy.net 團隊」
- 聯絡電郵用 eventeasynet@gmail.com

### 電郵編輯/保存/發送功能（潛在客戶 + 香港及世界活動共用）
- ✏️ 編輯：toggleEdit() 切換 pre ↔ textarea
- 💾 保存：saveEdit() POST 到 GAS API（text/plain 避免 CORS preflight），更新 GDrive + GitHub Pages
- 📧 發送：sendEmail() mailto: 開郵件客戶端，過長則複製到剪貼簿
- `<body>` 需 data-drive-file-id 和 data-github-path 屬性
- GAS doPost 已支援 update_html action（v55）

## 技術限制筆記
- macOS `~/Library/CloudStorage/` 受 SIP 保護 → 用 Google Drive MCP
- 宣傳圖：SVG + Resvg（Pillow 畫中文字體會爛）
- JS 語法檢查：改動後必須 `node --check` 驗證，`` `'' `` 嵌用必須 escape
- HTML 結構：`<div>` 不能放進 `<table>`/`<tbody>`/`<tr>` 裡面
- JS loop：物件屬性必須在 `if (!groups[key])` 分支內 set，避免 loop 覆蓋
- GAS CORS workaround：用 `Content-Type: text/plain` 避免 preflight OPTIONS
- **renderReport fallback URL 順序重要**：「香港及世界活動」必須在「活動花絮」之前，否則被搶匹配（2026-06-17 修復）
- **GAS writeActions 陣列**：必須包含 `update_url` / `update_notes`，否則 GET 調用報 Unknown action（2026-06-17 修復 v56）
- **GAS add/delete 用 GET + URL-encode**：handler 讀 `e.parameter` 而非 `e.postData`，POST JSON 會返回 Google Docs HTML 404，要 GET + URL-encode（2026-06-19 教訓）
- **自動化重複記錄**：每次自動化可能產生重複 GAS 記錄（driveUrl 為空），需定期清理

## 待修問題
- **Google Drive OAuth refresh_token 過期**（2026-06-11 起）：所有 GDrive 備份失敗 `invalid_grant`，需用戶手動重新授權或改用 Service Account

## 2026-06-19 經驗
- 龍舟賽 50 週年（6/27-28，尖東海濱）是高潛力 Lead
- LEAP East 7/8-10 係新確認嘅亞太旗艦科技展
- WikiEXPO HK 7/23-24 確認喺 Hopewell Hotel
- 雋傑國際展覽 1990 年成立，主辦過 80+ 展覽
