# Driveinary

[![Production](https://img.shields.io/badge/Production-drive.yoepan.my.id-000000?style=flat-square&logo=vercel&logoColor=white)](https://drive.yoepan.my.id)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

Driveinary lets you use your personal Google Drive account as cloud media storage and object delivery gateway for your websites and applications. Instead of paying for third-party media hosting, your files are stored directly in your own Google Drive while providing clean CDN URLs, API key authentication, and on-the-fly image transformations.

**Live Application:** [https://drive.yoepan.my.id](https://drive.yoepan.my.id)

---

## How It Works

1. **Connect:** Link your Google account once through the web dashboard.
2. **Get a Key:** Generate an API key for your project.
3. **Upload:** Use the API key in your website or application to stream photos and videos directly to your Google Drive.
4. **Display:** Embed your media on any website using clean links like `https://drive.yoepan.my.id/media/your-file-id`.

---

## Integration Guide

### 1. Environment Configuration

Add credentials to your client application (`.env` or `.env.local`):

```env
DRIVEINARY_API_KEY="drv_live_YOUR_API_KEY"
DRIVEINARY_API_URL="https://drive.yoepan.my.id/api/v1/upload"
```

### 2. Client Upload Example (JavaScript / TypeScript)

```javascript
async function uploadMedia(file, folderName = 'general') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folderName);

  const response = await fetch('https://drive.yoepan.my.id/api/v1/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DRIVEINARY_API_KEY}`,
    },
    body: formData,
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error);
  }

  return result.url; // Returns your clean media URL
}
```

---

## On-The-Fly Image Transformations

You can resize or convert images instantly by adding query parameters to the URL:

* **Original image:** `https://drive.yoepan.my.id/media/:asset_id`
* **Resize to 500px width:** `https://drive.yoepan.my.id/media/:asset_id?w=500`
* **Resize and convert to WebP:** `https://drive.yoepan.my.id/media/:asset_id?w=500&format=webp`
* **Compression quality:** `https://drive.yoepan.my.id/media/:asset_id?w=800&q=75&format=avif`

---

## Google Cloud Console Setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project named `Driveinary`.
2. Navigate to **APIs & Services** > **Library**, search for `Google Drive API`, and enable it.
3. Go to **APIs & Services** > **OAuth consent screen**, choose **External**, enter your email, and save.
4. Under **Credentials**, click **Create Credentials** > **OAuth client ID**, select **Web application**, and register:
   * **Authorized redirect URIs:** `https://your-domain.com/api/auth/google/callback`

---

## Security

* OAuth tokens are encrypted using AES-256-GCM before saving to the database.
* API keys are stored as SHA-256 hashes.
* Google permissions only request the `drive.file` scope, meaning the app can only access files it created inside the `Driveinary_Media` folder.

---

## License

This project is licensed under the MIT License.
