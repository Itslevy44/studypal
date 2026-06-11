import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { addPaper, getUniversityById } from '@/lib/dataStore';
import { uploadToTelegram } from '@/lib/telegram';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_ID = TELEGRAM_BOT_TOKEN?.split(':')[0];

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const university = formData.get('university') as string;
    const campus = formData.get('campus') as string;
    const year = formData.get('year') as string;
    const cost = formData.get('cost') as string;
    const duration = formData.get('duration') as string;
    const course = formData.get('course') as string;
    const examPeriod = formData.get('examPeriod') as string;
    const description = formData.get('description') as string;

    // Validation
    if (!file || !university || !campus || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: file, university, campus, or year' },
        { status: 400 }
      );
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Telegram credentials are not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
    }

    // Upload to Telegram
    const universityName = getUniversityById(university)?.name || university;
    const telegramMetadata = {
      app: 'studypal_archive',
      university: universityName,
      campus,
      year,
      course,
      examPeriod,
      description,
      uploadedAt: new Date().toISOString()
    };

    const telegramResult = await uploadToTelegram(file, telegramMetadata);
    console.log('Telegram upload result:', telegramResult);

    if (!telegramResult.success) {
      const sameAsBotId = TELEGRAM_CHAT_ID && TELEGRAM_BOT_ID && TELEGRAM_CHAT_ID === TELEGRAM_BOT_ID;
      const friendlyError = telegramResult.error?.includes("bot can't send messages to the bot")
        ? sameAsBotId
          ? 'Telegram chat ID is configured as the bot ID. Use the destination chat/group ID instead of the bot ID, and ensure the bot is added to that chat.'
          : 'Telegram chat ID is invalid or the bot is not permitted to send to this chat. Ensure the bot is added to the target chat and the chat ID is correct.'
        : telegramResult.error || 'Failed to upload to Telegram';

      return NextResponse.json(
        { error: friendlyError },
        { status: 502 }
      );
    }

    // Create paper record
    const paperRecord = {
      id: `paper_${crypto.randomBytes(6).toString('hex')}`,
      title: `${course || 'Past Paper'} - ${examPeriod || 'Unknown Period'}`,
      university,
      universityName,
      campus,
      yearOfStudy: year,
      course: course || 'Unknown Course',
      examPeriod: examPeriod || 'Unknown',
      cost: parseFloat(cost) || 0,
      accessDuration: duration || '30 Days',
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileName: file.name,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: tokenData.email,
      telegramMessageId: telegramResult.messageId,
      telegramFileId: telegramResult.fileId,
      totalDownloads: 0,
      description: description || 'No description provided'
    };

    // Save paper record
    addPaper(paperRecord);

    return NextResponse.json({
      success: true,
      message: 'Paper successfully uploaded and archived!',
      paper: paperRecord
    }, { status: 201 });

  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}