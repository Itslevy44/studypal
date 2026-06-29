import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getAdvertisements, addAdvertisement, updateAdvertisement, deleteAdvertisement } from '@/lib/dataStore';
import { uploadToTelegram, deleteFromTelegram } from '@/lib/telegram';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const showAll = url.searchParams.get('all') === 'true';

    const ads = (await getAdvertisements()) || [];
    
    let returnedAds = ads;
    if (!showAll) {
      returnedAds = ads.filter((ad: any) => ad.status === 'active');
    }

    const sorted = [...returnedAds].sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return NextResponse.json({ advertisements: sorted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch advertisements' }, { status: 500 });
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
    const linkUrl = formData.get('linkUrl') as string;

    if (!title || !file) {
      return NextResponse.json({ error: 'Missing required fields: title and file are required' }, { status: 400 });
    }

    const telegramMetadata = {
      app: 'studypal_advertisements',
      title,
      uploadedAt: new Date().toISOString()
    };

    const telegramResult = await uploadToTelegram(file, telegramMetadata);
    if (!telegramResult.success) {
      return NextResponse.json({ error: telegramResult.error || 'Failed to upload image to Telegram' }, { status: 502 });
    }

    const adRecord = {
      id: `ad_${crypto.randomBytes(6).toString('hex')}`,
      title,
      description: description || '',
      linkUrl: linkUrl || '',
      telegramMessageId: telegramResult.messageId || '',
      telegramFileId: telegramResult.fileId || '',
      createdAt: new Date().toISOString(),
      status: 'active',
      uploadedBy: tokenData.email
    };

    await addAdvertisement(adRecord);

    return NextResponse.json({
      success: true,
      message: 'Advertisement banner successfully added!',
      advertisement: adRecord
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Advertisements API] Error:', error);
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
    const { id, title, description, linkUrl, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (linkUrl !== undefined) updates.linkUrl = linkUrl;
    if (status !== undefined) updates.status = status;

    const updated = await updateAdvertisement(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Advertisement updated!',
      advertisement: updated
    });
  } catch (error: any) {
    console.error('[Advertisements PATCH API] Error:', error);
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

    const ads = await getAdvertisements();
    const ad = ads.find((a: any) => a.id === id);
    if (!ad) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
    }

    // Try deleting image from Telegram if it exists
    if (ad.telegramMessageId) {
      try {
        await deleteFromTelegram(ad.telegramMessageId);
      } catch (tgErr) {
        console.warn(`[Advertisements DELETE] Failed to delete image from Telegram for ad ${id}:`, tgErr);
      }
    }

    await deleteAdvertisement(id);

    return NextResponse.json({
      success: true,
      message: 'Advertisement deleted successfully!'
    });
  } catch (error: any) {
    console.error('[Advertisements DELETE API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
