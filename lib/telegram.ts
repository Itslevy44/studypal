// Telegram utility for storing and retrieving past papers
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

// Upload file to Telegram
export const uploadToTelegram = async (
  file: File,
  metadata: Record<string, any>
): Promise<TelegramUploadResult> => {
  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID!);
    formData.append('caption', JSON.stringify(metadata));
    formData.append('document', file);

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    
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
    const fileId = doc?.file_id;
    console.log('[Telegram Upload] Success! Message ID:', result.result.message_id, 'File ID:', fileId);
    
    return {
      success: true,
      messageId: result.result.message_id.toString(),
      fileId: fileId,
    };
  } catch (error: any) {
    console.error('[Telegram Upload] Exception:', {
      message: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message || 'Telegram upload failed',
    };
  }
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

    if (!result.ok || !result.result?.document) {
      console.warn('[Telegram GetFile] Failed to forward/fetch message info:', result);
      return null;
    }

    const doc = result.result.document;
    const forwardMessageId = result.result.message_id;

    // Asynchronously delete the forwarded message to keep the chat clean
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: forwardMessageId,
      }),
    }).catch((err) => console.error('[Telegram GetFile] Failed to delete forwarded message:', err));

    return {
      fileId: doc.file_id,
      fileSize: doc.file_size,
      mimeType: doc.mime_type || 'application/octet-stream',
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
