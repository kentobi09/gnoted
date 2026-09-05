/**
 * Google Drive Webhook Automated Upload Helper
 * Direct integration with Google Apps Script Web App for personal @gmail.com accounts
 */

const GDRIVE_LINK_STORAGE_KEY = 'secure_vault_gdrive_folder_link';
const GDRIVE_WEBHOOK_STORAGE_KEY = 'secure_vault_gdrive_webhook_url';

export function saveGoogleDriveFolderLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    localStorage.removeItem(GDRIVE_LINK_STORAGE_KEY);
    return null;
  }
  localStorage.setItem(GDRIVE_LINK_STORAGE_KEY, trimmed);
  return extractFolderIdFromUrl(trimmed);
}

export function getSavedGoogleDriveFolderLink(): string {
  return localStorage.getItem(GDRIVE_LINK_STORAGE_KEY) || '';
}

export function saveGoogleDriveWebhookUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    localStorage.removeItem(GDRIVE_WEBHOOK_STORAGE_KEY);
    return;
  }
  localStorage.setItem(GDRIVE_WEBHOOK_STORAGE_KEY, trimmed);
}

export function getSavedGoogleDriveWebhookUrl(): string {
  return localStorage.getItem(GDRIVE_WEBHOOK_STORAGE_KEY) || '';
}

export function extractFolderIdFromUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Strip query parameters like ?usp=sharing or #hash
  const cleanUrl = trimmed.split('?')[0].split('#')[0];
  
  const match = cleanUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  
  const idMatch = cleanUrl.match(/([a-zA-Z0-9_-]{15,})/);
  if (idMatch) return idMatch[1];
  
  return cleanUrl;
}

/**
 * Uploads encrypted vault data directly to Google Drive via Google Apps Script Webhook
 */
export async function uploadDirectToGoogleDrive(params: {
  folderUrlOrId?: string;
  webhookUrl?: string;
  filename: string;
  payloadJson: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const rawFolderInput = params.folderUrlOrId || getSavedGoogleDriveFolderLink();
    const folderId = extractFolderIdFromUrl(rawFolderInput) || '';
    const webhookUrl = (params.webhookUrl || getSavedGoogleDriveWebhookUrl()).trim();

    if (!webhookUrl) {
      return {
        success: false,
        message: 'Google Apps Script Webhook URL missing! Please paste your Webhook URL in Settings.'
      };
    }

    const payloadData = {
      folderId: folderId,
      filename: params.filename,
      payload: params.payloadJson
    };

    // Google Apps Script requires no-cors mode for cross-origin browser POST redirects
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payloadData)
    });

    return {
      success: true,
      message: `Uploaded "${params.filename}" directly to your Google Drive folder via Webhook!`
    };
  } catch (err: any) {
    console.error('Google Drive Webhook upload failed:', err);
    return {
      success: false,
      message: `Upload error: ${err?.message || 'Network error'}`
    };
  }
}
