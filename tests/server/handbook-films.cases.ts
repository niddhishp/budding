import test from 'node:test';
import assert from 'node:assert/strict';
import { filmEmbed } from '../../src/data/handbook-films';

test('Only HTTPS Vimeo and YouTube films are embedded, through their privacy-friendly players', () => {
  assert.equal(filmEmbed('https://vimeo.com/123456789'), 'https://player.vimeo.com/video/123456789?dnt=1');
  assert.equal(filmEmbed('https://vimeo.com/123456789/abc123def'), 'https://player.vimeo.com/video/123456789?dnt=1&h=abc123def');
  assert.equal(filmEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(filmEmbed('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  for (const bad of ['http://vimeo.com/1', 'https://evil.example/vimeo.com/1', 'javascript:alert(1)', 'https://vimeo.com/abc', 'not a url'])
    assert.equal(filmEmbed(bad), null, bad);
});
