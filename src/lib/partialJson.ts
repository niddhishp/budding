const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };

/**
 * Read a top-level string property out of JSON that is still being streamed.
 * Returns the decoded text so far, and whether its closing quote has arrived;
 * null if the property has not started yet. Stops cleanly mid-escape.
 */
export function extractPartialString(json: string, key: string): { text: string; complete: boolean } | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"`).exec(json);
  if (!match) return null;

  let i = match.index + match[0].length;
  let text = '';
  while (i < json.length) {
    const ch = json[i];
    if (ch === '"') return { text, complete: true };
    if (ch !== '\\') {
      text += ch;
      i += 1;
      continue;
    }
    const next = json[i + 1];
    if (next === undefined) break;
    if (next === 'u') {
      const hex = json.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      text += String.fromCharCode(parseInt(hex, 16));
      i += 6;
    } else {
      text += ESCAPES[next] ?? next;
      i += 2;
    }
  }
  return { text, complete: false };
}
