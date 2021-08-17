///////////////////////////////////////////////////////////////////////
//  Exported Helper Types
//
//  Available externally as these may be useful for consumers of this library
//  for composition of their types.
//

import { getAllJSDocTagsOfKind } from "./node_modules/typescript/lib/typescript";

/** Constructor interface that accepts `TParams` to produce an instance of
 *  `TInstance`.
 *  @template TParams A tuple type representing the constructor parameters.
 *  @template TInstance The type produced by the constructor.
 */
export interface Constructor<TParams extends [] = any, TInstance = any> {
    new(...args: TParams): TInstance;
}

/** Template literal type that identifies underscore-prefixed property names 
 * as guarded identifiers. */
export type DefaultGuard = `_${string}`;



///////////////////////////////////////////////////////////////////////
//  Internal Helper Types
//
//  Used internally for type composition and modification
//

/** Helper type. Strip the readonly modifer from all properties. 
 *  @template T The type to modify.
 */
type Mutable<T> = { -readonly [P in keyof T]: T[P] }; // Helper

/** Abstract symbol used to generate a unique symbol type. */
declare const originalConstructorKey: unique symbol

/** Key used to store and retrieve the original type from a guarded type. */
type OriginalConstructorKey = typeof originalConstructorKey;



///////////////////////////////////////////////////////////////////////
//  Guard Types
//
//  La raison d'etre
//

/** Provide a union of property names for the specified interface that will
 *  be guarded.
 *  @template T The type whose properties are to be examined.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 */
export type GuardedNameOf<T, TGuard extends string> =
    keyof T & TGuard;

/** Isolate those properties of an interface that are guarded.
 *  @template T The type whose properties are to be examined.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 */
export type GuardedProperties<T, TGuard extends string> =
    Pick<T, GuardedNameOf<T, TGuard>>;

/** Isolate those properties of an interface that are not guarded.
 *  @template T The type whose properties are to be examined.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 */
export type UnguardedProperties<T, TGuard extends string> =
    Omit<T, GuardedNameOf<T, TGuard>>;

/** Apply a readonly modifier to any properties that match the guard template  
 *  `TGuard`. 
 *  @template T The type to apply guards to.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 *  @remarks When applied to a class, non-public members will be lost from the
 *  resultant type.
 */
export type Guarded<T, TGuard extends string> =
    UnguardedProperties<T, TGuard> & Readonly<GuardedProperties<T, TGuard>>;

/** Create a constructor interface whose instance type is guarded and whose 
 *  static members are guarded.
 *  @template T The class or constructor to be modified.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 */
export type GuardedConstructor<T extends Constructor, TGuard extends string> = {
    new(...args: ConstructorParameters<T>): Guarded<InstanceType<T>, TGuard>;
} & Guarded<T, TGuard>;

/** Remove the readonly modifier from any property whose name matches the guard
 *  template. This is **not** the strict inverse of the `Guarded<>` helper.
 *  @template T The interface to be modified
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed. 
 *  @see the `OriginalConstructor` type and the `unguardClass` function
 */
export type Unguarded<T, TGuard extends string> =
    UnguardedProperties<T, TGuard> & Mutable<GuardedProperties<T, TGuard>>;

/** Create a constructor interface whose instance type is unguarded and whose
 *  static members are unguarded.
 *  @template T The class or constructor to be modified.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 */
export type UnguardedConstructor<T extends Constructor, TGuard extends string> = {
    new(...args: ConstructorParameters<T>): Unguarded<InstanceType<T>, TGuard>;
} & Unguarded<T, TGuard>;

/** Defines the pseudo-property that contains the original constructor 
 *  for which a guarded constructor was created.
 *  @template T The original class or constructor.
 */
interface OriginalConstructorCarryon<T extends Constructor> {
    [originalConstructorKey]?: T;
}

/** Get the original class or constructor from which a guarded constructor was
 *  created.
 *  @template T The class or constructor to be modified.
 * */
export type OriginalConstructor<T> =
    T extends { [originalConstructorKey]?: infer R } ? R : never

/** Create a constructor interface whose instance type is `Guarded<T, TGuard>`,
 *  and that has a property `privateConstructor` containing the constructor
 *  with the original type.
 *  @template T The class or constructor to be modified.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed.
 */
export type ExtensibleGuardedConstructor<T extends Constructor, TGuard extends string> =
    GuardedConstructor<T, TGuard> & OriginalConstructorCarryon<T>;

/** A type that is not statically known to be extensible. This is strictly a
 *  transitional type (not suitable for use as a concrete type).
 *  @template T The type to be guarded.
 *  @template TExtensible A boolean literal type (true, false, or a generic 
 *  parameter that will evaluate to true or false) indicating whether the 
 *  resultant type will be extensible, in which case its original constructor 
 *  type can be retreived.
 *  @template TGuard Optional. The template that identifies the pattern used to
 *  denote guarded properties. Defaults to underscore-prefixed. 
 */
type MaybeExtensibleGuardedConstructor<T extends Constructor, TExtensible extends boolean, TGuard extends string> =
    TExtensible extends true ? ExtensibleGuardedConstructor<T, TGuard> : GuardedConstructor<T, TGuard>;



///////////////////////////////////////////////////////////////////////
//  Helper Functions
//
//  To simplify applying and removing guards by leveraging type
//  inferences.
//

/** Applies readonly acccess guards to guarded properties. This function 
 *  facilitates type coercion and at runtime is a no-op.
 *  @param ctor The constructor to apply the access guard to.
 *  @param extensible If true, the original constructor type can be retreived
 *  for the purpose of subclassing. 
 *  @returns The constructor that was passed in, re-typed.
 *  @see the `GuardedConstructor` and `ExtensibleGuardedConstructor` types
 *  for a more pure alternative.
 */    
export function guardClass<T extends Constructor, TExtensible extends boolean, TGuard extends string>(ctor: T, extensible: TExtensible) {
    return ctor as unknown as MaybeExtensibleGuardedConstructor<T, TExtensible, TGuard>;
}

/** Reverses the type-change applied by guardClass().
 *  @param ctor The constructor to remove the access guard from
 *  @returns The constructor that was passed in, with its originally declared 
 *  type.
 *  @see the 
 */
export function unguardClass<T extends ExtensibleGuardedConstructor<TOrig, TGuard>, TGuard extends string, TOrig extends Constructor>(ctor: T): OriginalConstructor<T> {
    return ctor as any;
}
