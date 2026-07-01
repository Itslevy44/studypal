/**
 * Run this once to generate placeholder PNG assets for Expo.
 * Usage: node assets/generate-assets.js
 *
 * Requires: npm install canvas  (or just replace the PNG files manually)
 *
 * Alternatively, use any image editor to create:
 *   - icon.png          1024x1024  (app icon, shown on home screen)
 *   - adaptive-icon.png 1024x1024  (Android adaptive icon foreground)
 *   - splash.png        1284x2778  (splash screen, shown on app launch)
 *
 * The images should use the StudyPal brand colors:
 *   Primary:   #4f46e5  (indigo)
 *   Secondary: #d946ef  (fuchsia)
 *   Dark bg:   #020617  (splash background)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function makeIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#4f46e5');
  grad.addColorStop(0.5, '#d946ef');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;

  // Rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // "SP" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.38}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SP', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, filename), buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

function makeSplash() {
  const w = 1284, h = 2778;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, h);

  // Gradient circle
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.4);
  grad.addColorStop(0, 'rgba(79,70,229,0.3)');
  grad.addColorStop(1, 'rgba(79,70,229,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // "SP" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${w * 0.25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SP', w/2, h/2 - 60);

  ctx.fillStyle = '#818cf8';
  ctx.font = `${w * 0.06}px Arial`;
  ctx.fillText('StudyPal', w/2, h/2 + 80);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'splash.png'), buffer);
  console.log('Created splash.png (1284x2778)');
}

makeIcon(1024, 'icon.png');
makeIcon(1024, 'adaptive-icon.png');
makeSplash();
console.log('\nDone! Assets are ready for Expo.');
