const { createCanvas } = (() => {
  // Simple script to generate placeholder PNG assets
  // Run: node generate-assets.js (requires 'canvas' package - optional)
  // Or simply replace these files with proper icons manually
  try {
    return require('canvas');
  } catch {
    return { createCanvas: null };
  }
})();

const fs = require('fs');
const path = require('path');

function createPlaceholder(filename, size) {
  const filepath = path.join(__dirname, 'assets', filename);
  if (fs.existsSync(filepath)) return;

  if (!createCanvas) {
    // Create a minimal 1x1 transparent PNG as placeholder
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(filepath, png1x1);
    console.log(`Created placeholder: ${filename}`);
    return;
  }

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#080d19';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3b82f6';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TT', size / 2, size / 2);
  fs.writeFileSync(filepath, canvas.toBuffer('image/png'));
  console.log(`Created: ${filename}`);
}

createPlaceholder('icon.png', 1024);
createPlaceholder('splash.png', 1284);
createPlaceholder('adaptive-icon.png', 1024);
createPlaceholder('notification-icon.png', 96);
createPlaceholder('favicon.png', 48);

console.log('\nAsset placeholders created. Replace with real icons for production.');
