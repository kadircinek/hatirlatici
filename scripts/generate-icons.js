const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/logo.svg'));
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `../public/logo${size}.png`));
    
    console.log(`Generated logo${size}.png`);
  }
}

generateIcons().catch(console.error); 