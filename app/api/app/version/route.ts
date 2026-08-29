import { NextResponse } from 'next/server';

// ── App Version Registry ─────────────────────────────────────────────────────
// Update these values whenever you release a new APK.
// latestVersionCode MUST be bumped with every release.
// downloadUrl should point to the public APK download link (e.g. GitHub Release or your domain).
const CURRENT_RELEASE = {
  latestVersion: '1.4.2',
  latestVersionCode: 9,
  downloadUrl: 'https://studypal-rust.vercel.app/api/download/apk',
  releaseNotes: '• In-app PDF viewer (light theme, no external app needed)\n• 7-day free trial for new signups\n• Phone number field on registration\n• Subscription expiry reminder on dashboard\n• Marketplace sold status persists correctly\n• General papers section for all students\n• Screenshot prevention\n• Single-device login enforcement',
  mandatory: false,
};

export async function GET() {
  return NextResponse.json(CURRENT_RELEASE, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}
