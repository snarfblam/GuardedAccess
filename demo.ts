// This file serves as a demo and "test" of the access guard helper types. 
// 
// I'm not sure how one can test "pure" types in practice, or whether it's even
// generally possible. We're not testing against proper execution of
// code, but rather for proper inferencing and type mutation, which is 
// manifested in an IDE and a compiler rather than at runtime.

import {
    guardClass, unguardClass,
    DefaultGuard, Guarded, GuardedConstructor, ExtensibleGuardedConstructor, OriginalConstructor,
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
testObj.unguarded = 'no error';
testObj._guarded = "Cannot assign to '_guarded' because it is a read-only property. ts(2540)";
// Non-public members now "don't exist" instead of being "not accessible"
testObj._unaffected = "Property '_unaffected' does not exist on type 'Guarded<Demo, `_${string}`>'. ts(2339)";

// To inherit, unguard the class
class DemoSubclass extends unguardClass(DemoPublic) {
    protected override virtualMethod() {
        Demo.staticMethod(Demo.staticProperty);
        this.unguarded = 'no error';
        this._unaffected = 'no error';
        this._guarded = 'no error';
        Demo.staticProperty = 'no error';

        this._alsoUnaffected = "Property '_alsoUnaffected' is private and only accessible within class 'Demo'.ts(2341)";
        this.#cantGuard = "Property '#cantGuard' is not accessible outside class 'Demo' because it has a private identifier.ts(18013)";
    }
}

// Alternative, less type-safe approach to unguarding a class
const DemoOriginal = DemoPublic as any as OriginalConstructor<typeof DemoPublic>;
class DemoSubclassAlt extends DemoOriginal { }


///////////////////////////////////////////////////////////////////////////
//  The Failures
//
//  Things that should work but either can't or currently don't

// Ideally statics would remain visible.
DemoPublic.unguardedStatic = "Property 'unguardedStatic' does not exist on type 'ExtensibleGuardedConstructor<typeof Demo, `_${string}`>'.ts(2339)";

// Ideally the error here should be that _guardedStatic is readonly.
DemoPublic._guardedStatic = "Property 'unguardedStatic' does not exist on type 'ExtensibleGuardedConstructor<typeof Demo, `_${string}`>'.ts(2339)";

// Ideally the intermediate cast to `any` wouldn't be necessary.
const DemoOriginalAlt = DemoPublic as OriginalConstructor<typeof DemoPublic>;

