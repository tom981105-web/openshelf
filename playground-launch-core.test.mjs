import assert from 'node:assert/strict';
import {launchInfo,trustedExternalLink,runtimeReadiness} from './playground-launch-core.mjs';
assert.equal(trustedExternalLink('https://github.com/example/repo'),null);
assert.equal(trustedExternalLink('javascript:alert(1)'),null);
assert.equal(trustedExternalLink('https://example.org/demo'),'https://example.org/demo');
assert.equal(launchInfo({website:'https://example.org'}).kind,'external');
assert.equal(launchInfo({website:'https://example.org'},true).kind,'related');
assert.equal(launchInfo({website:'https://github.com/example/repo'}).kind,'install');
console.log('Scalable launch classification passed');

assert.equal((await Promise.resolve(launchInfo({website:'https://example.org'}))).kind,'external');

assert.equal(runtimeReadiness({website:'https://example.org'},'playground-csv.html').state,'ready');
assert.equal(runtimeReadiness({website:'https://example.org'}).state,'needs-verification');
assert.equal(runtimeReadiness({install:[{command:'pip install test'}]}).kind,'local-install');
assert.equal(runtimeReadiness({}).state,'requires-runtime');
