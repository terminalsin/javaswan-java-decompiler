import { ASM9 } from '../core/Opcodes';

/**
 * A visitor to visit a Java module. The methods of this class must be called in the following
 * order: visitMainClass | ( visitPackage | visitRequire | visitExport | visitOpen | visitUse |
 * visitProvide )* visitEnd.
 */
export abstract class ModuleVisitor {
  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /** The module visitor to which this visitor must delegate method calls. May be null. */
  protected mv: ModuleVisitor | null;

  /**
   * Constructs a new ModuleVisitor.
   * @param api the ASM API version (ASM6 to ASM9)
   * @param moduleVisitor the module visitor to delegate to
   */
  constructor(api: number, moduleVisitor: ModuleVisitor | null = null) {
    if (api !== ASM9 && (api < 0x60000 || api > 0x90100)) {
      throw new Error('Unsupported API version for module visitor: ' + api);
    }
    this.api = api;
    this.mv = moduleVisitor;
  }

  /**
   * Returns the delegate module visitor.
   */
  getDelegate(): ModuleVisitor | null {
    return this.mv;
  }

  /**
   * Visit the main class of the current module.
   * @param mainClass the internal name of the main class
   */
  visitMainClass(mainClass: string): void {
    this.mv?.visitMainClass(mainClass);
  }

  /**
   * Visit a package of the current module.
   * @param packaze the internal name of a package
   */
  visitPackage(packaze: string): void {
    this.mv?.visitPackage(packaze);
  }

  /**
   * Visits a dependence of the current module.
   * @param module the fully qualified name (using dots) of the dependence
   * @param access the access flag of the dependence among ACC_TRANSITIVE, ACC_STATIC_PHASE, ACC_SYNTHETIC and ACC_MANDATED
   * @param version the module version at compile time, or null
   */
  visitRequire(module: string, access: number, version: string | null): void {
    this.mv?.visitRequire(module, access, version);
  }

  /**
   * Visit an exported package of the current module.
   * @param packaze the internal name of the exported package
   * @param access the access flag of the exported package, valid values are among ACC_SYNTHETIC and ACC_MANDATED
   * @param modules the fully qualified names (using dots) of the modules that can access the public classes of the exported package, or null
   */
  visitExport(packaze: string, access: number, modules: string[] | null): void {
    this.mv?.visitExport(packaze, access, modules);
  }

  /**
   * Visit an opened package of the current module.
   * @param packaze the internal name of the opened package
   * @param access the access flag of the opened package, valid values are among ACC_SYNTHETIC and ACC_MANDATED
   * @param modules the fully qualified names (using dots) of the modules that can use deep reflection to the classes of the opened package, or null
   */
  visitOpen(packaze: string, access: number, modules: string[] | null): void {
    this.mv?.visitOpen(packaze, access, modules);
  }

  /**
   * Visit a service used by the current module.
   * @param service the internal name of the service
   */
  visitUse(service: string): void {
    this.mv?.visitUse(service);
  }

  /**
   * Visit an implementation of a service.
   * @param service the internal name of the service
   * @param providers the internal names of the implementations of the service
   */
  visitProvide(service: string, providers: string[]): void {
    this.mv?.visitProvide(service, providers);
  }

  /**
   * Visits the end of the module. This method, which is the last one to be called, is used to
   * inform the visitor that everything has been visited.
   */
  visitEnd(): void {
    this.mv?.visitEnd();
  }
}
