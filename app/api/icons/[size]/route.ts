import { NextRequest, NextResponse } from 'next/server';

// Generates a StudyPal app icon as SVG (served as image/svg+xml)
// Browsers and Android WebAPK will use these for the manifest icons.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const n = parseInt(size, 10) || 192;
  const r = Math.round(n * 0.18); // corner radius

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#d946ef"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="${n}" height="${n}" rx="${r}" fill="url(#bg)"/>
  <text
    x="${n / 2}"
    y="${n * 0.62}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${n * 0.34}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >SP</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
