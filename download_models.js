import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

const modelFiles = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

async function downloadFiles() {
  console.log('📦 Downloading local Face-API ML models into public/models/...');

  for (const file of modelFiles) {
    const destPath = path.join(modelsDir, file);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
      console.log(`✓ ${file} already present.`);
      continue;
    }

    const fileUrl = `${baseUrl}${file}`;
    console.log(`Downloading ${fileUrl}...`);
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      console.log(`✅ Saved ${file} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`❌ Failed to download ${file}:`, err.message);
    }
  }

  console.log('🎉 Model download complete!');
}

downloadFiles();
