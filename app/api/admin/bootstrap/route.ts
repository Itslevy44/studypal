/**
 * POST /api/admin/bootstrap
 *
 * One-time admin endpoint that uploads all local data collections to Telegram,
 * builds the master index, and returns the new TELEGRAM_INDEX_FILE_ID.
 *
 * After calling this endpoint:
 *   1. Copy the returned `indexFileId` into your .env.local as TELEGRAM_INDEX_FILE_ID
 *   2. Also set it in your Vercel environment variables
 *   3. Restart the dev server / redeploy
 *
 * This endpoint is safe to call multiple times — each call creates a fresh index.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// All collections to bootstrap
const COLLECTIONS = [
  'users',
  'universities',
  'papers',
  'subscriptions',
  'marketplace_items',
  'advertisements',
  'notices',
  'pending_payments',
] as const;

type CollectionName = typeof COLLECTIONS[number];

interface IndexEntry {
  fileId: string;
  msgId: number;
}

// Read local JSON file, return [] if missing or invalid
function readLocalJson(name: string): unknown[] {
  try {
    const filePath = path.join(process.cwd(), 'data', `${name}.json`);
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Upload a JSON array as a document to Telegram
async function uploadCollection(
  name: string,
  data: unknown[]
): Promise<{ fileId: string; msgId: number } | null> {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const file = new File([blob], `studypal_${name}.json`, {
      type: 'application/json',
    });
    const caption = JSON.stringify({
      app: 'studypal_store',
      kind: name,
      ts: Date.now(),
    });
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', caption);
    form.append('document', file);

    const res = await fetch(`${API}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    const j = await res.json();
    if (!j.ok) {
      console.error(`[Bootstrap] Failed to upload ${name}:`, j.description);
      return null;
    }
    return {
      fileId: j.result.document.file_id,
      msgId: j.result.message_id,
    };
  } catch (e) {
    console.error(`[Bootstrap] Exception uploading ${name}:`, e);
    return null;
  }
}

// Upload the index document to Telegram
async function pinMessage(msgId: number) {
  try {
    await fetch(`${API}/pinChatMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, message_id: msgId, disable_notification: true }),
    });
  } catch (e) {
    console.warn('[Bootstrap] Could not pin index message:', e);
  }
}

async function uploadIndex(
  index: Record<string, IndexEntry>
): Promise<{ fileId: string; msgId: number } | null> {
  try {
    const blob = new Blob([JSON.stringify(index, null, 2)], {
      type: 'application/json',
    });
    const file = new File([blob], 'studypal_index.json', {
      type: 'application/json',
    });
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append(
      'caption',
      JSON.stringify({ app: 'studypal_index', ts: Date.now() })
    );
    form.append('document', file);

    const res = await fetch(`${API}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    const j = await res.json();
    if (!j.ok) {
      console.error('[Bootstrap] Failed to upload index:', j.description);
      return null;
    }
    const result = {
      fileId: j.result.document.file_id,
      msgId: j.result.message_id,
    };
    await pinMessage(result.msgId);
    return result;
  } catch (e) {
    console.error('[Bootstrap] Exception uploading index:', e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Must be admin
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment.' },
        { status: 500 }
      );
    }

    const results: Record<string, { count: number; fileId: string; msgId: number } | { error: string }> = {};
    const index: Record<string, IndexEntry> = {};

    // Upload each collection
    for (const name of COLLECTIONS) {
      const data = readLocalJson(name);
      console.log(`[Bootstrap] Uploading ${name} (${data.length} records)...`);

      const result = await uploadCollection(name, data);
      if (!result) {
        results[name] = { error: 'Upload failed' };
        continue;
      }

      index[name] = { fileId: result.fileId, msgId: result.msgId };
      results[name] = { count: data.length, fileId: result.fileId, msgId: result.msgId };
    }

    // Upload the index
    console.log('[Bootstrap] Uploading index...');
    const indexResult = await uploadIndex(index);
    if (!indexResult) {
      return NextResponse.json(
        { error: 'Failed to upload index to Telegram. Collections may have been uploaded.', results },
        { status: 500 }
      );
    }

    console.log(`[Bootstrap] ✅ Done! Index file_id: ${indexResult.fileId}`);

    return NextResponse.json({
      success: true,
      message: '✅ Bootstrap complete! Copy indexFileId into your environment variables.',
      indexFileId: indexResult.fileId,
      indexMsgId: indexResult.msgId,
      instructions: [
        `1. Add to .env.local:  TELEGRAM_INDEX_FILE_ID=${indexResult.fileId}`,
        '2. Add the same value to your Vercel environment variables.',
        '3. Restart the dev server (or redeploy).',
        '4. All data will now be served from Telegram.',
      ],
      collections: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bootstrap failed';
    console.error('[Bootstrap] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
