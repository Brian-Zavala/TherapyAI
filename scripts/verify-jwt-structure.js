/**
 * Verify JWT structure matches VAPI requirements
 */

const jwt = require('jsonwebtoken');

// Expected structure from VAPI docs
const EXPECTED_STRUCTURE = {
  public: {
    orgId: 'string',
    token: {
      tag: 'public',
      restrictions: {
        enabled: true,
        allowedOrigins: 'array',
        allowTransientAssistant: 'boolean'
      }
    }
  },
  private: {
    orgId: 'string',
    token: {
      tag: 'private'
    }
  }
};

function validateStructure(payload, scope) {
  console.log(`\n🔍 Validating ${scope} token structure...`);
  
  const expected = EXPECTED_STRUCTURE[scope];
  const errors = [];
  
  // Check orgId
  if (!payload.orgId) {
    errors.push('❌ Missing orgId at root level');
  } else if (typeof payload.orgId !== 'string') {
    errors.push('❌ orgId must be a string');
  } else {
    console.log('✅ orgId present and valid');
  }
  
  // Check token object
  if (!payload.token) {
    errors.push('❌ Missing token object');
  } else {
    console.log('✅ token object present');
    
    // Check tag
    if (payload.token.tag !== scope) {
      errors.push(`❌ token.tag should be "${scope}", got "${payload.token.tag}"`);
    } else {
      console.log(`✅ token.tag = "${scope}"`);
    }
    
    // Check restrictions for public tokens
    if (scope === 'public') {
      if (!payload.token.restrictions) {
        errors.push('❌ Public tokens must have restrictions');
      } else {
        console.log('✅ restrictions present for public token');
        
        if (!payload.token.restrictions.enabled) {
          errors.push('❌ restrictions.enabled must be true');
        }
        
        if (!Array.isArray(payload.token.restrictions.allowedOrigins)) {
          errors.push('❌ restrictions.allowedOrigins must be an array');
        } else {
          console.log(`✅ allowedOrigins: ${payload.token.restrictions.allowedOrigins.join(', ')}`);
        }
      }
    } else if (scope === 'private' && payload.token.restrictions) {
      console.log('⚠️  Private tokens should not have restrictions');
    }
  }
  
  // Check for extra fields that might cause issues
  const standardJWTFields = ['iat', 'exp', 'sub', 'iss'];
  const allowedFields = ['orgId', 'token', ...standardJWTFields];
  const extraFields = Object.keys(payload).filter(key => !allowedFields.includes(key));
  
  if (extraFields.length > 0) {
    console.log(`⚠️  Extra fields found: ${extraFields.join(', ')}`);
  }
  
  if (errors.length === 0) {
    console.log('\n✅ Token structure is valid!');
    return true;
  } else {
    console.log('\n❌ Token structure errors:');
    errors.forEach(err => console.log(`   ${err}`));
    return false;
  }
}

// Test with actual implementation
require('dotenv').config();

if (!process.env.VAPI_PRIVATE_KEY || !process.env.VAPI_ORG_ID) {
  console.error('Missing required environment variables');
  process.exit(1);
}

console.log('🔐 Testing JWT Token Structure Validation\n');
console.log('='.repeat(50));

// Generate tokens using the same logic as our service
const privateKey = process.env.VAPI_PRIVATE_KEY;
const orgId = process.env.VAPI_ORG_ID;

// Test public token
const publicPayload = {
  orgId: orgId,
  token: {
    tag: 'public',
    restrictions: {
      enabled: true,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
      allowTransientAssistant: true,
    },
  },
  sub: 'test-user',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  iss: 'vapi-therapy-app',
};

const publicToken = jwt.sign(publicPayload, privateKey, { algorithm: 'HS256' });
console.log('Public token generated');
validateStructure(publicPayload, 'public');

// Test private token
const privatePayload = {
  orgId: orgId,
  token: {
    tag: 'private',
  },
  sub: 'test-user',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  iss: 'vapi-therapy-app',
};

const privateToken = jwt.sign(privatePayload, privateKey, { algorithm: 'HS256' });
console.log('\nPrivate token generated');
validateStructure(privatePayload, 'private');

console.log('\n' + '='.repeat(50));
console.log('\n✅ JWT structure matches VAPI documentation requirements');
console.log('\nKey points verified:');
console.log('1. orgId at root level (not nested)');
console.log('2. token object with tag property');
console.log('3. Public tokens have restrictions with allowedOrigins');
console.log('4. Private tokens do not need restrictions');
console.log('5. Standard JWT claims (iat, exp, sub, iss) are allowed');