import { NextResponse } from 'next/server';

// ── App Version Registry ─────────────────────────────────────────────────────
// Update these values whenever you release a new APK.
// latestVersionCode MUST be bumped with every release.
// downloadUrl should point to the public APK download link (e.g. GitHub Release or your domain).
const CURRENT_RELEASE = {
  latestVersion: '1.0.0',
  latestVersionCode: 1,
  downloadUrl: 'https://expo.dev/accounts/kiprotichlevy/projects/studypal-app/builds/6815f51f-527d-464a-aee6-547d3a70eeb0',
  releaseNotes: '• Initial release\n• Browse and download past papers\n• M-Pesa payments\n• Marketplace\n• Offline downloads',
  mandatory: false,
};

export async function GET() {
  return NextResponse.json(CURRENT_RELEASE, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}
