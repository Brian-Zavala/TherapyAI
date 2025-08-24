#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Setting up development environment...\n');

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env from .env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Generate a secure NEXTAUTH_SECRET
    const secret = crypto.randomBytes(32).toString('base64');
    envContent = envContent.replace('your-secret-key-here-min-32-chars', secret);
    
    // Set default NEXTAUTH_URL for development
    envContent = envContent.replace('NEXTAUTH_URL=http://localhost:3000', 'NEXTAUTH_URL=http://localhost:3000');
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env created successfully');
    console.log('🔐 Generated secure NEXTAUTH_SECRET');
    console.log('\n⚠️  Please update the following in .env:');
    console.log('   - DATABASE_URL (your PostgreSQL connection string)');
    console.log('   - Supabase keys');
    console.log('   - VAPI credentials');
    console.log('   - Other service API keys as needed\n');
  } else {
    console.error('❌ .env.example not found!');
    process.exit(1);
  }
} else {
  console.log('✅ .env already exists');
  
  // Check if NEXTAUTH_SECRET is set
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('your-secret-key-here-min-32-chars')) {
    console.log('\n⚠️  WARNING: NEXTAUTH_SECRET is not properly set!');
    console.log('   Run this script again with --regenerate-secret to fix it');
  }
}

// Check if NEXTAUTH_URL is properly set
const envContent = fs.readFileSync(envPath, 'utf8');
if (!envContent.includes('NEXTAUTH_URL=')) {
  console.log('\n⚠️  WARNING: NEXTAUTH_URL is not set!');
  console.log('   Adding NEXTAUTH_URL=http://localhost:3000 to .env...');
  fs.appendFileSync(envPath, '\n# Added by setup script\nNEXTAUTH_URL=http://localhost:3000\n');
}

console.log('\n✨ Development environment setup complete!');
console.log('\nNext steps:');
console.log('1. Update your .env with service credentials');
console.log('2. Run: npm install');
console.log('3. Run: npm run prisma:generate');
console.log('4. Run: npm run dev');
console.log('\nHappy coding! 🎉');