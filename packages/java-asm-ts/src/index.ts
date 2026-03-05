// Core exports
export * from './core/Opcodes';
export * from './core/Constants';
export * from './core/ByteVector';
export * from './core/Symbol';
export * from './core/SymbolTable';
export * from './core/Type';
export * from './core/Handle';
export * from './core/ConstantDynamic';
export * from './core/Label';
export * from './core/TypePath';
export * from './core/TypeReference';
export * from './core/AsmError';

// Visitor exports
export * from './visitors/ClassVisitor';
export * from './visitors/MethodVisitor';
export * from './visitors/FieldVisitor';
export * from './visitors/AnnotationVisitor';
export * from './visitors/ModuleVisitor';
export * from './visitors/RecordComponentVisitor';
export * from './visitors/SignatureVisitor';

// Attribute exports
export * from './attributes/Attribute';

// Frame exports (excluding duplicates already in Constants)
export { Frame, FrameType, FrameElementType } from './frames/Frame';
export { FrameReader, FrameReaderContext, parseInitialLocals } from './frames/FrameReader';
export { FrameWriter, computeFrameType } from './frames/FrameWriter';

// Reader exports
export * from './readers/ClassReader';
export * from './readers/SignatureReader';
export * from './readers/instructions/InsnReader';
export * from './readers/instructions/IntInsnReader';
export * from './readers/instructions/VarInsnReader';
export * from './readers/instructions/TypeInsnReader';
export * from './readers/instructions/FieldInsnReader';
export * from './readers/instructions/MethodInsnReader';
export * from './readers/instructions/InvokeDynamicInsnReader';
export * from './readers/instructions/JumpInsnReader';
export * from './readers/instructions/LdcInsnReader';
export * from './readers/instructions/IincInsnReader';
export * from './readers/instructions/TableSwitchInsnReader';
export * from './readers/instructions/LookupSwitchInsnReader';
export * from './readers/instructions/MultiANewArrayInsnReader';

// Writer exports
export * from './writers/ClassWriter';
export * from './writers/MethodWriter';
export * from './writers/FieldWriter';
export * from './writers/AnnotationWriter';
export * from './writers/ModuleWriter';
export * from './writers/RecordComponentWriter';
export * from './writers/SignatureWriter';
export * from './writers/instructions/InsnWriter';
export * from './writers/instructions/IntInsnWriter';
export * from './writers/instructions/VarInsnWriter';
export * from './writers/instructions/TypeInsnWriter';
export * from './writers/instructions/FieldInsnWriter';
export * from './writers/instructions/MethodInsnWriter';
export * from './writers/instructions/InvokeDynamicInsnWriter';
export * from './writers/instructions/JumpInsnWriter';
export * from './writers/instructions/LdcInsnWriter';
export * from './writers/instructions/IincInsnWriter';
export * from './writers/instructions/TableSwitchInsnWriter';
export * from './writers/instructions/LookupSwitchInsnWriter';
export * from './writers/instructions/MultiANewArrayInsnWriter';
