/**
 * Base exception class for ASM-related errors.
 */
export class AsmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AsmError';
  }
}

/**
 * Exception thrown when an invalid class file is encountered.
 */
export class InvalidClassError extends AsmError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidClassError';
  }
}

/**
 * Exception thrown when an unsupported class file version is encountered.
 */
export class UnsupportedClassVersionError extends AsmError {
  /** The major version of the class file. */
  readonly majorVersion: number;

  /** The minor version of the class file. */
  readonly minorVersion: number;

  constructor(majorVersion: number, minorVersion: number) {
    super(`Unsupported class file version: ${majorVersion}.${minorVersion}`);
    this.name = 'UnsupportedClassVersionError';
    this.majorVersion = majorVersion;
    this.minorVersion = minorVersion;
  }
}

/**
 * Exception thrown when an unknown opcode is encountered.
 */
export class UnknownOpcodeError extends AsmError {
  /** The unknown opcode. */
  readonly opcode: number;

  constructor(opcode: number) {
    super(`Unknown opcode: ${opcode} (0x${opcode.toString(16)})`);
    this.name = 'UnknownOpcodeError';
    this.opcode = opcode;
  }
}

/**
 * Exception thrown when a signature parsing error occurs.
 */
export class SignatureParseError extends AsmError {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureParseError';
  }
}
