// Main entry point - delegates to 程式碼.js
// All logic is in 程式碼.js, this file is for GAS function picker

/**
 * 測試用：手動觸發 UrlFetchApp 授權
 * 在編輯器執行一次，授權後 buffer_post 才能正常運作
 */
function authorizeUrlFetch() {
  return TestHelper_authorizeUrlFetch();
}

/**
 * 初始化 Sheet（第一次用手動 run 一次）
 */
function initSheet() {
  return Main_initSheet();
}

/**
 * 測試 GAS Web App
 */
function testWebApp() {
  return Main_test();
}
