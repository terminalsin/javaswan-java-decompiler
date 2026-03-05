/**
 * A reference to a type appearing in a class, field or method declaration, or on an instruction.
 * Such a reference designates the part of the class where the referenced type is appearing
 * (e.g. an 'extends', 'implements' or 'throws' clause, a 'new' instruction, a 'catch' clause,
 * a type cast, a local variable declaration, etc).
 */
export class TypeReference {
    /**
     * The sort of type references that target a type parameter of a generic class.
     * See {@link #getSort}.
     */
    static readonly CLASS_TYPE_PARAMETER = 0x00;

    /**
     * The sort of type references that target a type parameter of a generic method.
     * See {@link #getSort}.
     */
    static readonly METHOD_TYPE_PARAMETER = 0x01;

    /**
     * The sort of type references that target the super class of a class or one of the interfaces it implements.
     * See {@link #getSort}.
     */
    static readonly CLASS_EXTENDS = 0x10;

    /**
     * The sort of type references that target a bound of a type parameter of a generic class.
     * See {@link #getSort}.
     */
    static readonly CLASS_TYPE_PARAMETER_BOUND = 0x11;

    /**
     * The sort of type references that target a bound of a type parameter of a generic method.
     * See {@link #getSort}.
     */
    static readonly METHOD_TYPE_PARAMETER_BOUND = 0x12;

    /**
     * The sort of type references that target the type of a field.
     * See {@link #getSort}.
     */
    static readonly FIELD = 0x13;

    /**
     * The sort of type references that target the return type of a method.
     * See {@link #getSort}.
     */
    static readonly METHOD_RETURN = 0x14;

    /**
     * The sort of type references that target the receiver type of a method.
     * See {@link #getSort}.
     */
    static readonly METHOD_RECEIVER = 0x15;

    /**
     * The sort of type references that target the type of a formal parameter of a method.
     * See {@link #getSort}.
     */
    static readonly METHOD_FORMAL_PARAMETER = 0x16;

    /**
     * The sort of type references that target the type of an exception declared in the throws clause of a method.
     * See {@link #getSort}.
     */
    static readonly THROWS = 0x17;

    /**
     * The sort of type references that target the type of a local variable in a method.
     * See {@link #getSort}.
     */
    static readonly LOCAL_VARIABLE = 0x40;

    /**
     * The sort of type references that target the type of a resource variable in a method.
     * See {@link #getSort}.
     */
    static readonly RESOURCE_VARIABLE = 0x41;

    /**
     * The sort of type references that target the type of the exception of a 'catch' clause in a method.
     * See {@link #getSort}.
     */
    static readonly EXCEPTION_PARAMETER = 0x42;

    /**
     * The sort of type references that target the type declared in an 'instanceof' instruction.
     * See {@link #getSort}.
     */
    static readonly INSTANCEOF = 0x43;

    /**
     * The sort of type references that target the type of the object created by a 'new' instruction.
     * See {@link #getSort}.
     */
    static readonly NEW = 0x44;

    /**
     * The sort of type references that target the receiver type of a constructor reference.
     * See {@link #getSort}.
     */
    static readonly CONSTRUCTOR_REFERENCE = 0x45;

    /**
     * The sort of type references that target the receiver type of a method reference.
     * See {@link #getSort}.
     */
    static readonly METHOD_REFERENCE = 0x46;

    /**
     * The sort of type references that target the type declared in an explicit or implicit cast instruction.
     * See {@link #getSort}.
     */
    static readonly CAST = 0x47;

    /**
     * The sort of type references that target a type parameter of a generic constructor in a constructor call.
     * See {@link #getSort}.
     */
    static readonly CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT = 0x48;

    /**
     * The sort of type references that target a type parameter of a generic method in a method call.
     * See {@link #getSort}.
     */
    static readonly METHOD_INVOCATION_TYPE_ARGUMENT = 0x49;

    /**
     * The sort of type references that target a type parameter of a generic constructor in a constructor reference.
     * See {@link #getSort}.
     */
    static readonly CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT = 0x4A;

    /**
     * The sort of type references that target a type parameter of a generic method in a method reference.
     * See {@link #getSort}.
     */
    static readonly METHOD_REFERENCE_TYPE_ARGUMENT = 0x4B;

    /**
     * The target_type and target_info structures encoded in the value field.
     * target_type is encoded in the most significant byte of this int.
     * The target_info is in the remaining 3 bytes.
     */
    private readonly targetTypeAndInfo: number;

    /**
     * Constructs a new TypeReference.
     * @param typeRef the int encoded value of the type reference
     */
    constructor(typeRef: number) {
        this.targetTypeAndInfo = typeRef;
    }

    /**
     * Returns the sort of this type reference.
     * @returns one of the sort constants
     */
    getSort(): number {
        return this.targetTypeAndInfo >>> 24;
    }

    /**
     * Returns the index of the type parameter referenced by this type reference. This method must
     * only be used for type references whose sort is {@link #CLASS_TYPE_PARAMETER},
     * {@link #METHOD_TYPE_PARAMETER}, {@link #CLASS_TYPE_PARAMETER_BOUND} or
     * {@link #METHOD_TYPE_PARAMETER_BOUND}.
     * @returns a type parameter index
     */
    getTypeParameterIndex(): number {
        return (this.targetTypeAndInfo & 0x00FF0000) >> 16;
    }

    /**
     * Returns the index of the type parameter bound, within the type parameter {@link
     * #getTypeParameterIndex}, referenced by this type reference. This method must only be used for
     * type references whose sort is {@link #CLASS_TYPE_PARAMETER_BOUND} or
     * {@link #METHOD_TYPE_PARAMETER_BOUND}.
     * @returns a type parameter bound index
     */
    getTypeParameterBoundIndex(): number {
        return (this.targetTypeAndInfo & 0x0000FF00) >> 8;
    }

    /**
     * Returns the index of the "super type" of a class that is referenced by this type reference.
     * This method must only be used for type references whose sort is {@link #CLASS_EXTENDS}.
     * @returns the index of the super type, -1 for the super class, or the interface index
     */
    getSuperTypeIndex(): number {
        return ((this.targetTypeAndInfo & 0x00FFFF00) >> 8) - 1;
    }

    /**
     * Returns the index of the formal parameter whose type is referenced by this type reference.
     * This method must only be used for type references whose sort is
     * {@link #METHOD_FORMAL_PARAMETER}.
     * @returns a formal parameter index
     */
    getFormalParameterIndex(): number {
        return (this.targetTypeAndInfo & 0x00FF0000) >> 16;
    }

    /**
     * Returns the index of the exception, in a 'throws' clause of a method, whose type is
     * referenced by this type reference. This method must only be used for type references whose
     * sort is {@link #THROWS}.
     * @returns the index of an exception in the 'throws' clause of a method
     */
    getExceptionIndex(): number {
        return (this.targetTypeAndInfo & 0x00FFFF00) >> 8;
    }

    /**
     * Returns the index of the try catch block (using the order in which they are visited with
     * visitTryCatchBlock), whose 'catch' type is referenced by this type reference. This method
     * must only be used for type references whose sort is {@link #EXCEPTION_PARAMETER}.
     * @returns the index of an exception in the 'throws' clause of a method
     */
    getTryCatchBlockIndex(): number {
        return (this.targetTypeAndInfo & 0x00FFFF00) >> 8;
    }

    /**
     * Returns the index of the type argument referenced by this type reference. This method must
     * only be used for type references whose sort is {@link #CAST},
     * {@link #CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT}, {@link #METHOD_INVOCATION_TYPE_ARGUMENT},
     * {@link #CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT}, or {@link #METHOD_REFERENCE_TYPE_ARGUMENT}.
     * @returns a type argument index
     */
    getTypeArgumentIndex(): number {
        return this.targetTypeAndInfo & 0xFF;
    }

    /**
     * Returns the int encoded value of this type reference.
     * @returns the int encoded value
     */
    getValue(): number {
        return this.targetTypeAndInfo;
    }

    /**
     * Creates a type reference targeting a type parameter of a generic class or method.
     * @param sort one of CLASS_TYPE_PARAMETER or METHOD_TYPE_PARAMETER
     * @param paramIndex the type parameter index
     * @returns a type reference
     */
    static newTypeParameterReference(sort: number, paramIndex: number): TypeReference {
        return new TypeReference((sort << 24) | (paramIndex << 16));
    }

    /**
     * Creates a type reference targeting a type parameter bound of a generic class or method.
     * @param sort one of CLASS_TYPE_PARAMETER_BOUND or METHOD_TYPE_PARAMETER_BOUND
     * @param paramIndex the type parameter index
     * @param boundIndex the type parameter bound index
     * @returns a type reference
     */
    static newTypeParameterBoundReference(sort: number, paramIndex: number, boundIndex: number): TypeReference {
        return new TypeReference((sort << 24) | (paramIndex << 16) | (boundIndex << 8));
    }

    /**
     * Creates a type reference targeting the super class or an interface.
     * @param itfIndex the interface index, or -1 for the super class
     * @returns a type reference
     */
    static newSuperTypeReference(itfIndex: number): TypeReference {
        return new TypeReference((TypeReference.CLASS_EXTENDS << 24) | ((itfIndex + 1) << 8));
    }

    /**
     * Creates a type reference targeting a formal parameter type.
     * @param paramIndex the formal parameter index
     * @returns a type reference
     */
    static newFormalParameterReference(paramIndex: number): TypeReference {
        return new TypeReference((TypeReference.METHOD_FORMAL_PARAMETER << 24) | (paramIndex << 16));
    }

    /**
     * Creates a type reference targeting an exception type.
     * @param exceptionIndex the exception index
     * @returns a type reference
     */
    static newExceptionReference(exceptionIndex: number): TypeReference {
        return new TypeReference((TypeReference.THROWS << 24) | (exceptionIndex << 8));
    }

    /**
     * Creates a type reference targeting a try/catch block exception type.
     * @param tryCatchBlockIndex the try/catch block index
     * @returns a type reference
     */
    static newTryCatchReference(tryCatchBlockIndex: number): TypeReference {
        return new TypeReference((TypeReference.EXCEPTION_PARAMETER << 24) | (tryCatchBlockIndex << 8));
    }

    /**
     * Creates a type reference targeting a type argument.
     * @param sort one of CAST, CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT, METHOD_INVOCATION_TYPE_ARGUMENT,
     *             CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT, or METHOD_REFERENCE_TYPE_ARGUMENT
     * @param argIndex the type argument index
     * @returns a type reference
     */
    static newTypeArgumentReference(sort: number, argIndex: number): TypeReference {
        return new TypeReference((sort << 24) | argIndex);
    }

    /**
     * Puts the target_type and target_info of a type annotation into a ByteVector.
     * @param targetTypeAndInfo the target_type and target_info encoded value
     * @param output the byte vector to write to
     */
    static putTarget(targetTypeAndInfo: number, output: { putByte(b: number): void; putShort(s: number): void }): void {
        const sort = targetTypeAndInfo >>> 24;
        switch (sort) {
            case TypeReference.CLASS_TYPE_PARAMETER:
            case TypeReference.METHOD_TYPE_PARAMETER:
            case TypeReference.METHOD_FORMAL_PARAMETER:
                output.putShort(targetTypeAndInfo >>> 16);
                break;
            case TypeReference.FIELD:
            case TypeReference.METHOD_RETURN:
            case TypeReference.METHOD_RECEIVER:
                output.putByte(targetTypeAndInfo >>> 24);
                break;
            case TypeReference.LOCAL_VARIABLE:
            case TypeReference.RESOURCE_VARIABLE:
                output.putByte(targetTypeAndInfo >>> 24);
                // Table length is written separately
                break;
            case TypeReference.CAST:
            case TypeReference.CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT:
            case TypeReference.METHOD_INVOCATION_TYPE_ARGUMENT:
            case TypeReference.CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT:
            case TypeReference.METHOD_REFERENCE_TYPE_ARGUMENT:
                output.putByte(targetTypeAndInfo >>> 24);
                // offset is written separately
                output.putByte(targetTypeAndInfo & 0xFF);
                break;
            case TypeReference.CLASS_EXTENDS:
            case TypeReference.CLASS_TYPE_PARAMETER_BOUND:
            case TypeReference.METHOD_TYPE_PARAMETER_BOUND:
            case TypeReference.THROWS:
            case TypeReference.EXCEPTION_PARAMETER:
            case TypeReference.INSTANCEOF:
            case TypeReference.NEW:
            case TypeReference.CONSTRUCTOR_REFERENCE:
            case TypeReference.METHOD_REFERENCE:
                output.putByte(targetTypeAndInfo >>> 24);
                output.putShort((targetTypeAndInfo & 0xFFFF00) >> 8);
                break;
            default:
                throw new Error('Unknown type reference sort: ' + sort);
        }
    }
}
