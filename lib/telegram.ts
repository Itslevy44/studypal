// Telegram utility for storing and retrieving past papers
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

type TelegramMessage = {
  message_id: number;
  chat?: {
    id?: number | string;
  };
  caption?: string;
  document?: {
    file_id: string;
  };
  photo?: Array<{
    file_id: string;
  }>;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_message?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
};

export interface TelegramUploadResult {
  success: boolean;
  messageId?: string;
  fileId?: string;
  error?: string;
}

export interface TelegramFileInfo {
  fileId: string;
  fileSize: number;
  mimeType: string;
}

export interface TelegramJsonDocument<T = unknown> {
  data: T;
  metadata: Record<string, unknown>;
  messageId: string;
  fileId: string;
  uploadedAt?: string;
}

const getTelegramApiUrl = (method: string) => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram bot token is not configured.');
  }

  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
};

const getStringMetadata = (metadata: Record<string, unknown>, key: string): string | undefined => {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
};

const parseTelegramMetadata = (caption?: string): Record<string, unknown> => {
  if (!caption) return {};

  try {
    return JSON.parse(caption);
  } catch {
    return {};
  }
};

// Upload file to Telegram
export const uploadToTelegram = async (
  file: File,
  metadata: Record<string, unknown>
): Promise<TelegramUploadResult> => {
  try {
    const isImage = file.type.startsWith('image/');
    const caption = JSON.stringify(metadata);

    let telegramUrl: string;
    let formData: FormData;

    if (isImage) {
      telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID!);
      formData.append('caption', caption);
      formData.append('photo', file);
    } else {
      telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
      formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID!);
      formData.append('caption', caption);
      formData.append('document', file);
    }
    
    console.log('[Telegram Upload] Sending request:', {
      url: telegramUrl,
      chatId: TELEGRAM_CHAT_ID,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      metadata
    });

    const response = await fetch(telegramUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    console.log('[Telegram Upload] Full API Response:', {
      ok: result.ok,
      statusCode: response.status,
      result: result
    });

    if (!result.ok) {
      const errorMessage = result.description || 'Failed to upload to Telegram';
      console.log('[Telegram Upload] Error details:', {
        error_code: result.error_code,
        description: result.description,
        parameters: result.parameters
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const doc = result.result?.document;
    const photo = result.result?.photo;
    const fileId = doc?.file_id || (photo ? photo[photo.length - 1]?.file_id : undefined);
    console.log('[Telegram Upload] Success! Message ID:', result.result.message_id, 'File ID:', fileId);
    
    return {
      success: true,
      messageId: result.result.message_id.toString(),
      fileId: fileId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Telegram upload failed';
    const stack = error instanceof Error ? error.stack : undefined;

    console.error('[Telegram Upload] Exception:', {
      message,
      stack,
    });
    
    return {
      success: false,
      error: message,
    };
  }
};

export const sendJsonDocumentToTelegram = async (
  filename: string,
  data: unknown,
  metadata: Record<string, unknown> = {}
): Promise<TelegramUploadResult> => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });

  return uploadToTelegram(file, {
    app: 'studypal_archive',
    ...metadata,
    uploadedAt: new Date().toISOString(),
  });
};

export const downloadJsonDocumentFromTelegram = async <T = unknown>(
  fileId: string
): Promise<T | null> => {
  const buffer = await downloadFromTelegram(fileId);
  if (!buffer) return null;

  return JSON.parse(buffer.toString('utf8')) as T;
};

export const getTelegramUpdates = async (): Promise<TelegramUpdate[]> => {
  if (!TELEGRAM_BOT_TOKEN) return [];

  const updates: TelegramUpdate[] = [];
  let offset = 0;
  let attempts = 0;

  while (attempts < 10) {
    const params = new URLSearchParams({ limit: '100', timeout: '0' });
    if (offset) params.set('offset', String(offset));

    const response = await fetch(`${getTelegramApiUrl('getUpdates')}?${params}`);
    const result = await response.json();

    if (!result.ok || !Array.isArray(result.result)) return updates;

    const page = result.result;
    updates.push(...page);

    if (page.length < 100) break;

    offset = page[page.length - 1].update_id + 1;
    attempts += 1;
  }

  return updates;
};

export const getLatestJsonDocumentFromTelegram = async <T = unknown>(
  kind: string
): Promise<TelegramJsonDocument<T> | null> => {
  if (!TELEGRAM_CHAT_ID) return null;

  const updates = await getTelegramUpdates();
  const chatId = TELEGRAM_CHAT_ID.toString();
  const candidates: TelegramJsonDocument<T>[] = [];

  for (const update of updates) {
    const message = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
    if (!message || message.chat?.id?.toString() !== chatId) continue;

    const photo = message.photo?.length ? message.photo[message.photo.length - 1] : undefined;
    const file = message.document || photo;
    if (!file?.file_id) continue;

    const metadata = parseTelegramMetadata(message.caption);
    if (getStringMetadata(metadata, 'app') !== 'studypal_archive' || getStringMetadata(metadata, 'kind') !== kind) continue;

    candidates.push({
      data: undefined as unknown as T,
      metadata,
      messageId: message.message_id.toString(),
      fileId: file.file_id,
      uploadedAt: getStringMetadata(metadata, 'uploadedAt'),
    });
  }

  if (!candidates.length) return null;

  const latest = candidates.sort((a, b) => {
    const aTime = Date.parse(a.uploadedAt || '') || Number(a.messageId) || 0;
    const bTime = Date.parse(b.uploadedAt || '') || Number(b.messageId) || 0;
    return bTime - aTime;
  })[0];

  const data = await downloadJsonDocumentFromTelegram<T>(latest.fileId);
  if (!data) return null;

  return {
    ...latest,
    data,
  };
};

// Get file info from Telegram message
export const getFileFromTelegram = async (
  messageId: string
): Promise<TelegramFileInfo | null> => {
  try {
    // Note: Since standard Telegram Bot API does not provide a direct getMessage method,
    // we use forwardMessage to self as a robust workaround to retrieve the message payload.
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/forwardMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          from_chat_id: TELEGRAM_CHAT_ID,
          message_id: parseInt(messageId),
          disable_notification: true,
        }),
      }
    );

    const result = await response.json();

    if (!result.ok || (!result.result?.document && !result.result?.photo)) {
      console.warn('[Telegram GetFile] Failed to forward/fetch message info:', result);
      return null;
    }

    const doc = result.result.document;
    const photo = result.result.photo;
    const fileId = doc?.file_id || (photo ? photo[photo.length - 1]?.file_id : undefined);
    const forwardMessageId = result.result.message_id;

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: forwardMessageId,
      }),
    }).catch((err) => console.error('[Telegram GetFile] Failed to delete forwarded message:', err));

    return {
      fileId: fileId,
      fileSize: doc?.file_size || (photo ? photo[photo.length - 1]?.file_size : undefined) || 0,
      mimeType: doc?.mime_type || 'image/jpeg',
    };
  } catch (error) {
    console.error('Error fetching file from Telegram:', error);
    return null;
  }
};

// Get file URL from Telegram
export const getFilePath = async (fileId: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    const result = await response.json();

    if (!result.ok || !result.result.file_path) {
      return null;
    }

    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${result.result.file_path}`;
  } catch (error) {
    console.error('Error getting file path from Telegram:', error);
    return null;
  }
};

// Download file from Telegram
export const downloadFromTelegram = async (fileId: string): Promise<Buffer | null> => {
  try {
    const filePath = await getFilePath(fileId);
    if (!filePath) return null;

    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading from Telegram:', error);
    return null;
  }
};

// Delete message from Telegram (removes stored file)
export const deleteFromTelegram = async (messageId: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_id: parseInt(messageId),
        }),
      }
    );

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Error deleting from Telegram:', error);
    return false;
  }
};
