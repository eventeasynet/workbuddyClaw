/**
 * WorkBuddy Dashboard - Google Apps Script (Web App)
 * 全部功能在 doGet() 内处理，避免 doPost 部署问题
 * 部署为 Web App：Execute as = Me, Access = Anyone (including anonymous)
 */

const SHEET_NAME = "Pending";
const COLUMNS = ["ID", "Type", "Title", "DriveURL", "Status", "CreatedAt", "ConfirmedAt", "Notes"];

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
      const items = getItems(status);
      result = { success: true, items: items };
    } else if (action === "list_pending") {
      const items = getItems("待確認");
      result = { success: true, items: items, count: items.length };
    } else if (action === "list_confirmed") {
      const items = getItems("已確認");
      result = { success: true, items: items, count: items.length };
    } else if (action === "test") {
      result = { status: "ok", message: "GAS Web App is working!", timestamp: new Date().toISOString() };
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
 * 处理写操作（add/confirm/delete）
 * 通过 GET parameter 传参，避免 doPost 问题
 */
function handleWriteAction(e, action) {
  try {
    if (action === "add") {
      const type = e.parameter.type || "";
      const title = e.parameter.title || "";
      const driveUrl = e.parameter.driveUrl || "";
      const notes = e.parameter.notes || "";
      const status = e.parameter.status || "待確認";  // 默认待確認，可传 "已確認"
      
      if (!type || !title) {
        return { success: false, error: "Missing type or title" };
      }
      
      const id = "WB_" + new Date().getTime();
      const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      
      const sheet = getSheet();
      const confirmedAt = (status === "已確認") ? now : "";
      sheet.appendRow([id, type, title, driveUrl, status, now, confirmedAt, notes]);
      SpreadsheetApp.flush();
      
      return { success: true, id: id, message: "Item added", status: status };
    }
    
    if (action === "confirm") {
      const id = e.parameter.id || "";
      if (!id) {
        return { success: false, error: "Missing id" };
      }
      
      const sheet = getSheet();
      const data = sheet.getDataRange().getValues();
      let updated = false;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
          sheet.getRange(i + 1, 5).setValue("已確認");
          sheet.getRange(i + 1, 7).setValue(now);
          updated = true;
          break;
        }
      }
      
      if (updated) {
        return { success: true, message: "Item confirmed" };
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
    
    if (action === "buffer_post") {
      const text = e.parameter.text || "";
      const channelId = e.parameter.channelId || "";
      const imageUrl = e.parameter.imageUrl || "";
      const linkUrl = e.parameter.linkUrl || "";
      const bufferToken = e.parameter.token || "";
      
      if (!text || !channelId || !bufferToken) {
        return { success: false, error: "Missing text, channelId, or token" };
      }
      
      // 构建 Buffer GraphQL mutation
      var metadata = {};
      var assets = [];
      
      // Facebook: 6a1e74afc687a22dd44f6f6b
      if (channelId === "6a1e74afc687a22dd44f6f6b") {
        metadata.facebook = { type: "post" };
        if (linkUrl) metadata.facebook.linkAttachment = { url: linkUrl };
      }
      
      // Instagram: 6a1e6612c687a22dd44f3a6a (必须附图)
      if (channelId === "6a1e6612c687a22dd44f3a6a") {
        assets.push({ image: { url: imageUrl || "https://drive.google.com/uc?export=view&id=17wMJ_xVO3HYM9gx_HERxk8ygpEbp4h7E" } });
      }
      
      var input = {
        text: text,
        channelId: channelId,
        schedulingType: "automatic",
        mode: "shareNow"
      };
      if (Object.keys(metadata).length > 0) input.metadata = metadata;
      if (assets.length > 0) input.assets = assets;
      
      var query = "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } } }";
      
      var options = {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + bufferToken },
        payload: JSON.stringify({ query: query, variables: { input: input } }),
        muteHttpExceptions: true
      };
      
      try {
        var resp = UrlFetchApp.fetch("https://api.buffer.com", options);
        var json = JSON.parse(resp.getContentText());
        
        if (json.errors) {
          return { success: false, error: json.errors.map(function(e) { return e.message; }).join("; ") };
        }
        var result = json.data.createPost;
        if (result.message) {
          return { success: false, error: result.message };
        }
        return { success: true, post: result.post };
      } catch (err) {
        return { success: false, error: err.toString() };
      }
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
