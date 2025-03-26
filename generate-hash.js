const bcrypt = require('bcrypt');

async function generateHash() {
  const saltRounds = 10;
  const hash = await bcrypt.hash('password123', saltRounds);
  console.log('Hash for password123:', hash);
}

generateHash();