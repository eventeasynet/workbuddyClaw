/**
 * WorkBuddy Dashboard - Google Apps Script (Web App)
 * 全部功能在 doGet() 内处理，避免 doPost 部署问题
 * 部署为 Web App：Execute as = Me, Access = Anyone (including anonymous)
 * Buffer API: 使用 GraphQL, endpoint = https://api.buffer.com
 * Buffer Token: 7mmKJU3HkgZYNtWrbrKiel_xXtoQRpTtqAUfPDTZNR_ (API Key from Buffer settings)
 * Channel IDs: Facebook=6a1e74afc687a22dd44f6f6b, Instagram=6a1e6612c687a22dd44f3a6a, LinkedIn=6a1e6590c687a22dd44f37f0
 */

const SHEET_NAME = "Pending";
const COLUMNS = ["ID", "Type", "Title", "DriveURL", "Status", "CreatedAt", "ConfirmedAt", "Notes"];

/**
 * 供 clasp run 直接呼叫，跳過 Web App
 * 用法：clasp run addCopyByParams --params '["社群文案","標題","內文","待確認"]'
 */
function addCopyByParams(type, title, notes, status) {
  const sheet = getSheet();
  const id = "WB_" + new Date().getTime();
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([id, type, title, "", status || "待確認", now, "", notes || ""]);
  return { success: true, id: id, message: "已寫入 GAS Sheet" };
}

/**
 * 统一入口：GET 和 POST 都走这里
 * JSONP 支援：通过 callback 参数实现跨域
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "list";
  const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  
  let result;
  
  // 处理写操作
  const writeActions = ["add", "confirm", "delete", "buffer_post"];
  if (writeActions.indexOf(action) !== -1) {
    result = handleWriteAction(e, action);
  } else {
    // 读取操作
    if (action === "list") {
      const status = (e && e.parameter.status) ? e.parameter.status : "all";
      let items = getItems(status);
      // 按 type 模糊過濾（支持逗號分隔多個 type）
      const typeParam = (e && e.parameter.type) ? e.parameter.type : null;
      if (typeParam) {
        const types = typeParam.split(',');
        items = items.filter(function(item) {
          return types.some(function(t) { return (item.type || '').indexOf(t) >= 0; });
        });
      }
      result = { success: true, items: items };
    } else if (action === "list_pending") {
      const items = getItems("待確認");
      result = { success: true, items: items, count: items.length };
    } else if (action === "list_confirmed") {
      const status = e.parameter.status || "已確認";
      const items = getItems(status);
      result = { success: true, items: items, count: items.length };
    } else if (action === "test") {
      result = { status: "ok", message: "GAS Web App is working!", timestamp: new Date().toISOString() };
    } else if (action === "get_sheet_url") {
      // 返回 Spreadsheet URL（方便用戶直接開）
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      result = { success: true, url: ss.getUrl(), name: ss.getName() };
    } else if (action === "raw_sheet") {
      // 調試用：返回 Spreadsheet 原始數據（限制行數避免 JSON 過大）
      const sheet = getSheet();
      const data = sheet.getDataRange().getValues();
      const limit = parseInt(e.parameter.limit) || 10;  // 默认 10 行
      const rows = data.slice(0, limit).map(function(row) {
        return row.map(function(cell) { return String(cell); });
      });
      result = { success: true, rows: rows, sheetName: sheet.getName(), lastRow: sheet.getLastRow(), totalRows: data.length, limit: limit };
    } else {
      result = { success: false, error: "Unknown action: " + action };
    }
  }
  
  // JSONP 支援
  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(result);
}

/**
 * 支援 POST 請求（避免 URL 長度限制）
 */
function doPost(e) {
  return doGet(e);
}

/**
 * 處理寫操作（add/confirm/delete/buffer_post）
 * 通過 GET parameter 傳參，避免 doPost 問題
 */
function handleWriteAction(e, action) {
  try {
    if (action === "add") {
      const type = e.parameter.type || "";
      const title = e.parameter.title || "";
      const driveUrl = e.parameter.driveUrl || e.parameter.link_url || "";
      const notes = e.parameter.notes || "";
      const status = e.parameter.status || "待確認";  // 默认待確認，可传 "已確認"
      const createdAtParam = e.parameter.createdAt || "";  // 可選：自訂創建時間
      
      if (!type || !title) {
        return { success: false, error: "Missing type or title" };
      }
      
      const id = "WB_" + new Date().getTime();
      const createdAt = createdAtParam || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      
      const sheet = getSheet();
      const confirmedAt = (status === "已確認") ? createdAt : "";
      sheet.appendRow([id, type, title, driveUrl, status, createdAt, confirmedAt, notes]);
      SpreadsheetApp.flush();
      
      return { success: true, id: id, message: "Item added", status: status };
    }
    
    if (action === "confirm") {
      const id = e.parameter.id || "";
      const newStatus = e.parameter.status || "已確認";  // 容許自訂狀態
      if (!id) {
        return { success: false, error: "Missing id" };
      }
      
      const sheet = getSheet();
      const data = sheet.getDataRange().getValues();
      let updated = false;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
          sheet.getRange(i + 1, 5).setValue(newStatus);
          sheet.getRange(i + 1, 7).setValue(now);
          updated = true;
          break;
        }
      }
      
      if (updated) {
        return { success: true, message: "Item confirmed", status: newStatus };
      } else {
        return { success: false, error: "Item not found: " + id };
      }
    }
    
    if (action === "update_url") {
      const id = e.parameter.id || "";
      const newUrl = e.parameter.url || "";
      if (!id || !newUrl) {
        return { success: false, error: "Missing id or url" };
      }
      const sheet = getSheet();
      const data = sheet.getDataRange().getValues();
      let updated = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.getRange(i + 1, 4).setValue(newUrl);  // Column D = URL
          updated = true;
          break;
        }
      }
      if (updated) {
        return { success: true, message: "URL updated" };
      } else {
        return { success: false, error: "Item not found: " + id };
      }
    }
    
    if (action === "delete") {
      const id = e.parameter.id || "";
      if (!id) {
        return { success: false, error: "Missing id" };
      }
      
      const sheet = getSheet();
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.deleteRow(i + 1);
          return { success: true, message: "Item deleted" };
        }
      }
      
      return { success: false, error: "Item not found: " + id };
    }
    
    /**
     * Buffer API - GraphQL 格式
     * 正確字段：assets (不是 media)
     * assets 格式：[{image: {url: "..."}}] 或 [{link: {url: "..."}}]
     * Facebook 需要 metadata: {facebook: {type: post}}
     * Enum 值必須小寫：automatic, shareNow (不是 AUTOMATIC, SHARE_NOW)
     */
    if (action === "buffer_post") {
      const text = e.parameter.text || "";
      const channelId = e.parameter.channelId || "";
      const imageUrl = e.parameter.imageUrl || "";
      const linkUrl = e.parameter.linkUrl || "";
      const bufferToken = e.parameter.token || "";
      
      if (!text || !channelId || !bufferToken) {
        return { success: false, error: "Missing text, channelId, or token" };
      }
      
      // 構建 assets 数组（Buffer GraphQL 正確格式）
      var assetsArr = [];
      
      if (imageUrl) {
        // 圖片：assets: [{image: {url: "..."}}]
        assetsArr.push('{image: {url: "' + imageUrl + '"}}');
      }
      
      if (linkUrl && !imageUrl) {
        // 連結：assets: [{link: {url: "..."}}]
        assetsArr.push('{link: {url: "' + linkUrl + '"}}');
      }
      
      var assetsStr = "";
      if (assetsArr.length > 0) {
        assetsStr = ', assets: [' + assetsArr.join(', ') + ']';
      }
      
      // Facebook / Instagram 需要指定 type + 必要 metadata
      var metadataStr = "";
      if (channelId === "6a1e74afc687a22dd44f6f6b") {
        metadataStr = ', metadata: {facebook: {type: post}}';
      } else if (channelId === "6a1e6612c687a22dd44f3a6a") {
        metadataStr = ', metadata: {instagram: {type: post, shouldShareToFeed: true}}';
      }
      
      // 用 GraphQL Block String (""") 處理多行文字，避免 escape問題
      // Block String 內的三引號用 \""" escape
      var safeText = text.replace(/"""/g, '\\"""');
      var query = 'mutation CreatePost { createPost(input: {text: """\n' + safeText + '\n"""' +
        ', schedulingType: automatic, mode: shareNow, channelId: "' + channelId + '"' +
        assetsStr + metadataStr +
        '}) { ... on PostActionSuccess { post { id text status } } ... on MutationError { message } } }';
      
      var options = {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + bufferToken },
        payload: JSON.stringify({ query: query }),
        muteHttpExceptions: true
      };
      
      try {
        var resp = UrlFetchApp.fetch("https://api.buffer.com", options);
        var json = JSON.parse(resp.getContentText());
        
        if (json.errors) {
          return { success: false, error: json.errors.map(function(e) { return e.message; }).join("; ") };
        }
        
        var result = json.data ? json.data.createPost : null;
        if (result && result.message) {
          return { success: false, error: result.message };
        }
        
        return { success: true, post: result ? result.post : null };
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
    
    // 更新 Notes（用於修正活動花絮內容）
    if (action === "update_notes") {
      const id = e.parameter.id || "";
      const notes = e.parameter.notes || "";
      if (!id) return { success: false, error: "Missing id" };
      const sheet = getSheet();
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.getRange(i + 1, 8).setValue(notes);
          SpreadsheetApp.flush();
          return { success: true, message: "Notes updated for " + id };
        }
      }
      return { success: false, error: "ID not found: " + id };
    }
    
    return { success: false, error: "Unknown write action: " + action };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * 辅助函数：获取 Sheet（不存在则创建）
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
 * 辅助函数：读取项目
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
 * 辅助函数：JSON 响应
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 初始化 Sheet（第一次手动 run 一次）
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
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 200);
  SpreadsheetApp.flush();
  return "Sheet initialized: " + SHEET_NAME;
}

/**
 * 测试用：手动触发 UrlFetchApp 授权
 * 在编辑器执行一次，授权后 buffer_post 才能正常运作
 */
function authorizeUrlFetch() {
  const resp = UrlFetchApp.fetch("https://api.buffer.com", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ query: "{ __schema { types { name } } }" }),
    headers: { "Authorization": "Bearer " + "test" },
    muteHttpExceptions: true
  });
  return "Authorization complete. Status: " + resp.getResponseCode();
}

/**
 * 测试 GAS Web App
 */
function testWebApp() {
  var e = { parameter: { action: "test" } };
  return doGet(e);
}

/**
 * 修復 6/5 新聞 URL：從 Drive 改為 GitHub Pages
 */
function fixNews605Url() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) { return "Sheet not found"; }
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "WB_1780617801816") {
      var newUrl = "https://eventeasynet.github.io/workbuddyClaw/news/2026-06-05_HK_News.html";
      sheet.getRange(i + 1, 4).setValue(newUrl);
      return "Updated row " + (i+1) + " URL to: " + newUrl;
    }
  }
  return "ID not found";
}
