/**
 * Regex-based Java token scanner that produces token arrays, sets, and frequency maps.
 * Operates on normalized (comment-stripped, formatted) Java source.
 */

const JAVA_TOKEN_PATTERN =
  /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|0[xX][0-9a-fA-F]+[lL]?|[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?[fFdDlL]?|>>>|<<|>>|&&|\|\||[+\-*/%&|^~!<>=]=?|[{}()\[\];.,?:@]/g;

export function tokenize(source: string): string[] {
  return Array.from(source.matchAll(JAVA_TOKEN_PATTERN), (m) => m[0]);
}

export function tokenizeToSet(source: string): Set<string> {
  return new Set(tokenize(source));
}

export function tokenizeToFrequencyMap(source: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokenize(source)) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }
  return map;
}
