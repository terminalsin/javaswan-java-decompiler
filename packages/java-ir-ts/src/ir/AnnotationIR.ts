/**
 * Represents an annotation value. Can be:
 * - Primitive: string, number, boolean
 * - Type reference: { type: 'class', descriptor: string }
 * - Enum reference: { type: 'enum', descriptor: string, value: string }
 * - Nested annotation: { type: 'annotation', descriptor: string, values: AnnotationValue[] }
 * - Array: { type: 'array', values: AnnotationValue[] }
 */
export type AnnotationValue =
  | string
  | number
  | boolean
  | { readonly type: 'class'; readonly descriptor: string }
  | { readonly type: 'enum'; readonly descriptor: string; readonly value: string }
  | { readonly type: 'annotation'; readonly descriptor: string; readonly values: readonly AnnotationEntry[] }
  | { readonly type: 'array'; readonly values: readonly AnnotationValue[] };

/**
 * A single name-value pair in an annotation.
 */
export interface AnnotationEntry {
  readonly name: string | null;
  readonly value: AnnotationValue;
}

/**
 * Represents a complete annotation on a class, field, or method.
 */
export interface AnnotationIR {
  /** The annotation type descriptor (e.g., "Ljava/lang/Deprecated;") */
  readonly descriptor: string;
  /** Whether this annotation is visible at runtime */
  readonly visible: boolean;
  /** The annotation's name-value pairs */
  readonly values: readonly AnnotationEntry[];
}
