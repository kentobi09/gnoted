/**
 * Google Apps Script Webhook Handler for GNOTED
 * Supports both JSON Note Backups and Binary APK Uploads directly to Google Drive
 * 
 * Instructions:
 * 1. Open https://script.google.com and create a New Project.
 * 2. Paste this code into Code.gs and save.
 * 3. Click Deploy -> New Deployment -> Select 'Web app'.
 * 4. Set 'Execute as': Me, 'Who has access': Anyone.
 * 5. Click Deploy and copy your Web App URL.
 */

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    
    var filename = data.filename || ("gnoted_backup_" + new Date().getTime() + ".json");
    var payloadStr = data.payload || "";
    var targetFolderId = data.folderId || "";
    var isBase64 = data.isBase64 || false;
    
    var folder;
    if (targetFolderId && targetFolderId.trim().length > 5) {
      try {
        folder = DriveApp.getFolderById(targetFolderId.trim());
      } catch (err) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    var file;
    if (isBase64) {
      var decodedBytes = Utilities.base64Decode(payloadStr);
      var blob = Utilities.newBlob(decodedBytes, "application/vnd.android.package-archive", filename);
      file = folder.createFile(blob);
    } else {
      file = folder.createFile(filename, payloadStr, MimeType.PLAIN_TEXT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: "success", 
        fileId: file.getId(), 
        filename: filename, 
        url: file.getUrl() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: "error", 
        message: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
