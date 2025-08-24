#!/usr/bin/env node

/**
 * CSRF Protection Toggle Script
 * 
 * Usage:
 *   npm run csrf:disable  # Disable CSRF protection in development
 *   npm run csrf:enable   # Enable CSRF protection in development
 *   node scripts/toggle-csrf.js [enable|disable]
 * 
 * This script helps toggle CSRF protection during development.
 * CSRF is always enabled in production for security.
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const CSRF_KEY = 'DISABLE_CSRF_PROTECTION';

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env file not found!');
    process.exit(1);
  }
  return fs.readFileSync(ENV_FILE, 'utf8');
}

function writeEnvFile(content) {
  fs.writeFileSync(ENV_FILE, content, 'utf8');
}

function toggleCSRF(action) {
  const envContent = readEnvFile();
  const lines = envContent.split('\n');
  
  let found = false;
  const newLines = lines.map(line => {
    if (line.startsWith(`${CSRF_KEY}=`)) {
      found = true;
      const newValue = action === 'disable' ? 'true' : 'false';
      return `${CSRF_KEY}=${newValue}`;
    }
    return line;
  });

  // If CSRF_KEY not found, add it
  if (!found) {
    const newValue = action === 'disable' ? 'true' : 'false';
    newLines.push(`${CSRF_KEY}=${newValue}`);
  }

  writeEnvFile(newLines.join('\n'));
  
  const status = action === 'disable' ? 'DISABLED' : 'ENABLED';
  const emoji = action === 'disable' ? '🔓' : '🛡️';
  
  console.log(`${emoji} CSRF Protection ${status} in development mode`);
  console.log('🔄 Restart your development server for changes to take effect');
  
  if (action === 'disable') {
    console.log('⚠️  Note: CSRF protection is always enabled in production');
  }
}

function showUsage() {
  console.log(`
🛡️  CSRF Protection Toggle

Usage:
  node scripts/toggle-csrf.js enable   # Enable CSRF protection
  node scripts/toggle-csrf.js disable  # Disable CSRF protection

Or use the npm scripts:
  npm run csrf:enable
  npm run csrf:disable

Current status: ${getCurrentStatus()}
  `);
}

function getCurrentStatus() {
  try {
    const envContent = readEnvFile();
    const match = envContent.match(new RegExp(`${CSRF_KEY}=(.+)`));
    if (match) {
      const isDisabled = match[1].trim() === 'true';
      return isDisabled ? '🔓 DISABLED' : '🛡️ ENABLED';
    }
    return '🛡️ ENABLED (default)';
  } catch (error) {
    return '❓ UNKNOWN';
  }
}

// Main execution
const action = process.argv[2];

if (!action) {
  showUsage();
  process.exit(0);
}

switch (action.toLowerCase()) {
  case 'enable':
  case 'on':
    toggleCSRF('enable');
    break;
  case 'disable':
  case 'off':
    toggleCSRF('disable');
    break;
  case 'status':
    console.log(`Current CSRF status: ${getCurrentStatus()}`);
    break;
  default:
    console.error(`❌ Unknown action: ${action}`);
    showUsage();
    process.exit(1);
}