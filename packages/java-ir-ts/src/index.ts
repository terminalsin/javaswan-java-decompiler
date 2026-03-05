// Expression exports
export * from './expr/index';

// Statement exports
export * from './stmt/index';

// IR structure exports
export { type AnnotationIR, type AnnotationEntry, type AnnotationValue } from './ir/AnnotationIR';
export { ClassIR, type InnerClassInfo } from './ir/ClassIR';
export { MethodIR, type LocalVariable } from './ir/MethodIR';
export { FieldIR } from './ir/FieldIR';
export { BasicBlock } from './ir/BasicBlock';
export { ControlFlowGraph, type ExceptionHandler } from './ir/ControlFlowGraph';

// Builder exports
export { IRClassVisitor } from './builder/IRClassVisitor';
export { IRMethodVisitor } from './builder/IRMethodVisitor';
export { StackSimulator } from './builder/StackSimulator';

// Visitor exports
export { type IRVisitor, IRWalker } from './visitor/IRVisitor';
export { IRPrinter } from './visitor/IRPrinter';

// Compiler exports
export { IRClassCompiler, type IRClassCompileOptions } from './compiler/IRClassCompiler';
export { IRMethodCompiler, type IRMethodCompileOptions } from './compiler/IRMethodCompiler';
