import { ByteVector } from '../core/ByteVector';
import { SymbolTable } from '../core/SymbolTable';
import { ModuleVisitor } from '../visitors/ModuleVisitor';
import { ASM9 } from '../core/Opcodes';

/**
 * A ModuleVisitor that generates the corresponding Module attribute structure.
 */
export class ModuleWriter extends ModuleVisitor {
  /** The symbol table. */
  private readonly symbolTable: SymbolTable;

  /** The module name index. */
  private readonly moduleNameIndex: number;

  /** The module access flags. */
  private readonly moduleFlags: number;

  /** The module version index, or 0. */
  private readonly moduleVersionIndex: number;

  /** The main class index, or 0. */
  private mainClassIndex: number = 0;

  /** The packages. */
  private readonly packages: ByteVector;

  /** The number of packages. */
  private packagesCount: number = 0;

  /** The requires. */
  private readonly requires: ByteVector;

  /** The number of requires. */
  private requiresCount: number = 0;

  /** The exports. */
  private readonly exports: ByteVector;

  /** The number of exports. */
  private exportsCount: number = 0;

  /** The opens. */
  private readonly opens: ByteVector;

  /** The number of opens. */
  private opensCount: number = 0;

  /** The uses. */
  private readonly uses: ByteVector;

  /** The number of uses. */
  private usesCount: number = 0;

  /** The provides. */
  private readonly provides: ByteVector;

  /** The number of provides. */
  private providesCount: number = 0;

  /**
   * Constructs a new ModuleWriter.
   * @param symbolTable the symbol table
   * @param name the module name
   * @param access the module access flags
   * @param version the module version, or null
   */
  constructor(symbolTable: SymbolTable, name: string, access: number, version: string | null) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.moduleNameIndex = symbolTable.addConstantModule(name).index;
    this.moduleFlags = access;
    this.moduleVersionIndex = version === null ? 0 : symbolTable.addConstantUtf8(version);
    this.packages = new ByteVector();
    this.requires = new ByteVector();
    this.exports = new ByteVector();
    this.opens = new ByteVector();
    this.uses = new ByteVector();
    this.provides = new ByteVector();
  }

  override visitMainClass(mainClass: string): void {
    this.mainClassIndex = this.symbolTable.addConstantClass(mainClass).index;
  }

  override visitPackage(packaze: string): void {
    this.packagesCount++;
    this.packages.putShort(this.symbolTable.addConstantPackage(packaze).index);
  }

  override visitRequire(module: string, access: number, version: string | null): void {
    this.requiresCount++;
    this.requires.putShort(this.symbolTable.addConstantModule(module).index);
    this.requires.putShort(access);
    this.requires.putShort(version === null ? 0 : this.symbolTable.addConstantUtf8(version));
  }

  override visitExport(packaze: string, access: number, modules: string[] | null): void {
    this.exportsCount++;
    this.exports.putShort(this.symbolTable.addConstantPackage(packaze).index);
    this.exports.putShort(access);
    if (modules === null) {
      this.exports.putShort(0);
    } else {
      this.exports.putShort(modules.length);
      for (const module of modules) {
        this.exports.putShort(this.symbolTable.addConstantModule(module).index);
      }
    }
  }

  override visitOpen(packaze: string, access: number, modules: string[] | null): void {
    this.opensCount++;
    this.opens.putShort(this.symbolTable.addConstantPackage(packaze).index);
    this.opens.putShort(access);
    if (modules === null) {
      this.opens.putShort(0);
    } else {
      this.opens.putShort(modules.length);
      for (const module of modules) {
        this.opens.putShort(this.symbolTable.addConstantModule(module).index);
      }
    }
  }

  override visitUse(service: string): void {
    this.usesCount++;
    this.uses.putShort(this.symbolTable.addConstantClass(service).index);
  }

  override visitProvide(service: string, providers: string[]): void {
    this.providesCount++;
    this.provides.putShort(this.symbolTable.addConstantClass(service).index);
    this.provides.putShort(providers.length);
    for (const provider of providers) {
      this.provides.putShort(this.symbolTable.addConstantClass(provider).index);
    }
  }

  override visitEnd(): void {
    // Nothing to do
  }

  /**
   * Returns the main class index, or 0 if not set.
   */
  getMainClassIndex(): number {
    return this.mainClassIndex;
  }

  /**
   * Returns the packages count.
   */
  getPackagesCount(): number {
    return this.packagesCount;
  }

  /**
   * Computes the size of the Module attribute.
   */
  computeModuleSize(): number {
    return 16 + // Module attribute header + module_name_index + module_flags + module_version_index
           2 + this.requiresCount * 6 +
           2 + this.exports.length +
           2 + this.opens.length +
           2 + this.usesCount * 2 +
           2 + this.provides.length;
  }

  /**
   * Computes the size of the ModulePackages attribute.
   */
  computePackagesSize(): number {
    return 8 + this.packages.length;
  }

  /**
   * Computes the size of the ModuleMainClass attribute.
   */
  computeMainClassSize(): number {
    return 8;
  }

  /**
   * Writes the Module attribute.
   */
  putModule(output: ByteVector): void {
    output.putShort(this.symbolTable.addConstantUtf8('Module'));
    output.putInt(
      16 + // module_name_index + module_flags + module_version_index + requires_count
      this.requiresCount * 6 +
      2 + this.exports.length +
      2 + this.opens.length +
      2 + this.usesCount * 2 +
      2 + this.provides.length -
      6 // Subtract the header size already counted
    );
    output.putShort(this.moduleNameIndex);
    output.putShort(this.moduleFlags);
    output.putShort(this.moduleVersionIndex);

    // Requires
    output.putShort(this.requiresCount);
    output.putByteArray(this.requires.data, 0, this.requires.length);

    // Exports
    output.putShort(this.exportsCount);
    output.putByteArray(this.exports.data, 0, this.exports.length);

    // Opens
    output.putShort(this.opensCount);
    output.putByteArray(this.opens.data, 0, this.opens.length);

    // Uses
    output.putShort(this.usesCount);
    output.putByteArray(this.uses.data, 0, this.uses.length);

    // Provides
    output.putShort(this.providesCount);
    output.putByteArray(this.provides.data, 0, this.provides.length);
  }

  /**
   * Writes the ModulePackages attribute.
   */
  putPackages(output: ByteVector): void {
    output.putShort(this.symbolTable.addConstantUtf8('ModulePackages'));
    output.putInt(2 + this.packages.length);
    output.putShort(this.packagesCount);
    output.putByteArray(this.packages.data, 0, this.packages.length);
  }

  /**
   * Writes the ModuleMainClass attribute.
   */
  putMainClass(output: ByteVector): void {
    output.putShort(this.symbolTable.addConstantUtf8('ModuleMainClass'));
    output.putInt(2);
    output.putShort(this.mainClassIndex);
  }
}
