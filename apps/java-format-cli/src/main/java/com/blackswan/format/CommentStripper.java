package com.blackswan.format;

/**
 * Strips all comments from Java source code using a character-level state machine.
 * Handles string literals, text blocks, char literals, line comments, and block comments.
 */
public final class CommentStripper {

    private CommentStripper() {}

    public static String strip(String source) {
        StringBuilder out = new StringBuilder(source.length());
        int i = 0;
        int len = source.length();

        while (i < len) {
            char c = source.charAt(i);

            if (c == '"') {
                // Check for text block """
                if (i + 2 < len && source.charAt(i + 1) == '"' && source.charAt(i + 2) == '"') {
                    i = copyTextBlock(source, i, len, out);
                } else {
                    i = copyStringLiteral(source, i, len, out);
                }
            } else if (c == '\'') {
                i = copyCharLiteral(source, i, len, out);
            } else if (c == '/' && i + 1 < len) {
                char next = source.charAt(i + 1);
                if (next == '/') {
                    i = skipLineComment(source, i, len);
                } else if (next == '*') {
                    // Replace block comment with a space to prevent token merging
                    out.append(' ');
                    i = skipBlockComment(source, i, len);
                } else {
                    out.append(c);
                    i++;
                }
            } else {
                out.append(c);
                i++;
            }
        }
        return out.toString();
    }

    /** Copies a string literal "..." including escape sequences. Returns new index. */
    private static int copyStringLiteral(String source, int start, int len, StringBuilder out) {
        out.append('"');
        int i = start + 1;
        while (i < len) {
            char c = source.charAt(i);
            if (c == '\\' && i + 1 < len) {
                out.append(c);
                out.append(source.charAt(i + 1));
                i += 2;
            } else if (c == '"') {
                out.append('"');
                i++;
                return i;
            } else {
                out.append(c);
                i++;
            }
        }
        return i;
    }

    /** Copies a text block \"""...\""" including embedded quotes. Returns new index. */
    private static int copyTextBlock(String source, int start, int len, StringBuilder out) {
        // Copy opening """
        out.append("\"\"\"");
        int i = start + 3;
        while (i < len) {
            char c = source.charAt(i);
            if (c == '\\' && i + 1 < len) {
                out.append(c);
                out.append(source.charAt(i + 1));
                i += 2;
            } else if (c == '"' && i + 2 < len
                    && source.charAt(i + 1) == '"'
                    && source.charAt(i + 2) == '"') {
                // Check this isn't followed by another " (e.g., """" inside text block)
                if (i + 3 < len && source.charAt(i + 3) == '"') {
                    out.append('"');
                    i++;
                } else {
                    out.append("\"\"\"");
                    i += 3;
                    return i;
                }
            } else {
                out.append(c);
                i++;
            }
        }
        return i;
    }

    /** Copies a character literal '.' including escape sequences. Returns new index. */
    private static int copyCharLiteral(String source, int start, int len, StringBuilder out) {
        out.append('\'');
        int i = start + 1;
        while (i < len) {
            char c = source.charAt(i);
            if (c == '\\' && i + 1 < len) {
                out.append(c);
                out.append(source.charAt(i + 1));
                i += 2;
            } else if (c == '\'') {
                out.append('\'');
                i++;
                return i;
            } else {
                out.append(c);
                i++;
            }
        }
        return i;
    }

    /** Skips a line comment // to end of line. Preserves the newline. Returns new index. */
    private static int skipLineComment(String source, int start, int len) {
        int i = start + 2;
        while (i < len) {
            char c = source.charAt(i);
            if (c == '\n') {
                return i; // Don't consume the newline — it stays in output
            }
            i++;
        }
        return i;
    }

    /** Skips a block comment to closing asterisk-slash. Returns new index. */
    private static int skipBlockComment(String source, int start, int len) {
        int i = start + 2; // skip /*
        while (i + 1 < len) {
            if (source.charAt(i) == '*' && source.charAt(i + 1) == '/') {
                return i + 2;
            }
            i++;
        }
        return len; // Unterminated block comment
    }
}
