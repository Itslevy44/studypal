import { NextResponse } from 'next/server';

// ── App Version Registry ─────────────────────────────────────────────────────
// Update these values whenever you release a new APK.
// latestVersionCode MUST be bumped with every release.
// downloadUrl should point to the public APK download link (e.g. GitHub Release or your domain).
const CURRENT_RELEASE = {
  latestVersion: '1.4.0',
  latestVersionCode: 8,
  downloadUrl: 'https://studypal-rust.vercel.app/api/download/apk',
  releaseNotes: '• Migrated all backend data to fully Telegram-backed JSON storage\n• Improved reliability of data caching and index sync\n• Fixed types across all API routes for production readiness\n• Updated admin panel with integrated Telegram Store configuration tool',
  mandatory: false,
};

export async function GET() {
  return NextResponse.json(CURRENT_RELEASE, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}
