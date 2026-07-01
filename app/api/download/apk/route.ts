import { NextResponse } from 'next/server';

// Proxies the APK download so users get a direct file download
// without any page redirect (GitHub releases redirect to S3 CDN).
const APK_GITHUB_URL =
  'https://github.com/Itslevy44/studypal/releases/download/v1.0.0/studypal-v1.0.0.apk';

export async function GET() {
  const upstream = await fetch(APK_GITHUB_URL, { redirect: 'follow' });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'APK not found' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="studypal-v1.0.0.apk"',
      'Content-Length': upstream.headers.get('Content-Length') ?? '',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
