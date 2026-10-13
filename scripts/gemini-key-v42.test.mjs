import assert from 'node:assert/strict';
import {validKeyFormat} from '../gemini-key-vault.js';
assert.equal(validKeyFormat('x'.repeat(32)),true);
assert.equal(validKeyFormat('x'.repeat(15)),false);
assert.equal(validKeyFormat('x'.repeat(257)),false);
assert.equal(validKeyFormat('contains whitespace'),false);
assert.equal(validKeyFormat(''),false);
console.log('V42 Gemini key format validation passed');