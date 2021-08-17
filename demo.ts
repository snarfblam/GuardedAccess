// This file serves as a demo and "test" of the access guard helper types. 
// 
// I'm not sure how one can test "pure" types in practice, or whether it's even
// generally possible. We're not testing against proper execution of
// code, but rather for proper inferencing and type mutation, which is 
// manifested in an IDE and a compiler rather than at runtime.

import {
    DefaultGuard, guardClass, unguardClass,
    Guarded,  OriginalConstructor,
    GuardedConstructor, ExtensibleGuardedConstructor,
} from './guardTypes';


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

    // Unfortunately, non-public members are too opaque in typescript and
    // can not be modified in the same way. :(
    
    // Concerns for protected properties apply to methods as well.
    protected virtualMethod() { return 'protected'; }
    
    // Static properties and methods must remain accessible in subclasses.
    protected static staticMethod(arg: string) { }
    protected static staticProperty = 'protected';

    // An unresolved complication is that static properties and methods
    // are not accessible on the guarded constructor.
    public static unguardedStatic = 'public read, public write';
    public static _guardedStatic = 'public read, public write';
}

// Exporting a class means we need to export both a constructor function and
// an instance type.
export const DemoPublic = guardClass<typeof Demo, true, DefaultGuard>(Demo, true);
export type DemoPublic = Guarded<Demo, DefaultGuard>;

// This is an alternative, equivalent construction. Note the required cast to
// `any` or `unkonwn`).
export const DemoPublicAlt: ExtensibleGuardedConstructor<typeof Demo, DefaultGuard> = Demo as any;
export type DemoPublicAlt = Guarded<Demo, DefaultGuard>;

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

// To inherit, unguard the class
class DemoSubclass extends unguardClass(DemoPublic) {
    protected override virtualMethod() {
        Demo.staticMethod(Demo.staticProperty);
        this.unguarded = "No error.";
        this._unaffected = "No error.";
        this._guarded = "No error.";
        Demo.staticProperty = "No error.";

        this._alsoUnaffected = "Property '_alsoUnaffected' is private and only accessible within class 'Demo'.ts(2341)";
        this.#cantGuard = "Property '#cantGuard' is not accessible outside class 'Demo' because it has a private identifier.ts(18013)";

        return "No error.";
    }
}

// Alternative, less type-safe approach to unguarding a class
const DemoOriginal = DemoPublic as any as OriginalConstructor<typeof DemoPublic>;
class DemoSubclassAlt extends DemoOriginal { }

// Static members are guarded as well
DemoPublic.unguardedStatic = "No error.";
DemoPublic._guardedStatic = "Cannot assign to '_guardedStatic' because it is a read-only property.ts(2540)";


///////////////////////////////////////////////////////////////////////////
//  The Failures
//
//  Things that should work but either can't or currently don't

// Ideally an intermediate cast to `any` wouldn't be necessary.
//     Conversion of type ... to type ... may be a mistake because neither type 
//     sufficiently overlaps with the other.If this was intentional, convert the
//     expression to 'unknown' first. (...) ts(2352)
const DemoOriginalSansAny = DemoPublic as OriginalConstructor<typeof DemoPublic>;
//     Type 'typeof Demo' is not assignable to type 
//     'ExtensibleGuardedConstructor<typeof Demo, `_${string}`>'.
//     Property '[originalConstructorKey]' is missing in type 'typeof Demo' but
//     required in type 'OriginalConstructorCarryon<typeof Demo>'.ts(2322)
export const DemoPublicSansAny: ExtensibleGuardedConstructor<typeof Demo, DefaultGuard> = Demo;

