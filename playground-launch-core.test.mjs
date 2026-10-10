import assert from 'node:assert/strict';
import {launchInfo,trustedExternalLink} from './playground-launch-core.mjs';
assert.equal(trustedExternalLink('https://github.com/example/repo'),null);
assert.equal(trustedExternalLink('javascript:alert(1)'),null);
assert.equal(trustedExternalLink('https://example.org/demo'),'https://example.org/demo');
assert.equal(launchInfo({website:'https://example.org'}).kind,'external');
assert.equal(launchInfo({website:'https://example.org'},true).kind,'related');
assert.equal(launchInfo({website:'https://github.com/example/repo'}).kind,'install');
console.log('Scalable launch classification passed');
