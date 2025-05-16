// Check if all required environment variables are set
require('dotenv').config({ path: '.env.local' });

console.log('Environment variables check:');
console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Missing (using default)');
console.log('- NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Missing');

if (!process.env.NEXTAUTH_SECRET) {
  console.log('\nTo generate a NEXTAUTH_SECRET, run:');
  console.log('openssl rand -base64 32');
}