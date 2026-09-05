import fs from 'fs';
import path from 'path';

/**
 * Upload GNOTED.apk directly to Google Drive via Google Apps Script Webhook
 * Usage: node upload_apk_gdrive.js <your_webhook_url>
 */

const apkPath = path.resolve('GNOTED.apk');
let webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.log('\n❌ Error: Please provide your Google Apps Script Webhook URL.');
  console.log('Usage: node upload_apk_gdrive.js https://script.google.com/macros/s/.../exec\n');
  process.exit(1);
}

if (!fs.existsSync(apkPath)) {
  console.log('\n❌ Error: GNOTED.apk file not found in current directory.\n');
  process.exit(1);
}

console.log('\n📦 Reading GNOTED.apk...');
const apkBuffer = fs.readFileSync(apkPath);
const base64Payload = apkBuffer.toString('base64');
console.log(`✅ File read successfully (${(apkBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);

console.log('🚀 Uploading GNOTED.apk to Google Drive via Webhook...');

fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'GNOTED.apk',
    payload: base64Payload,
    isBase64: true
  })
})
  .then(res => res.text())
  .then(text => {
    console.log('\n🎉 Upload completed! Response from Google Drive Webhook:');
    console.log(text + '\n');
  })
  .catch(err => {
    console.error('\n❌ Upload failed:', err.message + '\n');
  });
