import { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents a constant value expression.
 * Includes: LDC, ICONST_*, LCONST_*, FCONST_*, DCONST_*, ACONST_NULL, BIPUSH, SIPUSH
 */
export class ConstantExpr extends Expr {
  public readonly type: Type;

  /**
   * The constant value.
   * Can be: number (int/long/float/double), string, null, Type (for class constants),
   * Handle, or ConstantDynamic.
   */
  public readonly value: unknown;

  constructor(type: Type, value: unknown) {
    super();
    this.type = type;
    this.value = value;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitConstantExpr(this);
  }

  public toString(): string {
    if (this.value === null) {
      return 'null';
    }
    if (typeof this.value === 'string') {
      return `"${this.value}"`;
    }
    if (this.value instanceof Type) {
      return `${(this.value as Type).getClassName()}.class`;
    }
    return String(this.value);
  }

  /**
   * Creates an integer constant expression.
   */
  public static int(value: number): ConstantExpr {
    return new ConstantExpr(Type.INT_TYPE, value);
  }

  /**
   * Creates a long constant expression.
   */
  public static long(value: bigint | number): ConstantExpr {
    return new ConstantExpr(Type.LONG_TYPE, typeof value === 'number' ? BigInt(value) : value);
  }

  /**
   * Creates a float constant expression.
   */
  public static float(value: number): ConstantExpr {
    return new ConstantExpr(Type.FLOAT_TYPE, value);
  }

  /**
   * Creates a double constant expression.
   */
  public static double(value: number): ConstantExpr {
    return new ConstantExpr(Type.DOUBLE_TYPE, value);
  }

  /**
   * Creates a string constant expression.
   */
  public static string(value: string): ConstantExpr {
    return new ConstantExpr(Type.getObjectType('java/lang/String'), value);
  }

  /**
   * Creates a null constant expression.
   */
  public static null(): ConstantExpr {
    return new ConstantExpr(Type.getObjectType('java/lang/Object'), null);
  }

  /**
   * Creates a class constant expression.
   */
  public static class(classType: Type): ConstantExpr {
    return new ConstantExpr(Type.getObjectType('java/lang/Class'), classType);
  }
}
