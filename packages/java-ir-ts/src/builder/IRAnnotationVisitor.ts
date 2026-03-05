import { AnnotationVisitor, ASM9, Type } from '@blkswn/java-asm';
import type { AnnotationEntry, AnnotationValue } from '../ir/AnnotationIR';

/**
 * Collects annotation values into AnnotationEntry arrays.
 */
export class IRAnnotationVisitor extends AnnotationVisitor {
  public readonly entries: AnnotationEntry[] = [];

  constructor() {
    super(ASM9, null);
  }

  visit(name: string | null, value: unknown): void {
    this.entries.push({ name, value: this.convertValue(value) });
  }

  visitEnum(name: string | null, descriptor: string, value: string): void {
    this.entries.push({ name, value: { type: 'enum', descriptor, value } });
  }

  visitAnnotation(name: string | null, descriptor: string): AnnotationVisitor | null {
    const nested = new IRAnnotationVisitor();
    // We need to capture the result after visitEnd, so use a proxy entry
    const entry: AnnotationEntry = {
      name,
      value: { type: 'annotation', descriptor, values: nested.entries },
    };
    this.entries.push(entry);
    return nested;
  }

  visitArray(name: string | null): AnnotationVisitor | null {
    const arrayCollector = new IRArrayAnnotationVisitor();
    // The array values will be populated as the visitor visits elements
    const entry: AnnotationEntry = {
      name,
      value: { type: 'array', values: arrayCollector.values },
    };
    this.entries.push(entry);
    return arrayCollector;
  }

  private convertValue(value: unknown): AnnotationValue {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    if (value instanceof Type) return { type: 'class', descriptor: value.getDescriptor() };
    // Fallback: convert to string
    return String(value);
  }
}

/**
 * Collects array elements for annotation array values.
 */
class IRArrayAnnotationVisitor extends AnnotationVisitor {
  public readonly values: AnnotationValue[] = [];

  constructor() {
    super(ASM9, null);
  }

  visit(name: string | null, value: unknown): void {
    this.values.push(this.convertValue(value));
  }

  visitEnum(name: string | null, descriptor: string, value: string): void {
    this.values.push({ type: 'enum', descriptor, value });
  }

  visitAnnotation(name: string | null, descriptor: string): AnnotationVisitor | null {
    const nested = new IRAnnotationVisitor();
    this.values.push({ type: 'annotation', descriptor, values: nested.entries });
    return nested;
  }

  visitArray(name: string | null): AnnotationVisitor | null {
    const arrayCollector = new IRArrayAnnotationVisitor();
    this.values.push({ type: 'array', values: arrayCollector.values });
    return arrayCollector;
  }

  private convertValue(value: unknown): AnnotationValue {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    if (value instanceof Type) return { type: 'class', descriptor: value.getDescriptor() };
    return String(value);
  }
}
