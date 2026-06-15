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
  
  // 翻譯 API：中文 → 英文（用 LanguageApp.translate()）
  if (action === "translate") {
    const chineseText = e.parameter.chineseText || "";
    const context = e.parameter.context || ""; // 額外上下文（例如：機構名稱、活動名稱）
    
    if (!chineseText) {
      return jsonResponse({ success: false, error: "Missing chineseText" });
    }
    
    try {
      const englishText = translateToEnglish(chineseText, context);
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
 * 翻譯函數：中文 → 英文（用 LanguageApp.translate()）
 * 注意：LanguageApp.translate() 是 Google Apps Script 內置的免費翻譯服務
 * 缺點：只是「翻譯」，不是「重新生成英文版本」（質量較差）
 * 優點：免費，不需要 API key，香港可以用
 */
function translateToEnglish(chineseText, context) {
  if (!chineseText) {
    throw new Error('Missing chineseText');
  }
  
  try {
    // 用 LanguageApp.translate() 進行翻譯
    var translatedText = LanguageApp.translate(chineseText, 'zh-TW', 'en');
    
    // 如果用戶提供了上下文，嘗試改寫（簡單的後處理）
    if (context) {
      // 在翻譯後的內容前面加入上下文提示
      translatedText = 'Subject: ' + context + '\n\n' + translatedText;
    }
    
    return translatedText;
  } catch (err) {
    throw new Error('LanguageApp.translate() error: ' + err.toString());
  }
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
