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
};

// Directories to search for files containing image references
const SOURCE_DIRS = [
  path.join(__dirname, "..", "src"),
];

// File extensions to search in
const FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mdx", ".css", ".scss"];

// Track update statistics
let stats = {
  filesUpdated: 0,
  referencesUpdated: 0,
  filesSkipped: 0,
  errors: 0,
};

// Update image references in a file
function updateImageReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;
    
    // Pattern to match image references
    // Matches: .jpg", .jpeg", .png" (with quotes)
    const imagePattern = /\.(jpg|jpeg|png)(?=["'])/gi;
    
    // Check if file contains image references
    if (!imagePattern.test(content)) {
      return false;
    }
    
    // Reset regex lastIndex
    imagePattern.lastIndex = 0;
    
    // Replace all image extensions with .webp
    let updatedContent = content.replace(imagePattern, ".webp");
    
    // Check if any changes were made
    if (updatedContent === originalContent) {
      return false;
    }
    
    // Count the number of replacements
    const matches = content.match(imagePattern);
    const replacementCount = matches ? matches.length : 0;
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent, "utf8");
    
    stats.filesUpdated++;
    stats.referencesUpdated += replacementCount;
    
    console.log(
      `${colors.green}✓ Updated${colors.reset} ${path.relative(process.cwd(), filePath)} ` +
      `${colors.bright}(${replacementCount} references)${colors.reset}`
    );
    
    return true;
  } catch (error) {
    stats.errors++;
    console.error(`${colors.red}✗ Error${colors.reset} updating ${filePath}:`, error.message);
    return false;
  }
}// Recursively search and update files in a directory
function updateDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Directory not found:${colors.reset} ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (file === "node_modules" || file === ".next" || file === "dist" || file === "build") {
        continue;
      }
      updateDirectory(fullPath);
    } else {
      // Check if file has a supported extension
      const ext = path.extname(file).toLowerCase();
      if (FILE_EXTENSIONS.includes(ext)) {
        const updated = updateImageReferences(fullPath);
        if (!updated) {
          stats.filesSkipped++;
        }
      }
    }
  }
}

// Main function
function main() {
  console.log(`${colors.bright}${colors.blue}🔄 Image Reference Updater${colors.reset}`);
  console.log(`${colors.bright}============================${colors.reset}\n`);
  console.log(`Updating all .jpg, .jpeg, and .png references to .webp...\n`);
  
  const startTime = Date.now();
  
  // Update all source directories
  for (const dir of SOURCE_DIRS) {
    console.log(`${colors.blue}📁 Processing directory:${colors.reset} ${dir}\n`);
    updateDirectory(dir);
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.bright}${colors.blue}📊 Update Summary${colors.reset}`);
  console.log(`${colors.bright}==================${colors.reset}`);
  console.log(`${colors.green}✓ Files updated:${colors.reset} ${stats.filesUpdated}`);
  console.log(`${colors.green}✓ References updated:${colors.reset} ${stats.referencesUpdated}`);
  console.log(`${colors.yellow}⏭  Files skipped:${colors.reset} ${stats.filesSkipped} (no image references)`);
  
  if (stats.errors > 0) {
    console.log(`${colors.red}✗ Errors:${colors.reset} ${stats.errors}`);
  }
  
  console.log(`${colors.bright}⏱  Time:${colors.reset} ${elapsedTime}s\n`);
  
  if (stats.filesUpdated > 0) {
    console.log(`${colors.green}${colors.bright}✅ Success!${colors.reset} All image references have been updated to use WebP.`);
    console.log(`\n${colors.yellow}⚠️  Important:${colors.reset} Please verify that all WebP images exist before deploying.`);
    console.log(`You may want to run a build to ensure everything works correctly.`);
  } else {
    console.log(`${colors.yellow}No files needed updating.${colors.reset} All references may already be using WebP.`);
  }
}

// Execute the update
main();