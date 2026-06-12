import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getMarketplaceItems, addMarketplaceItem, updateMarketplaceItem, deleteMarketplaceItem, getMarketplaceItemById } from '@/lib/dataStore';
import { uploadToTelegram, deleteFromTelegram } from '@/lib/telegram';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const items = getMarketplaceItems() || [];
    // Sort items by upload date (newest first)
    const sorted = [...items].sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return NextResponse.json({ items: sorted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const condition = formData.get('condition') as string;
    const category = formData.get('category') as string;
    const contactInfo = formData.get('contactInfo') as string;

    if (!title || !price || !category || !contactInfo) {
      return NextResponse.json({ error: 'Missing required fields: title, price, category, or contactInfo' }, { status: 400 });
    }

    let telegramMessageId = '';
    let telegramFileId = '';

    if (file) {
      const telegramMetadata = {
        app: 'studypal_marketplace',
        title,
        category,
        uploadedAt: new Date().toISOString()
      };

      const telegramResult = await uploadToTelegram(file, telegramMetadata);
      if (!telegramResult.success) {
        return NextResponse.json({ error: telegramResult.error || 'Failed to upload image to Telegram' }, { status: 502 });
      }

      telegramMessageId = telegramResult.messageId || '';
      telegramFileId = telegramResult.fileId || '';
    }

    const itemRecord = {
      id: `item_${crypto.randomBytes(6).toString('hex')}`,
      title,
      description: description || 'No description provided',
      price: parseFloat(price) || 0,
      condition: condition || 'Good',
      category,
      contactInfo,
      telegramMessageId,
      telegramFileId,
      createdAt: new Date().toISOString(),
      status: 'available',
      uploadedBy: tokenData.email
    };

    addMarketplaceItem(itemRecord);

    return NextResponse.json({
      success: true,
      message: 'Marketplace item successfully added!',
      item: itemRecord
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Marketplace Items API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, price, condition, category, contactInfo, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = parseFloat(price);
    if (condition !== undefined) updates.condition = condition;
    if (category !== undefined) updates.category = category;
    if (contactInfo !== undefined) updates.contactInfo = contactInfo;
    if (status !== undefined) updates.status = status;

    const updated = updateMarketplaceItem(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Marketplace item updated!',
      item: updated
    });
  } catch (error: any) {
    console.error('[Marketplace Items PATCH API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const item = getMarketplaceItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Try deleting image from Telegram if it exists
    if (item.telegramMessageId) {
      try {
        await deleteFromTelegram(item.telegramMessageId);
      } catch (tgErr) {
        console.warn(`[Marketplace Items DELETE] Failed to delete image from Telegram for item ${id}:`, tgErr);
      }
    }

    deleteMarketplaceItem(id);

    return NextResponse.json({
      success: true,
      message: 'Marketplace item deleted successfully!'
    });
  } catch (error: any) {
    console.error('[Marketplace Items DELETE API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
