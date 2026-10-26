# Driveinary

[![Next.js](https://img.shields.io/badge/Next.js-14.2-181B22?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-181B22?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-181B22?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-181B22?style=for-the-badge)](LICENSE)

Driveinary lets you use your Google Drive account as a cloud media storage for your websites and applications. Instead of paying for third-party media hosting, your files are stored directly in your own Google Drive while providing clean URLs, API key access, and on-the-fly image resizing.

Live Application: [https://drive.yoepan.my.id](https://drive.yoepan.my.id)

---

## How It Works

1. **Connect:** Link your Google account once through the web dashboard.
2. **Get a Key:** Generate an API key for your project.
3. **Upload:** Use the API key in your website or application to upload photos and videos directly to your Google Drive.
4. **Display:** Embed your media on any website using clean links like `https://drive.yoepan.my.id/media/your-file-id`.

---

## Getting Started

### 1. Requirements
* Node.js (version 18 or newer).
* A standard Google account.

### 2. Google Cloud Setup (Detailed Step-by-Step)
You need a free Google Client ID and Secret so Driveinary can talk to your Google Drive. This takes about 3 minutes and requires no credit card or payment setup.

#### Step 1: Create a Project
1. Open [Google Cloud Console](https://console.cloud.google.com/) and sign in with your Google account.
2. If prompted with a "Free Trial" or "Billing" banner, close or dismiss it. You do not need billing.
3. At the top of the screen (next to the Google Cloud logo), click the project dropdown menu.
4. Click **New Project** in the upper-right corner of the popup.
5. Set the **Project name** to `Driveinary` and click **Create**.
6. Wait a few seconds, then click the top project dropdown again to ensure your new `Driveinary` project is selected.

#### Step 2: Enable the Google Drive API
1. Click the main navigation menu (three horizontal lines in the top-left corner).
2. Go to **APIs & Services** > **Library**.
3. In the search box, type `Google Drive API` and press Enter.
4. Click on the **Google Drive API** result card, then click the blue **Enable** button.

#### Step 3: Configure OAuth Consent Screen
1. In the left sidebar, click **APIs & Services** > **OAuth consent screen**.
2. Under **User Type**, select **External** and click **Create**.
3. On the **App information** page, fill in only these three fields:
   * **App name:** `Driveinary`
   * **User support email:** Select your email address.
   * **Developer contact information:** Type your email address.
   * *(Leave everything else, like app logo and domain fields, blank).*
   * Click **Save and Continue** at the bottom.
4. On the **Scopes** page:
   * Do not change anything. Simply scroll to the bottom and click **Save and Continue**.
5. On the **Test users** page (Important):
   * Click **+ ADD USERS**.
   * Enter the Google email address you plan to connect.
   * Click **Add**, then click **Save and Continue**.
   *(Note: Because the app is in testing mode, Google requires your email to be listed here so you are permitted to sign in).*
6. Click **Back to Dashboard**.

#### Step 4: Create Credentials
1. In the left sidebar, click **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top, then choose **OAuth client ID**.
3. In the **Application type** dropdown, select **Web application**.
4. Set the **Name** to `Driveinary Client`.
5. Scroll down to **Authorized redirect URIs** (do not confuse this with JavaScript origins):
   * Click **+ ADD URI**.
   * Enter: `http://localhost:3000/api/auth/google/callback`
   * *(If you host the app on a live domain, add another URI with your live domain callback URL, e.g. `https://drive.yoepan.my.id/api/auth/google/callback`).*
6. Click **Create**.
7. A popup window will show your **Client ID** and **Client Secret**. Copy both values into your `.env` file.

### 3. Running the Project

```bash
# 1. Clone this repository
git clone https://github.com/Yoepan/Driveinary.git
cd Driveinary

# 2. Copy the environment file
cp .env.example .env

# 3. Open .env and paste your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
# Then install dependencies and set up the database:
npm install
npx prisma db push

# 4. Start the server:
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## How to Use

### Step 1: Connect Your Account
On the dashboard homepage, click **Connect Google Drive** and sign in. A dedicated folder named `Driveinary_Media` will be created automatically in your Google Drive.

### Step 2: Create an API Key
Go to the **API Keys** tab and click **Create API Key**. Copy your generated key (`drv_live_...`).

### Step 3: Upload from Any Website
Use this simple JavaScript function in your website or frontend code to upload files directly to your Google Drive:

```javascript
async function uploadFile(file, apiKey) {
  // 1. Request an upload session from your Driveinary service
  const session = await fetch('https://drive.yoepan.my.id/api/v1/upload/direct', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: file.name,
      mime_type: file.type,
      size: file.size
    })
  }).then(res => res.json());

  // 2. Upload file directly to Google Drive
  const googleRes = await fetch(session.upload_url, {
    method: 'PUT',
    body: file
  }).then(res => res.json());

  // 3. Confirm upload
  const result = await fetch('https://drive.yoepan.my.id/api/v1/upload/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      asset_id: session.asset_id,
      google_file_id: googleRes.id
    })
  }).then(res => res.json());

  return result.url; // Returns your clean media URL
}
```

---

## Image Resizing

You can resize or convert images instantly by adding parameters to the URL:

* Original image: `https://drive.yoepan.my.id/media/:asset_id`
* Resize to 500px width: `https://drive.yoepan.my.id/media/:asset_id?w=500`
* Resize and convert to WebP: `https://drive.yoepan.my.id/media/:asset_id?w=500&format=webp`

---

## Deployment

You can deploy Driveinary on any hosting provider that supports Node.js applications (such as VPS, PaaS, or serverless platforms like Vercel).

When deploying, set the following environment variables in your hosting settings:
* `DATABASE_URL`: Connection string for PostgreSQL (e.g. Neon Serverless).
* `NEXT_PUBLIC_APP_URL`: Your live domain (e.g. `https://drive.yoepan.my.id`).
* `GOOGLE_REDIRECT_URI`: `https://drive.yoepan.my.id/api/auth/google/callback`.
* `GOOGLE_CLIENT_ID`: Your Google Client ID.
* `GOOGLE_CLIENT_SECRET`: Your Google Client Secret.
* `ENCRYPTION_SECRET`: A 32-character secret key for token encryption.

Make sure to add your live callback URL to **Authorized redirect URIs** in your Google Cloud Console.

---

## Security

* OAuth tokens are encrypted using AES-256-GCM before saving to the database.
* API keys are stored as SHA-256 hashes.
* Google permissions only request the `drive.file` scope, meaning the app can only access files it created inside the `Driveinary_Media` folder.

---

## Support

If you find Driveinary helpful, you can support its ongoing development:

[![Support via Tako](https://img.shields.io/badge/Support-Tako-181B22?style=for-the-badge&logo=buymeacoffee)](https://tako.id/yoepan/gift)
[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-181B22?style=for-the-badge&logo=paypal)](https://paypal.me/Yoepan)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
