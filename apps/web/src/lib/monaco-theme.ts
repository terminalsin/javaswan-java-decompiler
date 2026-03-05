import type { editor } from "monaco-editor";

export const industrialDarkTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Comments
    { token: "comment", foreground: "5c6370", fontStyle: "italic" },
    { token: "comment.doc", foreground: "6b7280", fontStyle: "italic" },

    // Keywords & control flow
    { token: "keyword", foreground: "d4873a" },
    { token: "keyword.control", foreground: "d4873a" },
    { token: "keyword.operator", foreground: "d4873a" },
    { token: "keyword.other", foreground: "d4873a" },

    // Types & classes
    { token: "type", foreground: "81a1c1" },
    { token: "type.identifier", foreground: "81a1c1" },
    { token: "type.identifier.java", foreground: "81a1c1" },

    // Strings & chars
    { token: "string", foreground: "a3be8c" },
    { token: "string.escape", foreground: "d4873a" },
    { token: "string.invalid", foreground: "ef4444" },

    // Numbers & constants
    { token: "number", foreground: "b48ead" },
    { token: "number.float", foreground: "b48ead" },
    { token: "number.hex", foreground: "b48ead" },
    { token: "constant", foreground: "b48ead" },

    // Annotations
    { token: "annotation", foreground: "e5c07b" },
    { token: "annotation.java", foreground: "e5c07b" },
    { token: "tag", foreground: "e5c07b" },

    // Identifiers & variables
    { token: "identifier", foreground: "e0e4ec" },
    { token: "variable", foreground: "e0e4ec" },
    { token: "variable.predefined", foreground: "d19a66" },

    // Delimiters & operators
    { token: "delimiter", foreground: "8b949e" },
    { token: "delimiter.bracket", foreground: "8b949e" },
    { token: "delimiter.parenthesis", foreground: "8b949e" },
    { token: "delimiter.square", foreground: "8b949e" },
    { token: "delimiter.angle", foreground: "8b949e" },
    { token: "operator", foreground: "c8ccd4" },

    // Namespace / package
    { token: "namespace", foreground: "81a1c1" },

    // Method calls (if tokenized)
    { token: "entity.name.function", foreground: "88c0d0" },
    { token: "support.function", foreground: "88c0d0" },
  ],
  colors: {
    // Editor background
    "editor.background": "#1a1d23",
    "editor.foreground": "#e0e4ec",

    // Line highlight
    "editor.lineHighlightBackground": "#22262e",
    "editor.lineHighlightBorder": "#2a2e3600",

    // Selection
    "editor.selectionBackground": "#d4873a30",
    "editor.inactiveSelectionBackground": "#22262e",
    "editor.selectionHighlightBackground": "#d4873a15",

    // Find match
    "editor.findMatchBackground": "#d4873a40",
    "editor.findMatchHighlightBackground": "#d4873a20",
    "editor.findMatchBorder": "#d4873a",
    "editor.findMatchHighlightBorder": "#d4873a60",

    // Line numbers
    "editorLineNumber.foreground": "#3d4250",
    "editorLineNumber.activeForeground": "#d4873a",

    // Indent guides
    "editorIndentGuide.background": "#2a2e36",
    "editorIndentGuide.activeBackground": "#3a3f4a",

    // Bracket matching
    "editorBracketMatch.background": "#d4873a20",
    "editorBracketMatch.border": "#d4873a60",

    // Gutter & widgets
    "editorGutter.background": "#12141a",
    "editorWidget.background": "#1a1d23",
    "editorWidget.border": "#2a2e36",

    // Minimap
    "minimap.background": "#12141a",
    "minimapSlider.background": "#2a2e3640",
    "minimapSlider.hoverBackground": "#2a2e3680",
    "minimapSlider.activeBackground": "#d4873a30",

    // Scrollbar
    "scrollbar.shadow": "#00000000",
    "scrollbarSlider.background": "#2a2e3660",
    "scrollbarSlider.hoverBackground": "#3a3f4a80",
    "scrollbarSlider.activeBackground": "#d4873a40",

    // Overview ruler
    "editorOverviewRuler.border": "#2a2e36",
    "editorOverviewRuler.findMatchForeground": "#d4873a80",
    "editorOverviewRuler.selectionHighlightForeground": "#d4873a40",

    // Cursor
    "editorCursor.foreground": "#d4873a",

    // Whitespace
    "editorWhitespace.foreground": "#2a2e3680",
  },
};
