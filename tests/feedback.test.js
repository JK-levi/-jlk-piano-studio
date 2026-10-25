import test from 'node:test';
import assert from 'node:assert/strict';
import { validTempo } from '../js/feedback.js';
test('tempo validation rejects missing, fractional and out-of-range values without substituting a default',()=>{
  for(const value of ['', ' ', '0', '39','181','Infinity','NaN','79.5'])assert.equal(validTempo(value),false,value);
  for(const value of ['40','80','180'])assert.equal(validTempo(value),true,value);
});
