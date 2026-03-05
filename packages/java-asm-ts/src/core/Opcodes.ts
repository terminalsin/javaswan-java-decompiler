/**
 * The JVM opcodes, access flags and array type codes.
 * This interface does not define all the JVM opcodes because some opcodes are automatically handled.
 * For example, the xLOAD and xSTORE opcodes are automatically replaced by xLOAD_n and xSTORE_n opcodes when possible.
 */

// ASM API versions
export const ASM4 = 4 << 16 | 0 << 8;
export const ASM5 = 5 << 16 | 0 << 8;
export const ASM6 = 6 << 16 | 0 << 8;
export const ASM7 = 7 << 16 | 0 << 8;
export const ASM8 = 8 << 16 | 0 << 8;
export const ASM9 = 9 << 16 | 0 << 8;
/** @deprecated This API is experimental. */
export const ASM10_EXPERIMENTAL = 1 << 24 | 10 << 16 | 0 << 8;

// Internal flags for deprecated method redirection
export const SOURCE_DEPRECATED = 0x100;
export const SOURCE_MASK = SOURCE_DEPRECATED;

// Java ClassFile versions (minor version in 16 MSBs, major version in 16 LSBs)
export const V1_1 = 3 << 16 | 45;
export const V1_2 = 0 << 16 | 46;
export const V1_3 = 0 << 16 | 47;
export const V1_4 = 0 << 16 | 48;
export const V1_5 = 0 << 16 | 49;
export const V1_6 = 0 << 16 | 50;
export const V1_7 = 0 << 16 | 51;
export const V1_8 = 0 << 16 | 52;
export const V9 = 0 << 16 | 53;
export const V10 = 0 << 16 | 54;
export const V11 = 0 << 16 | 55;
export const V12 = 0 << 16 | 56;
export const V13 = 0 << 16 | 57;
export const V14 = 0 << 16 | 58;
export const V15 = 0 << 16 | 59;
export const V16 = 0 << 16 | 60;
export const V17 = 0 << 16 | 61;
export const V18 = 0 << 16 | 62;
export const V19 = 0 << 16 | 63;
export const V20 = 0 << 16 | 64;
export const V21 = 0 << 16 | 65;
export const V22 = 0 << 16 | 66;
export const V23 = 0 << 16 | 67;
export const V24 = 0 << 16 | 68;
export const V25 = 0 << 16 | 69;
export const V26 = 0 << 16 | 70;
export const V27 = 0 << 16 | 71;

/** Version flag indicating that the class is using 'preview' features. */
export const V_PREVIEW = 0xFFFF0000;

// Access flags
export const ACC_PUBLIC = 0x0001;
export const ACC_PRIVATE = 0x0002;
export const ACC_PROTECTED = 0x0004;
export const ACC_STATIC = 0x0008;
export const ACC_FINAL = 0x0010;
export const ACC_SUPER = 0x0020;
export const ACC_SYNCHRONIZED = 0x0020;
export const ACC_OPEN = 0x0020;
export const ACC_TRANSITIVE = 0x0020;
export const ACC_VOLATILE = 0x0040;
export const ACC_BRIDGE = 0x0040;
export const ACC_STATIC_PHASE = 0x0040;
export const ACC_VARARGS = 0x0080;
export const ACC_TRANSIENT = 0x0080;
export const ACC_NATIVE = 0x0100;
export const ACC_INTERFACE = 0x0200;
export const ACC_ABSTRACT = 0x0400;
export const ACC_STRICT = 0x0800;
export const ACC_SYNTHETIC = 0x1000;
export const ACC_ANNOTATION = 0x2000;
export const ACC_ENUM = 0x4000;
export const ACC_MANDATED = 0x8000;
export const ACC_MODULE = 0x8000;

// ASM specific access flags (16 LSBs must NOT be used)
export const ACC_RECORD = 0x10000;
export const ACC_DEPRECATED = 0x20000;

// Array type codes for NEWARRAY instruction
export const T_BOOLEAN = 4;
export const T_CHAR = 5;
export const T_FLOAT = 6;
export const T_DOUBLE = 7;
export const T_BYTE = 8;
export const T_SHORT = 9;
export const T_INT = 10;
export const T_LONG = 11;

// Method handle reference kinds
export const H_GETFIELD = 1;
export const H_GETSTATIC = 2;
export const H_PUTFIELD = 3;
export const H_PUTSTATIC = 4;
export const H_INVOKEVIRTUAL = 5;
export const H_INVOKESTATIC = 6;
export const H_INVOKESPECIAL = 7;
export const H_NEWINVOKESPECIAL = 8;
export const H_INVOKEINTERFACE = 9;

// Stack map frame types
/** An expanded frame. */
export const F_NEW = -1;
/** A compressed frame with complete frame data. */
export const F_FULL = 0;
/** Locals are same as previous frame except 1-3 additional locals, empty stack. */
export const F_APPEND = 1;
/** Locals are same as previous frame except last 1-3 locals absent, empty stack. */
export const F_CHOP = 2;
/** Exactly same locals as previous frame, empty stack. */
export const F_SAME = 3;
/** Exactly same locals as previous frame, single value on stack. */
export const F_SAME1 = 4;

// Stack map frame element types (using numbers to allow usage in arrays)
// Note: These are prefixed with FRAME_ to avoid conflicts with Type sort constants
export const TOP = 0;
export const INTEGER = 1;
export const FRAME_FLOAT = 2;
export const FRAME_DOUBLE = 3;
export const FRAME_LONG = 4;
export const NULL = 5;
export const UNINITIALIZED_THIS = 6;

// Legacy names for compatibility (deprecated, use FRAME_* versions)
/** @deprecated Use FRAME_FLOAT instead to avoid confusion with Type.FLOAT */
export const Opcodes_FLOAT = FRAME_FLOAT;
/** @deprecated Use FRAME_DOUBLE instead to avoid confusion with Type.DOUBLE */
export const Opcodes_DOUBLE = FRAME_DOUBLE;
/** @deprecated Use FRAME_LONG instead to avoid confusion with Type.LONG */
export const Opcodes_LONG = FRAME_LONG;

// JVM Opcodes
export const NOP = 0;
export const ACONST_NULL = 1;
export const ICONST_M1 = 2;
export const ICONST_0 = 3;
export const ICONST_1 = 4;
export const ICONST_2 = 5;
export const ICONST_3 = 6;
export const ICONST_4 = 7;
export const ICONST_5 = 8;
export const LCONST_0 = 9;
export const LCONST_1 = 10;
export const FCONST_0 = 11;
export const FCONST_1 = 12;
export const FCONST_2 = 13;
export const DCONST_0 = 14;
export const DCONST_1 = 15;
export const BIPUSH = 16;
export const SIPUSH = 17;
export const LDC = 18;
export const ILOAD = 21;
export const LLOAD = 22;
export const FLOAD = 23;
export const DLOAD = 24;
export const ALOAD = 25;
export const IALOAD = 46;
export const LALOAD = 47;
export const FALOAD = 48;
export const DALOAD = 49;
export const AALOAD = 50;
export const BALOAD = 51;
export const CALOAD = 52;
export const SALOAD = 53;
export const ISTORE = 54;
export const LSTORE = 55;
export const FSTORE = 56;
export const DSTORE = 57;
export const ASTORE = 58;
export const IASTORE = 79;
export const LASTORE = 80;
export const FASTORE = 81;
export const DASTORE = 82;
export const AASTORE = 83;
export const BASTORE = 84;
export const CASTORE = 85;
export const SASTORE = 86;
export const POP = 87;
export const POP2 = 88;
export const DUP = 89;
export const DUP_X1 = 90;
export const DUP_X2 = 91;
export const DUP2 = 92;
export const DUP2_X1 = 93;
export const DUP2_X2 = 94;
export const SWAP = 95;
export const IADD = 96;
export const LADD = 97;
export const FADD = 98;
export const DADD = 99;
export const ISUB = 100;
export const LSUB = 101;
export const FSUB = 102;
export const DSUB = 103;
export const IMUL = 104;
export const LMUL = 105;
export const FMUL = 106;
export const DMUL = 107;
export const IDIV = 108;
export const LDIV = 109;
export const FDIV = 110;
export const DDIV = 111;
export const IREM = 112;
export const LREM = 113;
export const FREM = 114;
export const DREM = 115;
export const INEG = 116;
export const LNEG = 117;
export const FNEG = 118;
export const DNEG = 119;
export const ISHL = 120;
export const LSHL = 121;
export const ISHR = 122;
export const LSHR = 123;
export const IUSHR = 124;
export const LUSHR = 125;
export const IAND = 126;
export const LAND = 127;
export const IOR = 128;
export const LOR = 129;
export const IXOR = 130;
export const LXOR = 131;
export const IINC = 132;
export const I2L = 133;
export const I2F = 134;
export const I2D = 135;
export const L2I = 136;
export const L2F = 137;
export const L2D = 138;
export const F2I = 139;
export const F2L = 140;
export const F2D = 141;
export const D2I = 142;
export const D2L = 143;
export const D2F = 144;
export const I2B = 145;
export const I2C = 146;
export const I2S = 147;
export const LCMP = 148;
export const FCMPL = 149;
export const FCMPG = 150;
export const DCMPL = 151;
export const DCMPG = 152;
export const IFEQ = 153;
export const IFNE = 154;
export const IFLT = 155;
export const IFGE = 156;
export const IFGT = 157;
export const IFLE = 158;
export const IF_ICMPEQ = 159;
export const IF_ICMPNE = 160;
export const IF_ICMPLT = 161;
export const IF_ICMPGE = 162;
export const IF_ICMPGT = 163;
export const IF_ICMPLE = 164;
export const IF_ACMPEQ = 165;
export const IF_ACMPNE = 166;
export const GOTO = 167;
export const JSR = 168;
export const RET = 169;
export const TABLESWITCH = 170;
export const LOOKUPSWITCH = 171;
export const IRETURN = 172;
export const LRETURN = 173;
export const FRETURN = 174;
export const DRETURN = 175;
export const ARETURN = 176;
export const RETURN = 177;
export const GETSTATIC = 178;
export const PUTSTATIC = 179;
export const GETFIELD = 180;
export const PUTFIELD = 181;
export const INVOKEVIRTUAL = 182;
export const INVOKESPECIAL = 183;
export const INVOKESTATIC = 184;
export const INVOKEINTERFACE = 185;
export const INVOKEDYNAMIC = 186;
export const NEW = 187;
export const NEWARRAY = 188;
export const ANEWARRAY = 189;
export const ARRAYLENGTH = 190;
export const ATHROW = 191;
export const CHECKCAST = 192;
export const INSTANCEOF = 193;
export const MONITORENTER = 194;
export const MONITOREXIT = 195;
export const MULTIANEWARRAY = 197;
export const IFNULL = 198;
export const IFNONNULL = 199;

/**
 * Namespace for all opcodes to enable qualified imports
 */
export const Opcodes = {
  // ASM API versions
  ASM4,
  ASM5,
  ASM6,
  ASM7,
  ASM8,
  ASM9,
  ASM10_EXPERIMENTAL,
  SOURCE_DEPRECATED,
  SOURCE_MASK,
  
  // Java versions
  V1_1,
  V1_2,
  V1_3,
  V1_4,
  V1_5,
  V1_6,
  V1_7,
  V1_8,
  V9,
  V10,
  V11,
  V12,
  V13,
  V14,
  V15,
  V16,
  V17,
  V18,
  V19,
  V20,
  V21,
  V22,
  V23,
  V24,
  V25,
  V26,
  V27,
  V_PREVIEW,
  
  // Access flags
  ACC_PUBLIC,
  ACC_PRIVATE,
  ACC_PROTECTED,
  ACC_STATIC,
  ACC_FINAL,
  ACC_SUPER,
  ACC_SYNCHRONIZED,
  ACC_OPEN,
  ACC_TRANSITIVE,
  ACC_VOLATILE,
  ACC_BRIDGE,
  ACC_STATIC_PHASE,
  ACC_VARARGS,
  ACC_TRANSIENT,
  ACC_NATIVE,
  ACC_INTERFACE,
  ACC_ABSTRACT,
  ACC_STRICT,
  ACC_SYNTHETIC,
  ACC_ANNOTATION,
  ACC_ENUM,
  ACC_MANDATED,
  ACC_MODULE,
  ACC_RECORD,
  ACC_DEPRECATED,
  
  // Array type codes
  T_BOOLEAN,
  T_CHAR,
  T_FLOAT,
  T_DOUBLE,
  T_BYTE,
  T_SHORT,
  T_INT,
  T_LONG,
  
  // Method handle kinds
  H_GETFIELD,
  H_GETSTATIC,
  H_PUTFIELD,
  H_PUTSTATIC,
  H_INVOKEVIRTUAL,
  H_INVOKESTATIC,
  H_INVOKESPECIAL,
  H_NEWINVOKESPECIAL,
  H_INVOKEINTERFACE,
  
  // Frame types
  F_NEW,
  F_FULL,
  F_APPEND,
  F_CHOP,
  F_SAME,
  F_SAME1,
  
  // Frame element types
  TOP,
  INTEGER,
  FLOAT: FRAME_FLOAT,
  DOUBLE: FRAME_DOUBLE,
  LONG: FRAME_LONG,
  FRAME_FLOAT,
  FRAME_DOUBLE,
  FRAME_LONG,
  NULL,
  UNINITIALIZED_THIS,
  
  // JVM Opcodes
  NOP,
  ACONST_NULL,
  ICONST_M1,
  ICONST_0,
  ICONST_1,
  ICONST_2,
  ICONST_3,
  ICONST_4,
  ICONST_5,
  LCONST_0,
  LCONST_1,
  FCONST_0,
  FCONST_1,
  FCONST_2,
  DCONST_0,
  DCONST_1,
  BIPUSH,
  SIPUSH,
  LDC,
  ILOAD,
  LLOAD,
  FLOAD,
  DLOAD,
  ALOAD,
  IALOAD,
  LALOAD,
  FALOAD,
  DALOAD,
  AALOAD,
  BALOAD,
  CALOAD,
  SALOAD,
  ISTORE,
  LSTORE,
  FSTORE,
  DSTORE,
  ASTORE,
  IASTORE,
  LASTORE,
  FASTORE,
  DASTORE,
  AASTORE,
  BASTORE,
  CASTORE,
  SASTORE,
  POP,
  POP2,
  DUP,
  DUP_X1,
  DUP_X2,
  DUP2,
  DUP2_X1,
  DUP2_X2,
  SWAP,
  IADD,
  LADD,
  FADD,
  DADD,
  ISUB,
  LSUB,
  FSUB,
  DSUB,
  IMUL,
  LMUL,
  FMUL,
  DMUL,
  IDIV,
  LDIV,
  FDIV,
  DDIV,
  IREM,
  LREM,
  FREM,
  DREM,
  INEG,
  LNEG,
  FNEG,
  DNEG,
  ISHL,
  LSHL,
  ISHR,
  LSHR,
  IUSHR,
  LUSHR,
  IAND,
  LAND,
  IOR,
  LOR,
  IXOR,
  LXOR,
  IINC,
  I2L,
  I2F,
  I2D,
  L2I,
  L2F,
  L2D,
  F2I,
  F2L,
  F2D,
  D2I,
  D2L,
  D2F,
  I2B,
  I2C,
  I2S,
  LCMP,
  FCMPL,
  FCMPG,
  DCMPL,
  DCMPG,
  IFEQ,
  IFNE,
  IFLT,
  IFGE,
  IFGT,
  IFLE,
  IF_ICMPEQ,
  IF_ICMPNE,
  IF_ICMPLT,
  IF_ICMPGE,
  IF_ICMPGT,
  IF_ICMPLE,
  IF_ACMPEQ,
  IF_ACMPNE,
  GOTO,
  JSR,
  RET,
  TABLESWITCH,
  LOOKUPSWITCH,
  IRETURN,
  LRETURN,
  FRETURN,
  DRETURN,
  ARETURN,
  RETURN,
  GETSTATIC,
  PUTSTATIC,
  GETFIELD,
  PUTFIELD,
  INVOKEVIRTUAL,
  INVOKESPECIAL,
  INVOKESTATIC,
  INVOKEINTERFACE,
  INVOKEDYNAMIC,
  NEW,
  NEWARRAY,
  ANEWARRAY,
  ARRAYLENGTH,
  ATHROW,
  CHECKCAST,
  INSTANCEOF,
  MONITORENTER,
  MONITOREXIT,
  MULTIANEWARRAY,
  IFNULL,
  IFNONNULL,
} as const;

export type OpcodeValue = typeof Opcodes[keyof typeof Opcodes];
