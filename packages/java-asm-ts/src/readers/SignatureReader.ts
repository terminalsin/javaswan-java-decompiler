import { SignatureVisitor } from '../visitors/SignatureVisitor';

/**
 * A parser for generic type signatures.
 */
export class SignatureReader {
  /** The signature to read. */
  private readonly signature: string;

  /**
   * Constructs a new SignatureReader.
   * @param signature the signature to read
   */
  constructor(signature: string) {
    this.signature = signature;
  }

  /**
   * Makes the given signature visitor visit the signature of this SignatureReader. This method is
   * intended to be called on a SignatureReader that was created using a class signature (such as
   * the signature of a class or interface).
   * @param signatureVisitor the visitor that must visit this signature
   */
  accept(signatureVisitor: SignatureVisitor): void {
    const signature = this.signature;
    const length = signature.length;
    let offset = 0;

    // Read formal type parameters
    if (offset < length && signature.charAt(offset) === '<') {
      offset++;
      do {
        // Read formal type parameter name
        const endOffset = signature.indexOf(':', offset);
        signatureVisitor.visitFormalTypeParameter(signature.substring(offset, endOffset));
        offset = endOffset + 1;

        // Read formal type parameter bounds
        let c = signature.charAt(offset);
        if (c === 'L' || c === '[' || c === 'T') {
          // Class bound
          offset = this.parseType(signature, offset, signatureVisitor.visitClassBound());
        }
        while ((c = signature.charAt(offset)) === ':') {
          offset++;
          // Interface bound
          offset = this.parseType(signature, offset, signatureVisitor.visitInterfaceBound());
        }
      } while (signature.charAt(offset) !== '>');
      offset++;
    }

    // Read super class signature
    offset = this.parseType(signature, offset, signatureVisitor.visitSuperclass());

    // Read interface signatures
    while (offset < length) {
      offset = this.parseType(signature, offset, signatureVisitor.visitInterface());
    }
  }

  /**
   * Makes the given signature visitor visit the signature of this SignatureReader. This method is
   * intended to be called on a SignatureReader that was created using a method signature (such as
   * the signature of a method).
   * @param signatureVisitor the visitor that must visit this signature
   */
  acceptType(signatureVisitor: SignatureVisitor): void {
    this.parseType(this.signature, 0, signatureVisitor);
  }

  /**
   * Parses a type signature and makes the given visitor visit it.
   * @param signature the signature
   * @param startOffset the start offset
   * @param signatureVisitor the visitor
   * @returns the end offset
   */
  private parseType(signature: string, startOffset: number, signatureVisitor: SignatureVisitor): number {
    let offset = startOffset;
    const c = signature.charAt(offset);

    switch (c) {
      case 'Z':
      case 'B':
      case 'C':
      case 'S':
      case 'I':
      case 'F':
      case 'J':
      case 'D':
      case 'V':
        signatureVisitor.visitBaseType(c);
        return offset + 1;

      case '[':
        return this.parseType(signature, offset + 1, signatureVisitor.visitArrayType());

      case 'T': {
        const endOffset = signature.indexOf(';', offset);
        signatureVisitor.visitTypeVariable(signature.substring(offset + 1, endOffset));
        return endOffset + 1;
      }

      case 'L': {
        // Find the end of the class name (before any type arguments or inner classes)
        let nameEndOffset = offset + 1;
        let visited = false;
        let innerClass = false;

        while (nameEndOffset < signature.length) {
          const ch = signature.charAt(nameEndOffset);
          if (ch === '<' || ch === '.' || ch === ';') {
            if (!visited) {
              const className = signature.substring(offset + 1, nameEndOffset);
              if (innerClass) {
                signatureVisitor.visitInnerClassType(className);
              } else {
                signatureVisitor.visitClassType(className);
              }
              visited = true;
            }

            if (ch === '<') {
              // Parse type arguments
              nameEndOffset++;
              while (signature.charAt(nameEndOffset) !== '>') {
                const argChar = signature.charAt(nameEndOffset);
                if (argChar === '*') {
                  signatureVisitor.visitTypeArgument();
                  nameEndOffset++;
                } else if (argChar === '+' || argChar === '-') {
                  nameEndOffset = this.parseType(
                    signature,
                    nameEndOffset + 1,
                    signatureVisitor.visitTypeArgumentWildcard(argChar)
                  );
                } else {
                  nameEndOffset = this.parseType(
                    signature,
                    nameEndOffset,
                    signatureVisitor.visitTypeArgumentWildcard(SignatureVisitor.INSTANCEOF)
                  );
                }
              }
              nameEndOffset++; // Skip '>'
            } else if (ch === '.') {
              // Inner class
              offset = nameEndOffset;
              nameEndOffset++;
              visited = false;
              innerClass = true;
            } else {
              // End of class type (';')
              signatureVisitor.visitEnd();
              return nameEndOffset + 1;
            }
          } else {
            nameEndOffset++;
          }
        }
        return nameEndOffset;
      }

      case '(':
        // Method signature
        offset++;
        while (signature.charAt(offset) !== ')') {
          offset = this.parseType(signature, offset, signatureVisitor.visitParameterType());
        }
        offset++;
        offset = this.parseType(signature, offset, signatureVisitor.visitReturnType());
        while (offset < signature.length) {
          if (signature.charAt(offset) === '^') {
            offset = this.parseType(signature, offset + 1, signatureVisitor.visitExceptionType());
          } else {
            break;
          }
        }
        return offset;

      default:
        throw new Error('Unknown signature character: ' + c);
    }
  }
}
