const { validateDisplayName, cleanDisplayName } = require('../src/utils/nameValidator');

const PASS_CASES = [
  'Raushan Kumar',
  'Prof Kumar Singh',
  'Dr Chandra Prakash Banerjee',
  'Mr Kumar',
  'Mrs Sunita Devi',
  'Er Kumar Prakash',
  'Prof. A K Singh',
  'Dr. Rajesh Kumar',
  'Er Amit Kumar'
];

const FAIL_CASES = [
  'aaa aaa aaa Raushan Kumar',
  'Raushan123 Kumar',
  'Raushan @ Kumar',
  'Raushan Raushan',
  'Kumar Kumar',
  '😊 Raushan Kumar',
  'Raushan___Kumar',
  'Prof Dr Mr Kumar Singh',
  'Raushan Kumar Singh Prakash Verma',
  'Raushan',
  'Kumar',
  'Dr.. Kumar',
  'Raushan     Kumar', // Note: cleaned name must be passed to validate, but if uncleaned is tested directly:
  'aaaa aaa aaa',
  'xyz xyz xyz',
  'test test',
  'Raushan raushan',
  'KUMAR Kumar',
  'Dr Kumar Kumar'
];

console.log('=== START DISPLAY NAME VALIDATION UNIT TESTS ===\n');

let passCount = 0;
let failCount = 0;

console.log('--- TESTING MUST PASS CASES ---');
for (const tc of PASS_CASES) {
  const cleaned = cleanDisplayName(tc);
  const err = validateDisplayName(cleaned);
  if (err === null) {
    console.log(`[PASS] "${tc}" successfully passed validation!`);
    passCount++;
  } else {
    console.error(`[FAIL] "${tc}" was rejected with error: "${err}" but should have passed!`);
  }
}

console.log('\n--- TESTING MUST FAIL CASES ---');
for (const tc of FAIL_CASES) {
  const cleaned = cleanDisplayName(tc);
  const err = validateDisplayName(cleaned); // note: testing direct uncleaned as well:
  const directErr = validateDisplayName(tc);
  const finalErr = err || directErr;

  if (finalErr !== null) {
    console.log(`[PASS] "${tc}" correctly rejected with error: "${finalErr}"`);
    failCount++;
  } else {
    console.error(`[FAIL] "${tc}" was allowed but should have failed!`);
  }
}

console.log('\n=== TEST SUMMARY ===');
console.log(`Total Must-Pass Tested: ${PASS_CASES.length}, Passed: ${passCount}`);
console.log(`Total Must-Fail Tested: ${FAIL_CASES.length}, Rejected: ${failCount}`);

if (passCount === PASS_CASES.length && failCount === FAIL_CASES.length) {
  console.log('\n🌟 ALL UNIT TESTS PASSED SUCCESSFULLY! 🌟');
  process.exit(0);
} else {
  console.error('\n❌ SOME UNIT TESTS FAILED! ❌');
  process.exit(1);
}
