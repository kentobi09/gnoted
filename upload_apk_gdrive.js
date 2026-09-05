import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apkPath = path.join(__dirname, 'SecureVault.apk');

async function main() {
  if (!fs.existsSync(apkPath)) {
    console.error('❌ SecureVault.apk not found at:', apkPath);
    process.exit(1);
  }

  const stats = fs.statSync(apkPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Found SecureVault.apk (${sizeMb} MB)`);

  // Read saved Webhook URL & Folder ID if present
  let webhookUrl = process.env.GDRIVE_WEBHOOK_URL || '';
  let folderId = process.env.GDRIVE_FOLDER_ID || '';

  // Attempt to read from app local storage backup
  try {
    const linkKey = 'secure_vault_gdrive_folder_link';
    const hookKey = 'secure_vault_gdrive_webhook_url';
    if (!webhookUrl && fs.existsSync(path.join(__dirname, 'gdrive_config.json'))) {
      const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'gdrive_config.json'), 'utf8'));
      webhookUrl = cfg.webhookUrl || webhookUrl;
      folderId = cfg.folderId || folderId;
    }
  } catch (e) {}

  console.log('🔄 Encoding APK to Base64 payload...');
  const apkBuffer = fs.readFileSync(apkPath);
  const base64Data = apkBuffer.toString('base64');

  const payload = {
    filename: 'SecureVault.apk',
    folderId: folderId,
    mimeType: 'application/vnd.android.package-archive',
    base64Data: base64Data
  };

  if (!webhookUrl) {
    console.log('\n⚠️  No Webhook URL found in environment or config.');
    console.log('To upload automatically, pass your Webhook URL or save it in gdrive_config.json.');
    console.log('\nSample gdrive_config.json:');
    console.log(JSON.stringify({ webhookUrl: "https://script.google.com/macros/s/.../exec", folderId: "YOUR_FOLDER_ID" }, null, 2));
    return;
  }

  console.log(`🚀 Uploading SecureVault.apk (${sizeMb} MB) to Google Drive Webhook...`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    console.log(`🎉 Direct Upload Triggered! Status: ${response.status} ${response.statusText}`);
    console.log(`✅ "SecureVault.apk" processed into your Google Drive folder!`);
  } catch (err) {
    console.error('❌ Upload error:', err.message);
  }
}

main();
