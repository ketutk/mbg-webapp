/** One player per line. Strips "1.", "2)", "- ", "• " prefixes and removes duplicates. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const name = line
      .trim()
      .replace(/^\s*(?:\d+\s*[.)\-:]\s*|[-*•]\s*)/, "")
      .trim();
    const key = name.toLocaleLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

