import { NextResponse } from 'next/server';

// Redirects to the GitHub raw content — triggers a direct APK download.
// Using a redirect instead of proxying because Vercel serverless functions
// have a 4.5 MB response body limit (APK is ~70 MB).
const APK_GITHUB_URL =
  'https://raw.githubusercontent.com/Itslevy44/studypal/main/application-50b01d0d-4c03-4a84-b166-18c180459a55.apk';

export async function GET() {
  return NextResponse.redirect(APK_GITHUB_URL, { status: 302 });
}
