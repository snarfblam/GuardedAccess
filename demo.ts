// This file serves as a demo and "test" of the access guard helper types. 
// 
// I'm not aware of a better way to test "pure" types in practice, or whether 
// it's even generally possible. We're not testing against execution of
// code, but rather for expected/desired compiler errors.

import {
    DefaultGuard, guardClass, unguardClass,
    Guarded,  OriginalConstructor,
    GuardedConstructor, ExtensibleGuardedConstructor,
} from './guarded';



///////////////////////////////////////////////////////////////////////////
//  Test types
//
//  The strings assigned to properties depict the intended accessibility
//

class Demo {
    public unguarded = 'public read, public write';
    // An access guard only has a meaningful effect on public properties
    public _guarded = 'public read, protected write';
    // Protected members need to remain accessible in subclasses
    protected _unaffected = 'protected read, protected write';
    // Private members are not a concern either way.
    private _alsoUnaffected = 'private read, private write';
    #cantGuard = 'private read, private write';

    // Guards are applied to static members as well
    public static unguardedStatic = 'public read, public write';
    public static _guardedStatic = 'public read, protected write';

    // Unfortunately, non-public members are too opaque in typescript and
    // can not be modified in the same way. :(
    
    // Concerns for protected properties apply to methods as well.
    protected virtualMethod() { return 'protected'; }
    
    // Protected properties and methods must remain accessible in subclasses.
    protected static staticMethod(arg: string) { }
    protected static staticProperty = 'protected';
}

// Exporting a class means we need to export both a constructor function and
// an instance type.
export const DemoPublic = guardClass(Demo);
export type DemoPublic = Guarded<Demo>;

// This is an alternative, more verbose construction of the same class.
export const DemoPublicAlt: ExtensibleGuardedConstructor<typeof Demo> = Demo;
export type DemoPublicAlt = Guarded<Demo>;

// An alternative guard pattern (template literal type) can be specified
type DollarGuard = `${string}$`;
class DollarSuffix {
    public unguarded = 'public read, public write';
    public _alsoUnguarded = 'public read, public write';
    public guarded$ = 'public read, protected write';

    static unguardedStatic = 'public read, public write';
    static _alsoUnguardedStatic = 'public read, public write';
    static guardedStatic$ = 'public read, protected write';
}

export type DollarSuffixPublic = Guarded<DollarSuffix, DollarGuard>;
export const DollarSuffixPublic: GuardedConstructor<
    typeof DollarSuffix, DollarGuard> = DollarSuffix;



///////////////////////////////////////////////////////////////////////////
//  The "tests"
//
//  The strings assigned depict the expected errors. If the error matches the 
//  string this means it's working correctly!

const testObj = new DemoPublic;
testObj.unguarded = "No error.";
testObj._guarded = "Cannot assign to '_guarded' because it is a read-only property. ts(2540)";
// Non-public members now "don't exist" instead of being "not accessible"
testObj._unaffected = "Property '_unaffected' does not exist on type 'Guarded<Demo, `_${string}`>'. ts(2339)";


// Static members are guarded as well
DemoPublic.unguardedStatic = "No error.";
DemoPublic._guardedStatic = "Cannot assign to '_guardedStatic' because it is a read-only property. ts(2540)";

// To inherit, unguard the class
class DemoSubclass extends unguardClass(DemoPublic) {
    protected override virtualMethod() {
        Demo.staticMethod(Demo.staticProperty);
        this.unguarded = "No error.";
        this._unaffected = "No error.";
        this._guarded = "No error.";
        Demo.staticProperty = "No error.";

        this._alsoUnaffected = "Property '_alsoUnaffected' is private and only accessible within class 'Demo'. ts(2341)";
        this.#cantGuard = "Property '#cantGuard' is not accessible outside class 'Demo' because it has a private identifier. ts(18013)";

        return "No error.";
    }
}

// Alternative more verbose approach to unguarding a class
const DemoOriginalAlt = DemoPublic as OriginalConstructor<typeof DemoPublic>;
class DemoSubclassAlt extends DemoOriginalAlt { }

// Alternative guard pattern
const altTest = new DollarSuffixPublic();
altTest.unguarded = "No error.";
altTest._alsoUnguarded = "No error.";
altTest.guarded$ = "Cannot assign to 'guarded$' because it is a read-only property. ts(2540)";



///////////////////////////////////////////////////////////////////////////
//  The Failures
//
//  Things that should work but either can't or currently don't
//
// • Protected read, private write data properties can not be a thing.
//   Guarded interfaces depend on mapped types. Currently typescript has
//   zero support for mapping members that aren't fully public. Accessors 
//   must be used for this mode of assymetric accessibilty.
//
// • Unpermitted public access to protected or private members will produce
//   a different error on a type that's guarded versus one that isn't (e.g. "
//   does not exist" instead of "is declared private"). This isn't ideal, if
//   only because it's inconsistent.
//
// • `OriginalConstructor<GuardedConstructor<T>>` yields `never` instead of 
//   producing an error. Most likely an error will still crop up down the line,
//   but this still makes it harder to sort out the root of the problem: 
//   `ExtensibleGuardedConstructor` should have been used instead.
//       • Example: you might see "Type 'never' is not a constructor function 
//         type" when trying to extend a guarded class that was unintentionally
//         made non-extensible.
//
//  • The pseudo-property [OriginalConstructorKey] may appear on guarded
//    classes, depending on how the language service and/or IDE present the type
//    information.