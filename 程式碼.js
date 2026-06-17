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
  const writeActions = ["add", "confirm", "delete", "buffer_post", "update_url", "update_notes"];
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
    } else if (action === "check_postlog") {
      // 調試用：返回 PostLog sheet 最後幾行
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var logSheet = ss.getSheetByName('PostLog');
        if (!logSheet) {
          result = { success: true, log: 'PostLog sheet not found (no POST received yet)' };
        } else {
          var data = logSheet.getDataRange().getValues();
          var rows = data.slice(-5).map(function(row) { return row.map(function(cell) { return String(cell); }); });
          result = { success: true, totalRows: data.length, lastRows: rows };
        }
      } catch(err) {
        result = { success: false, error: err.toString() };
      }
    } else if (action === "check_token") {
      var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
      result = { success: true, token_set: !!token, token_preview: token ? token.substring(0, 6) + '...' : 'NOT SET' };
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
 * 支援 POST 請求
 * 處理 HTML 內容更新（保存編輯後的電郵）
 */
function doPost(e) {
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var result;
  
  try {
    // 嘗試解析 JSON payload
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch(err) {
        // 如果不是 JSON，嘗試從 parameter 讀取
        postData = e.parameter || {};
      }
    } else {
      postData = e.parameter || {};
    }
    
    var action = postData.action || (e.parameter ? e.parameter.action : '') || '';
    
    // 更新 HTML 檔案（Google Drive + GitHub）
    if (action === 'update_html') {
      result = handleUpdateHtml(postData);
    } else {
      // 其他 action 走原有 doGet 邏輯
      return doGet(e);
    }
  } catch(err) {
    result = { success: false, error: err.toString() };
  }
  
  var json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(result);
}

/**
 * 處理 HTML 內容更新
 * 1. 更新 Google Drive 上的 HTML 檔案
 * 2. 更新 GitHub 倉庫中的檔案
 */
function handleUpdateHtml(params) {
  var fileId = params.fileId || '';
  var content = params.content || '';
  var githubPath = params.githubPath || '';
  
  // 寫日誌到 Spreadsheet（用於調試）
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName('PostLog');
    if (!logSheet) {
      logSheet = ss.insertSheet('PostLog');
      logSheet.appendRow(['Timestamp', 'Action', 'FileId', 'GitHubPath', 'ContentLength', 'GDrive', 'GitHub', 'Error']);
    }
    logSheet.appendRow([new Date(), 'update_html', fileId, githubPath, content.length, '', '', '']);
  } catch(e) {}
  
  if (!fileId || !content) {
    return { success: false, error: 'Missing fileId or content' };
  }
  
  var results = { gdrive: false, github: false };
  
  // 1. 更新 Google Drive
  try {
    var file = DriveApp.getFileById(fileId);
    file.setContent(content);
    results.gdrive = true;
  } catch(err) {
    results.gdriveError = err.toString();
  }
  
  // 2. 更新 GitHub（如果有提供路徑）
  if (githubPath) {
    try {
      results.github = updateGitHubFile(githubPath, content);
    } catch(err) {
      results.githubError = err.toString();
    }
  }
  
  return {
    success: results.gdrive || results.github,
    results: results
  };
}

/**
 * 用 GitHub API 更新倉庫中的檔案
 * Token 存在腳本屬性 GITHUB_TOKEN 中
 */
function updateGitHubFile(path, content) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    return { success: false, error: 'GITHUB_TOKEN not set in script properties' };
  }
  
  var owner = 'eventeasynet';
  var repo = 'workbuddyClaw';
  var branch = 'gh-pages';
  
  // 1. 先取得檔案的 SHA（用於更新）
  var getUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + encodeURIComponent(path) + '?ref=' + branch;
  var getOptions = {
    method: 'get',
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'WorkBuddy-GAS'
    },
    muteHttpExceptions: true
  };
  
  var getResp = UrlFetchApp.fetch(getUrl, getOptions);
  var getJson = JSON.parse(getResp.getContentText());
  
  if (!getJson.sha) {
    return { success: false, error: 'File not found on GitHub: ' + path, status: getResp.getResponseCode() };
  }
  
  // 2. 更新檔案
  var putUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + encodeURIComponent(path);
  var encodedContent = Utilities.base64Encode(content, Utilities.Charset.UTF_8);
  var payload = {
    message: 'Update ' + path + ' (via Dashboard email editor)',
    content: encodedContent,
    sha: getJson.sha,
    branch: branch
  };
  
  var putOptions = {
    method: 'put',
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'WorkBuddy-GAS'
    },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var putResp = UrlFetchApp.fetch(putUrl, putOptions);
  var putJson = JSON.parse(putResp.getContentText());
  
  if (putResp.getResponseCode() === 200 || putResp.getResponseCode() === 201) {
    return { success: true, commit: putJson.commit ? putJson.commit.sha : null };
  } else {
    return { success: false, error: putJson.message || 'GitHub update failed', status: putResp.getResponseCode() };
  }
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

/**
 * 設定腳本屬性（供 clasp run 呼叫）
 * 用法：clasp run setScriptProperty -p '["GITHUB_TOKEN", "ghp_xxx"]'
 */
function setScriptProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
  return "Property '" + key + "' set successfully";
}

/**
 * 取得腳本屬性
 */
function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * 一次性設定：初始化 GITHUB_TOKEN
 * 在 GAS 編輯器手動執行一次即可
 * ⚠️ 執行後請刪除此函數中的 token 值，改用腳本屬性讀取
 */
function initGitHubToken() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (token) {
    return "GITHUB_TOKEN already set (preview: " + token.substring(0,6) + "...)";
  }
  // 首次設定：在 GAS 編輯器中把下面的空字串替換為你的 token，執行後再改回空字串
  var newToken = '';
  if (!newToken) {
    return "Please set the token value in the code first, then run again.";
  }
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', newToken);
  return "GITHUB_TOKEN set successfully";
}
