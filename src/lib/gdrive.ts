import { google } from 'googleapis';
import { Readable } from 'stream';
import { db } from './db';
import { decrypt, encrypt } from './encryption';

const ROOT_FOLDER_NAME = 'Driveinary_Media';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function handleOAuthCallback(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned by Google. Re-consent is required.');
  }

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email;

  if (!email) {
    throw new Error('Failed to retrieve user email from Google OAuth');
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Locate or create the dedicated root folder
  let rootFolderId: string;
  const searchFolder = await drive.files.list({
    q: `(name = '${ROOT_FOLDER_NAME}' or name = 'DriveCloud_Media') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchFolder.data.files && searchFolder.data.files.length > 0) {
    rootFolderId = searchFolder.data.files[0].id!;
  } else {
    const createdFolder = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    rootFolderId = createdFolder.data.id!;
  }

  // Get quota information
  const about = await drive.about.get({ fields: 'storageQuota' });
  const quota = about.data.storageQuota;
  const storageUsed = BigInt(quota?.usage || 0);
  const storageLimit = BigInt(quota?.limit || 5497558138880);

  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  const account = await db.googleAccount.upsert({
    where: { email },
    create: {
      email,
      refreshToken: encryptedRefreshToken,
      rootFolderId,
      storageUsed,
      storageLimit,
    },
    update: {
      refreshToken: encryptedRefreshToken,
      rootFolderId,
      storageUsed,
      storageLimit,
      updatedAt: new Date(),
    },
  });

  return account;
}

export async function getDriveClient(accountId: string) {
  const account = await db.googleAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Google account not found for id: ${accountId}`);
  }

  const refreshToken = decrypt(account.refreshToken);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return { drive, account };
}

export async function uploadStreamToDrive(
  accountId: string,
  filename: string,
  mimeType: string,
  stream: Readable,
  subfolderName?: string
) {
  const { drive, account } = await getDriveClient(accountId);

  let targetParentId = account.rootFolderId;

  if (subfolderName) {
    const cleanSubfolder = subfolderName.replace(/['\\]/g, '').trim();
    if (cleanSubfolder) {
      // Find or create subfolder under the root folder
      const searchSubfolder = await drive.files.list({
        q: `name = '${cleanSubfolder}' and '${account.rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (searchSubfolder.data.files && searchSubfolder.data.files.length > 0) {
        targetParentId = searchSubfolder.data.files[0].id!;
      } else {
        const createdSubfolder = await drive.files.create({
          requestBody: {
            name: cleanSubfolder,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [account.rootFolderId],
          },
          fields: 'id',
        });
        targetParentId = createdSubfolder.data.id!;
      }
    }
  }

  // Stream upload directly to Google Drive
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [targetParentId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, size, mimeType',
  });

  const fileId = res.data.id!;

  // Set file permission to readable by anyone with the link for direct CDN compatibility
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch {
    // Non-critical if organization policy restricts public links; proxy will handle delivery
  }

  const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

  return {
    fileId,
    name: res.data.name || filename,
    mimeType: res.data.mimeType || mimeType,
    size: Number(res.data.size || 0),
    directUrl,
  };
}

export async function downloadStreamFromDrive(accountId: string, fileId: string) {
  const { drive } = await getDriveClient(accountId);
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return response.data as Readable;
}

export async function deleteFileFromDrive(accountId: string, fileId: string) {
  const { drive } = await getDriveClient(accountId);
  await drive.files.delete({ fileId });
}

export async function createResumableUploadSession(
  accountId: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
  subfolderName?: string,
  origin?: string
) {
  const { drive, account } = await getDriveClient(accountId);
  const refreshToken = decrypt(account.refreshToken);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  let targetParentId = account.rootFolderId;

  if (subfolderName) {
    const cleanSubfolder = subfolderName.replace(/['\\]/g, '').trim();
    if (cleanSubfolder) {
      const searchSubfolder = await drive.files.list({
        q: `name = '${cleanSubfolder}' and '${account.rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (searchSubfolder.data.files && searchSubfolder.data.files.length > 0) {
        targetParentId = searchSubfolder.data.files[0].id!;
      } else {
        const createdSubfolder = await drive.files.create({
          requestBody: {
            name: cleanSubfolder,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [account.rootFolderId],
          },
          fields: 'id',
        });
        targetParentId = createdSubfolder.data.id!;
      }
    }
  }

  const reqHeaders: Record<string, string> = {
    'X-Upload-Content-Type': mimeType,
    'X-Upload-Content-Length': sizeBytes.toString(),
  };

  if (origin) {
    try {
      const parsed = new URL(origin);
      reqHeaders['Origin'] = `${parsed.protocol}//${parsed.host}`;
    } catch {
      reqHeaders['Origin'] = origin;
    }
  }

  const response = await oauth2Client.request({
    method: 'POST',
    url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    headers: reqHeaders,
    data: {
      name: filename,
      parents: [targetParentId],
    },
  });

  return {
    uploadUrl: response.headers.location as string,
    targetParentId,
    accountId: account.id,
  };
}

export async function setFilePublicPermission(accountId: string, fileId: string) {
  const { drive } = await getDriveClient(accountId);
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch {}
}
