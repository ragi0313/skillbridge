const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Password123!';
  const hash = await bcrypt.hash(password, 12);

  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('');

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? '✅ Hash is correct' : '❌ Hash is invalid');

  return hash;
}

generateHash().catch(console.error);
