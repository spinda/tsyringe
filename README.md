[![Travis](https://img.shields.io/travis/Microsoft/tsyringe.svg)](https://travis-ci.org/Microsoft/tsyringe/)
[![npm](https://img.shields.io/npm/v/tsyringe.svg)](https://www.npmjs.com/package/tsyringe)
[![npm](https://img.shields.io/npm/dt/tsyringe.svg)](https://www.npmjs.com/package/tsyringe)

# TSyringe

A lightweight dependency injection container for TypeScript/JavaScript for
constructor injection.

This is a fork of [tsyringe](https://github.com/microsoft/tsyringe). The most notable difference
is that resolution of dependencies is asynchronous (via async methods) to allow for asynchronous initialization of
resolved objects after they are constructed. This functionality comes from
[tsyringe-async](https://github.com/launchtray/tsyringe), rebased on top of an up-to-date copy of
the original tsyringe.

<!-- TOC depthFrom:1 depthTo:3 -->

- [tsyringe-async](#tsyringe-async)
  - [Installation](#installation)
- [API](#api)
  - [Decorators](#decorators)
    - [injectable()](#injectable)
    - [singleton()](#singleton)
    - [inject()](#inject)
    - [injectAll()](#injectall)
    - [injectWithTransform()](#injectWithTransform)
    - [injectAllWithTransform()](#injectAllWithTransform)
    - [scoped()](#scoped)
    - [initializer()](#initializer)
  - [Container](#container)
    - [Injection Token](#injection-token)
    - [Providers](#providers)
    - [Register](#register)
    - [Registry](#registry)
    - [Resolution](#resolution)
    - [Interception](#interception)
    - [Child Containers](#child-containers)
    - [Clearing Instances](#clearing-instances)
- [Disposable instances](#disposable-instances)
- [Full examples](#full-examples)
  - [Example without interfaces](#example-without-interfaces)
  - [Example with interfaces](#example-with-interfaces)
  - [Injecting primitive values (Named injection)](#injecting-primitive-values-named-injection)
- [Contributing](#contributing)

<!-- /TOC -->

## Installation

Install by `npm`

```sh
npm install --save @launchtray/tsyringe-async
```

**or** install with `yarn` (this project is developed using `yarn`)

```sh
yarn add @launchtrary/tsyringe-async
```

Modify your `tsconfig.json` to include the following settings

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Add a polyfill for the Reflect API (examples below use reflect-metadata). You can use:

- [reflect-metadata](https://www.npmjs.com/package/reflect-metadata)
- [core-js (core-js/es7/reflect)](https://www.npmjs.com/package/core-js)
- [reflection](https://www.npmjs.com/package/@abraham/reflection)

The Reflect polyfill import should only be added once, and before DI is used:

```typescript
// main.ts
import "reflect-metadata";

// Your code here...
```

### Babel

If you're using Babel (e.g. using React Native), you will need to configure it to emit TypeScript metadata.

First get the Babel plugin

#### Yarn

```
yarn add --dev babel-plugin-transform-typescript-metadata
```

#### npm

```
npm install --save-dev babel-plugin-transform-typescript-metadata
```

Then add it to your Babel config

```
plugins: [
            'babel-plugin-transform-typescript-metadata',
            /* ...the rest of your config... */
         ]
```

# API

TSyringe performs [Constructor Injection](https://en.wikipedia.org/wiki/Dependency_injection#Constructor_injection)
on the constructors of decorated classes.

## Decorators

### injectable()

Class decorator factory that allows the class' dependencies to be injected at
runtime. TSyringe relies on several decorators in order to collect metadata about classes
to be instantiated.

#### Usage

```typescript
import {injectable} from "@launchtray/tsyringe-async";

@injectable()
class Foo {
  constructor(private database: Database) {}
}

// some other file
import "reflect-metadata";
import {container} from "@launchtray/tsyringe-async";
import {Foo} from "./foo";

const instance = container.resolve(Foo);
```

### singleton()

Class decorator factory that registers the class as a singleton within the
global container.

#### Usage

```typescript
import {singleton} from "@launchtray/tsyringe-async";

@singleton()
class Foo {
  constructor() {}
}

// some other file
import "reflect-metadata";
import {container} from "@launchtray/tsyringe-async";
import {Foo} from "./foo";

const instance = container.resolve(Foo);
```

### inject()

Parameter decorator factory that allows for interface and other non-class
information to be stored in the constructor's metadata.

#### Usage

```typescript
import {injectable, inject} from "@launchtray/tsyringe-async";

interface Database {
  // ...
}

@injectable()
class Foo {
  constructor(@inject("Database") private database?: Database) {}
}
```

### injectAll()

Parameter decorator for array parameters where the array contents will come from the container.
It will inject an array using the specified injection token to resolve the values.

#### Usage

```typescript
import {injectable, injectAll} from "@launchtray/tsyringe-async";

@injectable()
class Foo {}

@injectable()
class Bar {
  constructor(@injectAll(Foo) fooArray: Foo[]) {
    // ...
  }
}
```

### injectWithTransform()

Parameter decorator which allows for a transformer object to take an action on the resolved object
before returning the result.

```typescript
class FeatureFlags {
  public getFlagValue(flagName: string): boolean {
    // ...
}

class Foo() {}

class FeatureFlagsTransformer implements Transform<FeatureFlags, bool> {
  public transform(flags: FeatureFlags, flag: string) {
    return flags.getFlagValue(flag);
  }
}

@injectable()
class MyComponent(foo: Foo, @injectWithTransform(FeatureFlags, FeatureFlagsTransformer, "IsBlahEnabled") blahEnabled: boolean){
  // ...
}
```

### injectAllWithTransform()

This parameter decorator allows for array contents to be passed through a transformer. The transformer can return any type, so this
can be used to map or fold an array.

```typescript
@injectable()
class Foo {
  public value;
}

class FooTransform implements Transform<Foo[], string[]>{
  public transform(foos: Foo[]): string[]{
    return foos.map(f => f.value));
  }
}

@injectable()
class Bar {
  constructor(@injectAllWithTransform(Foo, FooTransform) stringArray: string[]) {
    // ...
  }
}
```

### scoped()

Class decorator factory that registers the class as a scoped dependency within the global container.

#### Available scopes

- Transient
  - The **default** registration scope, a new instance will be created with each resolve
- Singleton
  - Each resolve will return the same instance (including resolves from child containers)
- ResolutionScoped
  - The same instance will be resolved for each resolution of this dependency during a single
    resolution chain
- ContainerScoped
  - The dependency container will return the same instance each time a resolution for this dependency
    is requested. This is similar to being a singleton, however if a child container is made, that child
    container will resolve an instance unique to it.

#### Usage

```typescript
@scoped(Lifecycle.ContainerScoped)
class Foo {}
```

### initializer()
Any methods that this decorator is applied to will be called (and awaited) following construction of 
the object but prior to resolution. This allows for asynchronous initialization of an object that is
guaranteed to run before it is injected as a dependency elsewhere.

Initializer methods can also have dependencies injected as arguments, as they are with constructors. 

#### Usage

```typescript
@injectable()
class Foo {
  public value!: string;

  @initializer()
  async init(): Promise<void> {
    value = await API.fetchValue();
  }
}

@injectable()
class Bar {
  constructor(public foo: Foo) {
    // foo.value is safe to use here, since Foo.init has 
    // already been called prior to injection
  }

  @initializer()
  async init(foo: Foo): Promise<void> {
    // This is an example of how parameters can be injected into initializer methods
    // similar to how they can be with constructors
    await db.save(foo.value);
  }
}
```

## Container

The general principle behind [Inversion of Control](https://en.wikipedia.org/wiki/Inversion_of_control) (IoC) containers
is you give the container a _token_, and in exchange you get an instance/value. Our container automatically figures out the tokens most of the time, with 2 major exceptions, interfaces and non-class types, which require the `@inject()` decorator to be used on the constructor parameter to be injected (see above).

In order for your decorated classes to be used, they need to be registered with the container. Registrations take the
form of a Token/Provider pair, so we need to take a brief diversion to discuss tokens and providers.

### Injection Token

A token may be either a string, a symbol, or a class constructor.

```typescript
type InjectionToken<T = any> =
  | constructor<T>
  | string
  | symbol;
```

### Providers

Our container has the notion of a _provider_. A provider is registered with the DI
container and provides the container the information
needed to resolve an instance for a given token. In our implementation, we have the following 4
provider types:

#### Class Provider

```TypeScript
{
  token: InjectionToken<T>;
  useClass: constructor<T>;
}
```

This provider is used to resolve classes by their constructor. When registering a class provider
you can simply use the constructor itself, unless of course you're making an alias (a
class provider where the token isn't the class itself).

#### Value Provider

```TypeScript
{
  token: InjectionToken<T>;
  useValue: T
}
```

This provider is used to resolve a token to a given value. This is useful for registering
constants, or things that have a already been instantiated in a particular way.

#### Factory provider

```TypeScript
{
  token: InjectionToken<T>;
  useFactory: FactoryFunction<T>;
}
```

This provider is used to resolve a token using a given factory. The factory has full access
to the dependency container.

We have provided 2 factories for you to use, though any function that matches the `FactoryFunction<T>` signature
can be used as a factory:

```typescript
type FactoryFunction<T> = (dependencyContainer: DependencyContainer) => Promise<T>;
```

##### instanceCachingFactory

This factory is used to lazy construct an object and cache result, returning the single instance for each subsequent
resolution. This is very similar to `@singleton()`

```typescript
import {instanceCachingFactory} from "@launchtray/tsyringe-async";

{
  token: "SingletonFoo";
  useFactory: instanceCachingFactory<Foo>(c => c.resolve(Foo));
}
```

##### instancePerContainerCachingFactory

This factory is used to lazy construct an object and cache result per `DependencyContainer`, returning the single instance for each subsequent
resolution from a single container. This is very similar to `@scoped(Lifecycle.ContainerScoped)`

```typescript
import {instancePerContainerCachingFactory} from "tsyringe";

{
  token: "ContainerScopedFoo";
  useFactory: instancePerContainerCachingFactory<Foo>(c => c.resolve(Foo));
}
```

##### predicateAwareClassFactory

This factory is used to provide conditional behavior upon resolution. It caches the result by default, but
has an optional parameter to resolve fresh each time.

```typescript
import {predicateAwareClassFactory} from "@launchtray/tsyringe-async";

{
  token: "FooHttp",
  useFactory: predicateAwareClassFactory<Foo>(
    c => c.resolve(Bar).useHttps, // Predicate for evaluation
    FooHttps, // A FooHttps will be resolved from the container if predicate is true
    FooHttp // A FooHttp will be resolved if predicate is false
  );
}
```

#### Token Provider

```TypeScript
{
  token: InjectionToken<T>;
  useToken: InjectionToken<T>;
}
```

This provider can be thought of as a redirect or an alias, it simply states that given token _x_,
resolve using token _y_.

### Register

The normal way to achieve this is to add `DependencyContainer.register()` statements somewhere
in your program some time before your first decorated class is instantiated.

```typescript
container.register<Foo>(Foo, {useClass: Foo});
container.register<Bar>(Bar, {useValue: new Bar()});
container.register<Baz>("MyBaz", {useValue: new Baz()});
```

#### Registration options

As an optional parameter to `.register()` you may provide [`RegistrationOptions`](./src/types/registration-options.ts)
which customize how the registration behaves. See the linked source code for up to date documentation
on available options.

### Registry

You can also mark up any class with the `@registry()` decorator to have the given providers registered
upon importing the marked up class. `@registry()` takes an array of providers like so:

```TypeScript
@registry([
  { token: Foobar, useClass: Foobar },
  { token: "theirClass", useFactory: (c) => {
       return new TheirClass( "arg" )
    },
  }
])
class MyClass {}
```

This is useful when you want to [register multiple classes for the same token](#register).
You can also use it to register and declare objects that wouldn't be imported by anything else,
such as more classes annotated with `@registry` or that are otherwise responsible for registering objects.
Lastly you might choose to use this to register 3rd party instances instead of the `container.register(...)` method.
note: if you want this class to be `@injectable` you must put the decorator before `@registry`, this annotation is not
required though.

### Resolution

Resolution is the process of exchanging a token for an instance. Our container will recursively fulfill the
dependencies of the token being resolved in order to return a fully constructed object.

The typical way that an object is resolved is from the container using `resolve()`.

```typescript
const myFoo = container.resolve(Foo);
const myBar = container.resolve<Bar>("Bar");
```

You can also resolve all instances registered against a given token with `resolveAll()`.

```typescript
interface Bar {}

@injectable()
class Foo implements Bar {}
@injectable()
class Baz implements Bar {}

@registry([
  // registry is optional, all you need is to use the same token when registering
  {token: "Bar", useToken: Foo}, // can be any provider
  {token: "Bar", useToken: Baz}
])
class MyRegistry {}

const myBars = container.resolveAll<Bar>("Bar"); // myBars type is Bar[]
```

### Interception

Interception allows you to register a callback that will be called before or after the resolution of a specific token.
This callback can be registered to execute only once (to perform initialization, for example),
on each resolution to do logging, for example.

`beforeResolution` is used to take an action before an object is resolved.

```typescript
class Bar {}

container.beforeResolution(
  Bar,
  // Callback signature is (token: InjectionToken<T>, resolutionType: ResolutionType) => void
  () => {
    console.log("Bar is about to be resolved!");
  },
  {frequency: "Always"}
);
```

`afterResolution` is used to take an action after the object has been resolved.

```typescript
class Bar {
  public init(): void {
    // ...
  }
}

container.afterResolution(
  Bar,
  // Callback signature is (token: InjectionToken<T>, result: T | T[], resolutionType: ResolutionType)
  (_t, result) => {
    result.init();
  },
  {frequency: "Once"}
);
```

### Child Containers

If you need to have multiple containers that have disparate sets of registrations, you can create child containers:

```typescript
const childContainer1 = container.createChildContainer();
const childContainer2 = container.createChildContainer();
const grandChildContainer = childContainer1.createChildContainer();
```

Each of the child containers will have independent registrations, but if a registration is absent in the child container at resolution, the token will be resolved from the parent. This allows for a set of common services to be registered at the root, with specialized services registered on the child. This can be useful, for example, if you wish to create per-request containers that use common stateless services from the root container.

### Clearing Instances

The `container.clearInstances()` method allows you to clear all previously created and registered instances:

```typescript
class Foo {}
@singleton()
class Bar {}

const myFoo = new Foo();
container.registerInstance("Test", myFoo);
const myBar = container.resolve(Bar);

container.clearInstances();

container.resolve("Test"); // throws error
const myBar2 = container.resolve(Bar); // myBar !== myBar2
const myBar3 = container.resolve(Bar); // myBar2 === myBar3
```

Unlike with `container.reset()`, the registrations themselves are not cleared.
This is especially useful for testing:

```typescript
@singleton()
class Foo {}

beforeEach(() => {
  container.clearInstances();
});

test("something", () => {
  container.resolve(Foo); // will be a new singleton instance in every test
});
```

# Disposable instances
All instances created by the container that implement the [`Disposable`](./src/types/disposable.ts)
interface will automatically be disposed of when the container is disposed.

```typescript
container.dispose();
```

or to await all asynchronous disposals:

```typescript
await container.dispose();
```

# Full examples

## Example without interfaces

Since classes have type information at runtime, we can resolve them without any
extra information.

```typescript
// Foo.ts
export class Foo {}
```

```typescript
// Bar.ts
import {Foo} from "./Foo";
import {injectable} from "@launchtray/tsyringe-async";

@injectable()
export class Bar {
  constructor(public myFoo: Foo) {}
}
```

```typescript
// main.ts
import "reflect-metadata";
import {container} from "@launchtray/tsyringe-async";
import {Bar} from "./Bar";

const myBar = container.resolve(Bar);
// myBar.myFoo => An instance of Foo
```

## Example with interfaces

Interfaces don't have type information at runtime, so we need to decorate them
with `@inject(...)` so the container knows how to resolve them.

```typescript
// SuperService.ts
export interface SuperService {
  // ...
}
```

```typescript
// TestService.ts
import {SuperService} from "./SuperService";
export class TestService implements SuperService {
  //...
}
```

```typescript
// Client.ts
import {injectable, inject} from "@launchtray/tsyringe-async";

@injectable()
export class Client {
  constructor(@inject("SuperService") private service: SuperService) {}
}
```

```typescript
// main.ts
import "reflect-metadata";
import {Client} from "./Client";
import {TestService} from "./TestService";
import {container} from "@launchtray/tsyringe-async";

container.register("SuperService", {
  useClass: TestService
});

const client = container.resolve(Client);
// client's dependencies will have been resolved
```

## Injecting primitive values (Named injection)

Primitive values can also be injected by utilizing named injection

```typescript
import {singleton, inject} from "tsyringe";

@singleton()
class Foo {
  private str: string;
  constructor(@inject("SpecialString") value: string) {
    this.str = value;
  }
}

// some other file
import "reflect-metadata";
import {container} from "tsyringe";
import {Foo} from "./foo";

const str = "test";
container.register("SpecialString", {useValue: str});

const instance = container.resolve(Foo);
```
