/**
 * Internal constants used by the ASM library.
 * These are not part of the public API.
 */

// Constant pool tags
export const CONSTANT_UTF8 = 1;
export const CONSTANT_INTEGER = 3;
export const CONSTANT_FLOAT = 4;
export const CONSTANT_LONG = 5;
export const CONSTANT_DOUBLE = 6;
export const CONSTANT_CLASS = 7;
export const CONSTANT_STRING = 8;
export const CONSTANT_FIELDREF = 9;
export const CONSTANT_METHODREF = 10;
export const CONSTANT_INTERFACE_METHODREF = 11;
export const CONSTANT_NAME_AND_TYPE = 12;
export const CONSTANT_METHOD_HANDLE = 15;
export const CONSTANT_METHOD_TYPE = 16;
export const CONSTANT_DYNAMIC = 17;
export const CONSTANT_INVOKE_DYNAMIC = 18;
export const CONSTANT_MODULE = 19;
export const CONSTANT_PACKAGE = 20;

// Optimized xLOAD_n opcodes (ILOAD_0 through ALOAD_3)
export const ILOAD_0 = 26;
export const ILOAD_1 = 27;
export const ILOAD_2 = 28;
export const ILOAD_3 = 29;
export const LLOAD_0 = 30;
export const LLOAD_1 = 31;
export const LLOAD_2 = 32;
export const LLOAD_3 = 33;
export const FLOAD_0 = 34;
export const FLOAD_1 = 35;
export const FLOAD_2 = 36;
export const FLOAD_3 = 37;
export const DLOAD_0 = 38;
export const DLOAD_1 = 39;
export const DLOAD_2 = 40;
export const DLOAD_3 = 41;
export const ALOAD_0 = 42;
export const ALOAD_1 = 43;
export const ALOAD_2 = 44;
export const ALOAD_3 = 45;

// Optimized xSTORE_n opcodes (ISTORE_0 through ASTORE_3)
export const ISTORE_0 = 59;
export const ISTORE_1 = 60;
export const ISTORE_2 = 61;
export const ISTORE_3 = 62;
export const LSTORE_0 = 63;
export const LSTORE_1 = 64;
export const LSTORE_2 = 65;
export const LSTORE_3 = 66;
export const FSTORE_0 = 67;
export const FSTORE_1 = 68;
export const FSTORE_2 = 69;
export const FSTORE_3 = 70;
export const DSTORE_0 = 71;
export const DSTORE_1 = 72;
export const DSTORE_2 = 73;
export const DSTORE_3 = 74;
export const ASTORE_0 = 75;
export const ASTORE_1 = 76;
export const ASTORE_2 = 77;
export const ASTORE_3 = 78;

// Wide instruction and extended opcodes
export const WIDE = 196;
export const GOTO_W = 200;
export const JSR_W = 201;

// LDC variants
export const LDC_W = 19;
export const LDC2_W = 20;

// ASM-specific opcodes (internal use only)
export const ASM_OPCODE_DELTA = 49;
export const ASM_IFNULL_OPCODE_DELTA = 20;
export const WIDE_JUMP_OPCODE_DELTA = 33;

// ASM-specific opcodes for handling forward jumps > 32767
export const ASM_IFEQ = 153 + ASM_OPCODE_DELTA;
export const ASM_IFNE = 154 + ASM_OPCODE_DELTA;
export const ASM_IFLT = 155 + ASM_OPCODE_DELTA;
export const ASM_IFGE = 156 + ASM_OPCODE_DELTA;
export const ASM_IFGT = 157 + ASM_OPCODE_DELTA;
export const ASM_IFLE = 158 + ASM_OPCODE_DELTA;
export const ASM_IF_ICMPEQ = 159 + ASM_OPCODE_DELTA;
export const ASM_IF_ICMPNE = 160 + ASM_OPCODE_DELTA;
export const ASM_IF_ICMPLT = 161 + ASM_OPCODE_DELTA;
export const ASM_IF_ICMPGE = 162 + ASM_OPCODE_DELTA;
export const ASM_IF_ICMPGT = 163 + ASM_OPCODE_DELTA;
export const ASM_IF_ICMPLE = 164 + ASM_OPCODE_DELTA;
export const ASM_IF_ACMPEQ = 165 + ASM_OPCODE_DELTA;
export const ASM_IF_ACMPNE = 166 + ASM_OPCODE_DELTA;
export const ASM_GOTO = 167 + ASM_OPCODE_DELTA;
export const ASM_JSR = 168 + ASM_OPCODE_DELTA;
export const ASM_IFNULL = 198 + ASM_IFNULL_OPCODE_DELTA;
export const ASM_IFNONNULL = 199 + ASM_IFNULL_OPCODE_DELTA;
export const ASM_GOTO_W = 200;

// Frame types for StackMapTable attribute
export const SAME_FRAME = 0;
export const SAME_LOCALS_1_STACK_ITEM_FRAME = 64;
export const RESERVED = 128;
export const SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED = 247;
export const CHOP_FRAME = 248;
export const SAME_FRAME_EXTENDED = 251;
export const APPEND_FRAME = 252;
export const FULL_FRAME = 255;

// Frame element types
export const ITEM_TOP = 0;
export const ITEM_INTEGER = 1;
export const ITEM_FLOAT = 2;
export const ITEM_DOUBLE = 3;
export const ITEM_LONG = 4;
export const ITEM_NULL = 5;
export const ITEM_UNINITIALIZED_THIS = 6;
export const ITEM_OBJECT = 7;
export const ITEM_UNINITIALIZED = 8;

// Attribute names
export const CODE = 'Code';
export const CONSTANT_VALUE = 'ConstantValue';
export const DEPRECATED = 'Deprecated';
export const EXCEPTIONS = 'Exceptions';
export const INNER_CLASSES = 'InnerClasses';
export const LINE_NUMBER_TABLE = 'LineNumberTable';
export const LOCAL_VARIABLE_TABLE = 'LocalVariableTable';
export const LOCAL_VARIABLE_TYPE_TABLE = 'LocalVariableTypeTable';
export const RUNTIME_VISIBLE_ANNOTATIONS = 'RuntimeVisibleAnnotations';
export const RUNTIME_INVISIBLE_ANNOTATIONS = 'RuntimeInvisibleAnnotations';
export const RUNTIME_VISIBLE_PARAMETER_ANNOTATIONS = 'RuntimeVisibleParameterAnnotations';
export const RUNTIME_INVISIBLE_PARAMETER_ANNOTATIONS = 'RuntimeInvisibleParameterAnnotations';
export const RUNTIME_VISIBLE_TYPE_ANNOTATIONS = 'RuntimeVisibleTypeAnnotations';
export const RUNTIME_INVISIBLE_TYPE_ANNOTATIONS = 'RuntimeInvisibleTypeAnnotations';
export const SIGNATURE = 'Signature';
export const SOURCE_FILE = 'SourceFile';
export const SOURCE_DEBUG_EXTENSION = 'SourceDebugExtension';
export const STACK_MAP_TABLE = 'StackMapTable';
export const SYNTHETIC = 'Synthetic';
export const ENCLOSING_METHOD = 'EnclosingMethod';
export const ANNOTATION_DEFAULT = 'AnnotationDefault';
export const BOOTSTRAP_METHODS = 'BootstrapMethods';
export const METHOD_PARAMETERS = 'MethodParameters';
export const MODULE = 'Module';
export const MODULE_PACKAGES = 'ModulePackages';
export const MODULE_MAIN_CLASS = 'ModuleMainClass';
export const NEST_HOST = 'NestHost';
export const NEST_MEMBERS = 'NestMembers';
export const PERMITTED_SUBCLASSES = 'PermittedSubclasses';
export const RECORD = 'Record';

// ClassFile magic number
export const CLASS_FILE_MAGIC = 0xCAFEBABE;

// F_INSERT frame type (ASM internal)
export const F_INSERT = 256;

/**
 * Namespace for all constants
 */
export const Constants = {
  // Constant pool tags
  CONSTANT_UTF8,
  CONSTANT_INTEGER,
  CONSTANT_FLOAT,
  CONSTANT_LONG,
  CONSTANT_DOUBLE,
  CONSTANT_CLASS,
  CONSTANT_STRING,
  CONSTANT_FIELDREF,
  CONSTANT_METHODREF,
  CONSTANT_INTERFACE_METHODREF,
  CONSTANT_NAME_AND_TYPE,
  CONSTANT_METHOD_HANDLE,
  CONSTANT_METHOD_TYPE,
  CONSTANT_DYNAMIC,
  CONSTANT_INVOKE_DYNAMIC,
  CONSTANT_MODULE,
  CONSTANT_PACKAGE,
  
  // Optimized load opcodes
  ILOAD_0,
  ILOAD_1,
  ILOAD_2,
  ILOAD_3,
  LLOAD_0,
  LLOAD_1,
  LLOAD_2,
  LLOAD_3,
  FLOAD_0,
  FLOAD_1,
  FLOAD_2,
  FLOAD_3,
  DLOAD_0,
  DLOAD_1,
  DLOAD_2,
  DLOAD_3,
  ALOAD_0,
  ALOAD_1,
  ALOAD_2,
  ALOAD_3,
  
  // Optimized store opcodes
  ISTORE_0,
  ISTORE_1,
  ISTORE_2,
  ISTORE_3,
  LSTORE_0,
  LSTORE_1,
  LSTORE_2,
  LSTORE_3,
  FSTORE_0,
  FSTORE_1,
  FSTORE_2,
  FSTORE_3,
  DSTORE_0,
  DSTORE_1,
  DSTORE_2,
  DSTORE_3,
  ASTORE_0,
  ASTORE_1,
  ASTORE_2,
  ASTORE_3,
  
  // Wide and extended
  WIDE,
  GOTO_W,
  JSR_W,
  LDC_W,
  LDC2_W,
  
  // ASM specific
  ASM_OPCODE_DELTA,
  ASM_IFNULL_OPCODE_DELTA,
  WIDE_JUMP_OPCODE_DELTA,
  ASM_IFEQ,
  ASM_IFNE,
  ASM_IFLT,
  ASM_IFGE,
  ASM_IFGT,
  ASM_IFLE,
  ASM_IF_ICMPEQ,
  ASM_IF_ICMPNE,
  ASM_IF_ICMPLT,
  ASM_IF_ICMPGE,
  ASM_IF_ICMPGT,
  ASM_IF_ICMPLE,
  ASM_IF_ACMPEQ,
  ASM_IF_ACMPNE,
  ASM_GOTO,
  ASM_JSR,
  ASM_IFNULL,
  ASM_IFNONNULL,
  ASM_GOTO_W,
  
  // Frame constants
  SAME_FRAME,
  SAME_LOCALS_1_STACK_ITEM_FRAME,
  RESERVED,
  SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED,
  CHOP_FRAME,
  SAME_FRAME_EXTENDED,
  APPEND_FRAME,
  FULL_FRAME,
  ITEM_TOP,
  ITEM_INTEGER,
  ITEM_FLOAT,
  ITEM_DOUBLE,
  ITEM_LONG,
  ITEM_NULL,
  ITEM_UNINITIALIZED_THIS,
  ITEM_OBJECT,
  ITEM_UNINITIALIZED,
  F_INSERT,
  
  // Attribute names
  CODE,
  CONSTANT_VALUE,
  DEPRECATED,
  EXCEPTIONS,
  INNER_CLASSES,
  LINE_NUMBER_TABLE,
  LOCAL_VARIABLE_TABLE,
  LOCAL_VARIABLE_TYPE_TABLE,
  RUNTIME_VISIBLE_ANNOTATIONS,
  RUNTIME_INVISIBLE_ANNOTATIONS,
  RUNTIME_VISIBLE_PARAMETER_ANNOTATIONS,
  RUNTIME_INVISIBLE_PARAMETER_ANNOTATIONS,
  RUNTIME_VISIBLE_TYPE_ANNOTATIONS,
  RUNTIME_INVISIBLE_TYPE_ANNOTATIONS,
  SIGNATURE,
  SOURCE_FILE,
  SOURCE_DEBUG_EXTENSION,
  STACK_MAP_TABLE,
  SYNTHETIC,
  ENCLOSING_METHOD,
  ANNOTATION_DEFAULT,
  BOOTSTRAP_METHODS,
  METHOD_PARAMETERS,
  MODULE,
  MODULE_PACKAGES,
  MODULE_MAIN_CLASS,
  NEST_HOST,
  NEST_MEMBERS,
  PERMITTED_SUBCLASSES,
  RECORD,
  
  // Magic number
  CLASS_FILE_MAGIC,
} as const;
