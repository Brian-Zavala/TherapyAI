// Run the SQL fix script to fix NextAuth tables
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running the NextAuth tables SQL fix script...');

// Get the database URL from environment variables
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const fixScriptPath = path.join(__dirname, 'fix-nextauth-tables.sql');

if (!fs.existsSync(fixScriptPath)) {
  console.error('Fix script not found at path:', fixScriptPath);
  process.exit(1);
}

try {
  // Use psql command to run the script directly on database
  const command = `psql "${process.env.DATABASE_URL}" -f "${fixScriptPath}"`;
  console.log('Executing command:', command);
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('SQL fix script executed successfully.');
  console.log('Now run: npx prisma migrate reset --force');
} catch (error) {
  console.error('Error running SQL fix script:', error.message);
  process.exit(1);
}