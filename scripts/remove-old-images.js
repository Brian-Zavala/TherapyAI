const fs = require("fs");
const path = require("path");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

// Directories to clean up
const IMAGE_DIRS = [
  path.join(__dirname, "..", "public", "images"),
  path.join(__dirname, "..", "public", "favicons"),
];

// Track removal statistics
let stats = {
  removed: 0,
  skipped: 0,
  errors: 0,
  totalSize: 0,
};

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
}// Remove old image if WebP version exists
function removeOldImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const webpPath = imagePath.replace(/\.(jpe?g|png)$/i, ".webp");
  
  // Only remove if WebP version exists
  if (!fs.existsSync(webpPath)) {
    console.log(`${colors.yellow}⏭  Skipping${colors.reset} ${path.basename(imagePath)} (no WebP version found)`);
    stats.skipped++;
    return false;
  }
  
  try {
    const fileStats = fs.statSync(imagePath);
    stats.totalSize += fileStats.size;
    
    // Remove the old image
    fs.unlinkSync(imagePath);
    stats.removed++;
    
    console.log(
      `${colors.red}🗑  Removed${colors.reset} ${path.basename(imagePath)} ` +
      `${colors.bright}(${formatSize(fileStats.size)})${colors.reset}`
    );
    return true;
  } catch (error) {
    stats.errors++;
    console.error(`${colors.red}✗ Error${colors.reset} removing ${imagePath}:`, error.message);
    return false;
  }
}

// Recursively find and remove old images in a directory
function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Directory not found:${colors.reset} ${dir}`);
    return;
  }
  
  console.log(`\n${colors.blue}📁 Cleaning directory:${colors.reset} ${dir}`);
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      cleanDirectory(fullPath);
    } else if (/\.(jpe?g|png)$/i.test(file)) {
      removeOldImage(fullPath);
    }
  }
}

// Main cleanup function
function main() {
  console.log(`${colors.bright}${colors.red}🧹 Old Image Cleanup${colors.reset}`);
  console.log(`${colors.bright}=====================${colors.reset}\n`);
  console.log(`${colors.yellow}⚠️  WARNING:${colors.reset} This will permanently delete all JPG/PNG images that have WebP versions.\n`);
  
  const startTime = Date.now();
  
  // Clean all image directories
  for (const dir of IMAGE_DIRS) {
    cleanDirectory(dir);
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.bright}${colors.blue}📊 Cleanup Summary${colors.reset}`);
  console.log(`${colors.bright}==================${colors.reset}`);
  console.log(`${colors.red}🗑  Removed:${colors.reset} ${stats.removed} images`);
  console.log(`${colors.yellow}⏭  Skipped:${colors.reset} ${stats.skipped} images (no WebP version)`);
  
  if (stats.errors > 0) {
    console.log(`${colors.red}✗ Errors:${colors.reset} ${stats.errors}`);
  }
  
  if (stats.removed > 0) {
    console.log(`${colors.bright}💾 Space freed:${colors.reset} ${formatSize(stats.totalSize)}`);
  }
  
  console.log(`${colors.bright}⏱  Time:${colors.reset} ${elapsedTime}s\n`);
  
  if (stats.removed > 0) {
    console.log(`${colors.green}${colors.bright}✅ Cleanup complete!${colors.reset} Old images have been removed.`);
    console.log(`${colors.cyan}💡 Tip:${colors.reset} The WebP images are now the only versions in your project.`);
  } else {
    console.log(`${colors.yellow}No images were removed.${colors.reset} Either no old images found or they don't have WebP versions.`);
  }
}

// Execute the cleanup
main();