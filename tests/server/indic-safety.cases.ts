import test from 'node:test';
import assert from 'node:assert/strict';
import { lintAnalysis } from '../../src/lib/ai/critic';

const rules = (a: Record<string, unknown>) => lintAnalysis(a).map(v => v.rule);

test('Hindi and Hinglish physical punishment is caught, and saying not to do it is allowed', () => {
  assert.deepEqual(rules({ doThis: ['एक थप्पड़ लगा दीजिए, फिर वह सुनेगा।'] }), ['physical_punishment']);
  assert.deepEqual(rules({ doThis: ['Ek thappad maaro, phir sunega'] }), ['physical_punishment']);
  // A softener after the verb is not a negation.
  assert.deepEqual(rules({ doThis: ['उसे मारो न, तब समझेगा'] }), ['physical_punishment']);
  assert.deepEqual(rules({ avoid: 'बच्चे को थप्पड़ मत मारिए।' }), []);
  assert.deepEqual(rules({ avoid: 'कभी नहीं मारें, चाहे कितना भी गुस्सा आए।' }), []);
  assert.deepEqual(rules({ avoid: 'Thappad mat maaro, gussa shaant karo.' }), []);
  // Ordinary words that contain the letters are not matched: a name and a word for news.
  assert.deepEqual(rules({ sayThis: 'कुमार, समाचार देखने के बाद हम खेलेंगे।' }), []);
});

test('Hindi diagnosis is caught only when a condition is assigned and not ruled out', () => {
  assert.deepEqual(rules({ hypotheses: [{ text: 'इसे एडीएचडी हो सकता है।' }] }), ['diagnosis']);
  assert.deepEqual(rules({ hypotheses: [{ text: 'Usko autism lagta hai.' }] }), ['diagnosis']);
  assert.deepEqual(rules({ hypotheses: [{ text: 'इसका मतलब ऑटिज़्म नहीं है।' }] }), []);
  assert.deepEqual(rules({ seekHelpIf: 'अगर चिंता हो तो डॉक्टर से ऑटिज़्म जाँच के बारे में पूछें।' }), []);
});

test('Hindi and Hinglish shaming in the words to say is caught; reassurance is not', () => {
  assert.deepEqual(rules({ sayThis: 'तुम बहुत नालायक हो।' }), ['shaming_or_threat']);
  assert.deepEqual(rules({ sayThis: 'Sharam nahi aati tumhe?' }), ['shaming_or_threat']);
  assert.deepEqual(rules({ sayThis: 'रुक जाओ वरना पुलिस आ जाएगी।' }), ['shaming_or_threat']);
  assert.deepEqual(rules({ sayThis: 'तुम बेवकूफ नहीं हो, यह सवाल मुश्किल है।' }), []);
  // Shaming words outside the words to say (for example in "Leave out") are not flagged.
  assert.deepEqual(rules({ avoid: 'नालायक जैसे शब्द मत कहिए।' }), []);
});
