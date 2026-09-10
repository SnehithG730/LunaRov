import { SupabaseAuthService } from '../../lib/supabase/client';

console.log('\n--- RUNNING SUPABASE DATABASE & AUTHENTICATION UNIT TESTS ---');

async function runAuthTests() {
  const testEmail = `commander_${Date.now()}@lunarov.space`;
  const correctPassword = 'ApolloSecretPassword123!';
  const wrongPassword = 'IncorrectPassword999!';

  // TEST 1: Register new astronaut with email & password
  console.log('\n[TEST 1] Registering astronaut account...');
  const regResult = await SupabaseAuthService.registerUser(
    'Commander Armstrong',
    testEmail,
    correctPassword
  );

  if (!regResult.success || !regResult.user) {
    throw new Error(`Registration failed: ${regResult.error}`);
  }
  console.log(`  ✓ Astronaut registered successfully: ${regResult.user.fullName} (${regResult.user.email})`);

  // TEST 2: Verify registered email detection
  console.log('\n[TEST 2] Verifying email registry detection...');
  const isRegistered = SupabaseAuthService.isEmailRegistered(testEmail);
  if (!isRegistered) {
    throw new Error('Email was not marked as registered in database vault!');
  }
  console.log('  ✓ Email correctly identified as registered in database.');

  // TEST 3: Attempt login with INCORRECT password (must be strictly rejected)
  console.log('\n[TEST 3] Testing authentication with WRONG password...');
  const wrongLoginResult = await SupabaseAuthService.authenticateUser(
    testEmail,
    wrongPassword
  );

  if (wrongLoginResult.success) {
    throw new Error('Security flaw: Login with incorrect password was accepted!');
  }
  console.log(`  ✓ Access denied for wrong password: "${wrongLoginResult.error}"`);

  // TEST 4: Attempt login with CORRECT password (must succeed)
  console.log('\n[TEST 4] Testing authentication with CORRECT password...');
  const correctLoginResult = await SupabaseAuthService.authenticateUser(
    testEmail,
    correctPassword
  );

  if (!correctLoginResult.success || !correctLoginResult.user) {
    throw new Error(`Login with correct password failed: ${correctLoginResult.error}`);
  }
  console.log(`  ✓ Authentication verified: Welcome ${correctLoginResult.user.fullName}`);

  // TEST 5: Simulate Logout and Re-Login
  console.log('\n[TEST 5] Verifying Logout and Re-Login with password enforcement...');
  await SupabaseAuthService.logout();
  console.log('  ✓ Astronaut logged out.');

  // Re-login must still require the same password
  const reLoginWrong = await SupabaseAuthService.authenticateUser(testEmail, wrongPassword);
  if (reLoginWrong.success) {
    throw new Error('Security flaw: Re-login accepted wrong password!');
  }
  console.log('  ✓ Re-login with wrong password correctly rejected.');

  const reLoginCorrect = await SupabaseAuthService.authenticateUser(testEmail, correctPassword);
  if (!reLoginCorrect.success) {
    throw new Error('Re-login with correct password failed!');
  }
  console.log('  ✓ Re-login with correct password verified successfully.');

  console.log('\n>>> ALL 5 DATABASE AUTHENTICATION TESTS PASSED SUCCESSFULLY! <<<\n');
}

runAuthTests().catch((err) => {
  console.error('\n❌ AUTHENTICATION TEST FAILURE:', err);
  process.exit(1);
});
