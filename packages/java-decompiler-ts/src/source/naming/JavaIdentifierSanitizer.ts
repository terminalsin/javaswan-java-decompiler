const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while',
  // literals / restricted identifiers
  'true', 'false', 'null',
]);

export class JavaIdentifierSanitizer {
  public sanitize(rawName: string): string {
    const trimmed = rawName.trim();
    if (trimmed.length === 0) {
      return '_';
    }

    let out = '';
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i]!;
      const isValid =
        (ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        (ch >= '0' && ch <= '9') ||
        ch === '_' ||
        ch === '$';
      out += isValid ? ch : '_';
    }

    // Identifiers cannot start with a digit
    if (out.length > 0 && out[0] >= '0' && out[0] <= '9') {
      out = '_' + out;
    }

    // Avoid Java keywords
    if (JAVA_KEYWORDS.has(out)) {
      out = '_' + out;
    }

    return out;
  }
}

