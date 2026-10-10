import assert from 'node:assert/strict';import {normalizeChart} from '../playground-python-chart.mjs';
assert.deepEqual(normalizeChart({labels:['A','B'],values:[2,4]}),{labels:['A','B'],values:[2,4]});
assert.equal(normalizeChart({labels:['A'],values:[-1]}),null);
assert.equal(normalizeChart({labels:['A'],values:['oops']}),null);
assert.equal(normalizeChart({labels:['A'],values:[0]}),null);
assert.equal(normalizeChart({labels:['A','B'],values:[1]}),null);
assert.equal(normalizeChart({labels:Array(21).fill('A'),values:Array(21).fill(1)}),null);
console.log('Python chart data bounds tests passed');
