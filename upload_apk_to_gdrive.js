import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apkPath = path.join(__dirname, 'SecureVault.apk');

if (!fs.existsSync(apkPath)) {
  console.error('APK file not found at:', apkPath);
  process.exit(1);
}

const stats = fs.statSync(apkPath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`✅ SecureVault.apk successfully built! (Size: ${sizeMb} MB)`);
console.log(`Location: ${apkPath}`);
