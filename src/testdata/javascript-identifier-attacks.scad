// Identifiers that are inherited from Object.prototype on a normal JS object.
// Every one of these is valid OpenSCAD input and must remain an identifier.
constructor = 1;
__proto__ = 2;
prototype = 3;
toString = 4;
toLocaleString = 5;
valueOf = 6;
hasOwnProperty = 7;
isPrototypeOf = 8;
propertyIsEnumerable = 9;
__defineGetter__ = 10;
__defineSetter__ = 11;
__lookupGetter__ = 12;
__lookupSetter__ = 13;

echo(constructor, __proto__, prototype, toString, toLocaleString, valueOf,
     hasOwnProperty, isPrototypeOf, propertyIsEnumerable, __defineGetter__,
     __defineSetter__, __lookupGetter__, __lookupSetter__);

function constructor() = 1;
function __proto__() = 2;
function prototype() = 3;
function toString() = 4;
function toLocaleString() = 5;
function valueOf() = 6;
function hasOwnProperty() = 7;
function isPrototypeOf() = 8;
function propertyIsEnumerable() = 9;
function __defineGetter__() = 10;
function __defineSetter__() = 11;
function __lookupGetter__() = 12;
function __lookupSetter__() = 13;

module constructor() {}
module __proto__() {}
module prototype() {}
module toString() {}
module toLocaleString() {}
module valueOf() {}
module hasOwnProperty() {}
module isPrototypeOf() {}
module propertyIsEnumerable() {}
module __defineGetter__() {}
module __defineSetter__() {}
module __lookupGetter__() {}
module __lookupSetter__() {}

constructor();
__proto__();
prototype();
toString();
toLocaleString();
valueOf();
hasOwnProperty();
isPrototypeOf();
propertyIsEnumerable();
__defineGetter__();
__defineSetter__();
__lookupGetter__();
__lookupSetter__();

/** @param x [constructor] [__proto__=must-not-change-the-tags-prototype] [prototype] [toString] [toLocaleString] [valueOf] [hasOwnProperty] [isPrototypeOf] [propertyIsEnumerable] [__defineGetter__] [__defineSetter__] [__lookupGetter__] [__lookupSetter__] */
module documented(x = 1) {}
