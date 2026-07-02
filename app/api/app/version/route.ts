import { NextResponse } from 'next/server';

// ── App Version Registry ─────────────────────────────────────────────────────
// Update these values whenever you release a new APK.
// latestVersionCode MUST be bumped with every release.
// downloadUrl should point to the public APK download link (e.g. GitHub Release or your domain).
const CURRENT_RELEASE = {
  latestVersion: '1.1.0',
  latestVersionCode: 2,
  downloadUrl: 'https://studypal-rust.vercel.app/api/download/apk',
  releaseNotes: '• Fixed offline PDF viewer (no more errors opening papers)\n• Downloads now show correct paper names\n• Notice board moved to top of Marketplace\n• Full ad info now displayed\n• Cleaner paper pricing\n• In-app update notifications',
  mandatory: false,
};

export async function GET() {
  return NextResponse.json(CURRENT_RELEASE, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}
