/**
 * WorkBuddy Dashboard - Google Apps Script (Web App)
 * 部署為 Web App：Execute as = Me, Access = Anyone (including anonymous)
 */

// Sheet 名稱同欄位
const SHEET_NAME = "Pending";
const COLUMNS = ["ID", "Type", "Title", "DriveURL", "Status", "CreatedAt", "ConfirmedAt", "Notes"];

/**
 * 初始化 Sheet（第一次用手動 run 一次）
 */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  sheet.setFrozenRows(1);
  // 設定欄寬
  sheet.setColumnWidth(1, 180); // ID
  sheet.setColumnWidth(2, 100); // Type
  sheet.setColumnWidth(3, 300); // Title
  sheet.setColumnWidth(4, 300); // DriveURL
  sheet.setColumnWidth(5, 100); // Status
  sheet.setColumnWidth(6, 160); // CreatedAt
  sheet.setColumnWidth(7, 160); // ConfirmedAt
  sheet.setColumnWidth(8, 200); // Notes
  SpreadsheetApp.flush();
  return "Sheet initialized: " + SHEET_NAME;
}

/**
 * GET - 讀取所有項目（俾 Dashboard 呼叫）
 */
function doGet(e) {
  const action = e.parameter.action || "list";
  
  if (action === "list") {
    const status = e.parameter.status || "all";
    const items = getItems(status);
    return jsonResponse({ success: true, items: items });
  }
  
  if (action === "list_pending") {
    const items = getItems("待確認");
    return jsonResponse({ success: true, items: items, count: items.length });
  }
  
  // 支持 GET 請求的 action=add（避免 POST 重定向問題）
  if (action === "add") {
    const type = e.parameter.type;
    const title = e.parameter.title;
    const driveUrl = e.parameter.driveUrl || "";
    const notes = e.parameter.notes || "";
    
    if (!type || !title) {
      return jsonResponse({ success: false, error: "Missing type or title" });
    }
    
    const id = "WB_" + new Date().getTime();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    
    const sheet = getSheet();
    sheet.appendRow([id, type, title, driveUrl, "待確認", now, "", notes]);
    SpreadsheetApp.flush();
    
    return jsonResponse({ success: true, id: id, message: "Item added via GET" });
  }
  
  // 翻譯 API：中文 → 英文（用 Gemini API）
  if (action === "translate") {
    const chineseText = e.parameter.chineseText || "";
    const context = e.parameter.context || ""; // 額外上下文（例如：機構名稱、活動名稱）
    
    if (!chineseText) {
      return jsonResponse({ success: false, error: "Missing chineseText" });
    }
    
    try {
      const englishText = translateChineseToEnglish(chineseText, context);
      return jsonResponse({ success: true, englishText: englishText });
    } catch (err) {
      return jsonResponse({ success: false, error: err.toString() });
    }
  }
  
  return jsonResponse({ success: false, error: "Unknown action: " + action });
}

/**
 * POST - 新增項目（俾 WorkBuddy 自動化呼叫）
 * 參數：type, title, driveUrl
 */
function doPost(e) {
  const action = e.parameter.action || "add";
  
  if (action === "add") {
    const type = e.parameter.type;
    const title = e.parameter.title;
    const driveUrl = e.parameter.driveUrl || "";
    const notes = e.parameter.notes || "";
    
    if (!type || !title) {
      return jsonResponse({ success: false, error: "Missing type or title" });
    }
    
    const id = "WB_" + new Date().getTime();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    
    const sheet = getSheet();
    sheet.appendRow([id, type, title, driveUrl, "待確認", now, "", notes]);
    SpreadsheetApp.flush();
    
    return jsonResponse({ success: true, id: id, message: "Item added" });
  }
  
  if (action === "confirm") {
    const id = e.parameter.id;
    if (!id) {
      return jsonResponse({ success: false, error: "Missing id" });
    }
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    let updated = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);
        sheet.getRange(i + 1, 5).setValue("已確認");
        sheet.getRange(i + 1, 7).setValue(now);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      // 觸發確認後嘅動作：send email notification to user
      sendConfirmationEmail(id, data);
      return jsonResponse({ success: true, message: "Item confirmed" });
    } else {
      return jsonResponse({ success: false, error: "Item not found: " + id });
    }
  }
  
  if (action === "delete") {
    const id = e.parameter.id;
    if (!id) {
      return jsonResponse({ success: false, error: "Missing id" });
    }
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true, message: "Item deleted" });
      }
    }
    
    return jsonResponse({ success: false, error: "Item not found: " + id });
  }
  
  return jsonResponse({ success: false, error: "Unknown action: " + action });
}

/**
 * 輔助函數：拎 Sheet
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    initSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  return sheet;
}

/**
 * 輔助函數：拎項目
 */
function getItems(statusFilter) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (statusFilter === "all" || row[4] === statusFilter) {
      items.push({
        id: row[0],
        type: row[1],
        title: row[2],
        driveUrl: row[3],
        status: row[4],
        createdAt: row[5],
        confirmedAt: row[6],
        notes: row[7]
      });
    }
  }
  
  return items;
}

/**
 * 輔助函數：JSON 回應
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 翻譯函數：中文 → 英文（用 Gemini API）
 * 注意：需要在 Google Apps Script 編輯器中設置 Script Property：GEMINI_API_KEY
 */
function translateChineseToEnglish(chineseText, context) {
  // 從 Script Properties 讀取 API key
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Please set it in Script Properties.');
  }
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  
  const prompt = `你是一個專業的英文商務郵件撰寫助手。請將以下繁體中文郵件內容翻譯並改寫為專業的英文商務郵件。

${context ? '上下文：' + context : ''}

要求：
1. 保持專業、禮貌的商務語氣
2. 準確傳達中文內容的所有要點
3. 使用正确的英文商務郵件格式
4. 署名使用 "The EventEasy.net Team"

中文內容：
${chineseText}

請只返回英文郵件內容，不要加入任何解釋或註釋。`;
  
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid API response: ' + JSON.stringify(data));
    }
  } catch (err) {
    throw new Error('Gemini API error: ' + err.toString());
  }
}

/**
 * 輔助函數：設置 GEMINI_API_KEY（第一次用手動 run 一次）
 * 使用方法：在 Google Apps Script 編輯器中，選擇 setGeminiApiKey，然後按「執行」
 */
function setGeminiApiKey() {
  const apiKey = 'YOUR_GEMINI_API_KEY_HERE'; // ← 在呢度填入你的 Gemini API key
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', apiKey);
  return 'GEMINI_API_KEY set successfully';
}
function sendConfirmationEmail(id, data) {
  // 如果想確認後自動 send email 通知，可以在呢度加
  // MailApp.sendEmail("你的 email", "WorkBuddy - 項目已確認", "ID: " + id);
}

/**
 * 測試用：手動 add 一筆資料
 */
function testAdd() {
  const e = {
    parameter: {
      action: "add",
      type: "宣傳圖",
      title: "EventEasy 測試宣傳圖",
      driveUrl: "https://drive.google.com/file/d/test123/view",
      notes: "測試用"
    }
  };
  const result = doPost(e);
  Logger.log(result.getContent());
}
