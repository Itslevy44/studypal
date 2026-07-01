import { NextResponse } from 'next/server';

// Redirects to the GitHub Releases CDN — triggers a direct APK download.
// Using a redirect instead of proxying because Vercel serverless functions
// have a 4.5 MB response body limit (APK is ~70 MB).
const APK_GITHUB_URL =
  'https://github.com/Itslevy44/studypal/releases/download/v1.0.0/studypal-v1.0.0.apk';

export async function GET() {
  return NextResponse.redirect(APK_GITHUB_URL, { status: 302 });
}
