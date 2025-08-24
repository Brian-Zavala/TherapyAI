const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

// Directories to convert images in
const IMAGE_DIRS = [
  path.join(__dirname, "..", "public", "images"),
  path.join(__dirname, "..", "public", "favicons"),
];

// Track conversion statistics
let stats = {
  converted: 0,
  skipped: 0,
  errors: 0,
  totalSize: 0,
  savedSize: 0,
};

// Convert a single image to WebP
async function convertImage(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase();
  const webpPath = sourcePath.replace(/\.(jpe?g|png)$/i, ".webp");
  
  // Skip if WebP already exists
  if (fs.existsSync(webpPath)) {
    console.log(`${colors.yellow}⏭  Skipping${colors.reset} ${path.basename(sourcePath)} (WebP exists)`);
    stats.skipped++;
    return;
  }

  try {
    const sourceStats = fs.statSync(sourcePath);
    stats.totalSize += sourceStats.size;

    // Configure conversion based on file type
    let sharpInstance = sharp(sourcePath);
    
    if (ext === ".png") {
      // For PNG, preserve transparency and use lossless if needed
      sharpInstance = sharpInstance.webp({ 
        quality: 90,
        alphaQuality: 100,
        lossless: false // Set to true for perfectly lossless
      });
    } else {
      // For JPG/JPEG, use standard quality
      sharpInstance = sharpInstance.webp({ 
        quality: 85,
        effort: 6 // Higher effort = better compression
      });
    }

    await sharpInstance.toFile(webpPath);
    
    const webpStats = fs.statSync(webpPath);
    const savedPercent = Math.round((1 - webpStats.size / sourceStats.size) * 100);
    stats.savedSize += (sourceStats.size - webpStats.size);
    stats.converted++;
    
    console.log(
      `${colors.green}✓ Converted${colors.reset} ${path.basename(sourcePath)} → ${path.basename(webpPath)} ` +
      `${colors.bright}(${savedPercent}% smaller)${colors.reset}`
    );
  } catch (error) {
    stats.errors++;
    console.error(`${colors.red}✗ Error${colors.reset} converting ${sourcePath}:`, error.message);
  }
}

// Recursively find and convert images in a directory
async function convertDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Directory not found:${colors.reset} ${dir}`);
    return;
  }

  console.log(`\n${colors.blue}📁 Processing directory:${colors.reset} ${dir}`);
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await convertDirectory(fullPath);
    } else if (/\.(jpe?g|png)$/i.test(file)) {
      await convertImage(fullPath);
    }
  }
}
// Format file size for display
function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Main conversion function
async function main() {
  console.log(`${colors.bright}${colors.blue}🖼️  WebP Image Converter${colors.reset}`);
  console.log(`${colors.bright}========================${colors.reset}\n`);
  
  const startTime = Date.now();
  
  // Convert images in all specified directories
  for (const dir of IMAGE_DIRS) {
    await convertDirectory(dir);
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.bright}${colors.blue}📊 Conversion Summary${colors.reset}`);
  console.log(`${colors.bright}=====================${colors.reset}`);
  console.log(`${colors.green}✓ Converted:${colors.reset} ${stats.converted} images`);
  console.log(`${colors.yellow}⏭  Skipped:${colors.reset} ${stats.skipped} images (WebP already exists)`);
  
  if (stats.errors > 0) {
    console.log(`${colors.red}✗ Errors:${colors.reset} ${stats.errors} images`);
  }
  
  if (stats.converted > 0) {
    console.log(`${colors.bright}💾 Space saved:${colors.reset} ${formatSize(stats.savedSize)} ` +
                `(${Math.round(stats.savedSize / stats.totalSize * 100)}% reduction)`);
  }
  
  console.log(`${colors.bright}⏱  Time:${colors.reset} ${elapsedTime}s\n`);
  
  if (stats.converted > 0) {
    console.log(`${colors.green}${colors.bright}✅ Success!${colors.reset} WebP images created.`);
    console.log(`\n${colors.yellow}⚠️  Note:${colors.reset} Original images have been preserved.`);
    console.log(`To use WebP images, update your imports in the codebase.`);
    console.log(`\nYou can safely delete the original .jpg/.png files after verifying the WebP versions.`);
  }
}

// Execute the conversion
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});