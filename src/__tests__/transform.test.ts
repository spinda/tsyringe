import {container} from "..";
import {injectable} from "../decorators";
import injectAllWithTransform from "../decorators/inject-all-with-transform";
import injectWithTransform from "../decorators/inject-with-transform";
import Transform from "../types/transform";

afterEach(() => {
  container.reset();
});

test("Injecting with transform should work", async () => {
  class Bar {}

  class BarTransform {
    public transform(): string {
      return "Transformed from bar";
    }
  }

  @injectable()
  class Foo {
    constructor(@injectWithTransform(Bar, BarTransform) public value: string) {}
  }

  const result = await container.resolve(Foo);

  expect(result.value).toEqual("Transformed from bar");
});

test("Injecting with transform should work passing a parameter from the decorator", async () => {
  class Bar {
    public repeat(str: string): string {
      return str + str;
    }
  }

  class BarTransform implements Transform<Bar, string> {
    public transform(bar: Bar, str: string): string {
      return bar.repeat(str);
    }
  }

  @injectable()
  class Foo {
    constructor(
      @injectWithTransform(Bar, BarTransform, "b") public value: string
    ) {}
  }

  const result = await container.resolve(Foo);

  expect(result.value).toEqual("bb");
});

test("Injecting with transform should work passing parameters from the decorator", async () => {
  class Bar {
    public concat(str1: string, str2: string): string {
      return str1 + str2;
    }
  }

  class BarTransform implements Transform<Bar, string> {
    public transform(bar: Bar, str1: string, str2: string): string {
      return bar.concat(str1, str2);
    }
  }

  @injectable()
  class Foo {
    constructor(
      @injectWithTransform(Bar, BarTransform, "a", "b") public value: string
    ) {}
  }

  const result = await container.resolve(Foo);

  expect(result.value).toEqual("ab");
});

test("Injecting all with transform should work", async () => {
  class Bar {}

  class BarTransform {
    public transform(): string {
      return "Transformed from bar";
    }
  }

  @injectable()
  class Foo {
    constructor(
      @injectAllWithTransform(Bar, BarTransform) public value: string
    ) {}
  }

  const result = await container.resolve(Foo);

  expect(result.value).toEqual("Transformed from bar");
});

test("Injecting all with transform should allow the transformer to act over an array", async () => {
  interface FooInterface {
    bar: string;
  }

  class FooOne implements FooInterface {
    public bar = "foo1";
  }

  class FooTwo implements FooInterface {
    public bar = "foo2";
  }

  container.register<FooInterface>("FooInterface", {useClass: FooOne});
  container.register<FooInterface>("FooInterface", {useClass: FooTwo});

  class FooTransform implements Transform<FooInterface[], string> {
    public transform(foos: FooInterface[]): string {
      return foos.map(f => f.bar).reduce((acc, f) => acc + f);
    }
  }

  @injectable()
  class Bar {
    constructor(
      @injectAllWithTransform("FooInterface", FooTransform, "!!")
      public value: string
    ) {}
  }

  const result = await container.resolve(Bar);

  expect(result.value).toEqual("foo1foo2");
});

test("Injecting all with transform should work with a decorator parameter", async () => {
  interface FooInterface {
    bar: string;
  }

  class FooOne implements FooInterface {
    public bar = "foo1";
  }

  class FooTwo implements FooInterface {
    public bar = "foo2";
  }

  container.register<FooInterface>("FooInterface", {useClass: FooOne});
  container.register<FooInterface>("FooInterface", {useClass: FooTwo});

  class FooTransform implements Transform<FooInterface[], string> {
    public transform(foos: FooInterface[], suffix: string): string {
      return foos.map(f => f.bar + suffix).reduce((acc, f) => acc + f);
    }
  }

  @injectable()
  class Bar {
    constructor(
      @injectAllWithTransform("FooInterface", FooTransform, "!!")
      public value: string
    ) {}
  }

  const result = await container.resolve(Bar);

  expect(result.value).toEqual("foo1!!foo2!!");
});

test("Injecting all with transform should allow multiple decorator params", async () => {
  interface FooInterface {
    bar: string;
  }

  class FooOne implements FooInterface {
    public bar = "foo1";
  }

  class FooTwo implements FooInterface {
    public bar = "foo2";
  }

  container.register<FooInterface>("FooInterface", {useClass: FooOne});
  container.register<FooInterface>("FooInterface", {useClass: FooTwo});

  class FooTransform implements Transform<FooInterface[], string> {
    public transform(
      foos: FooInterface[],
      delimiter: string,
      suffix: string
    ): string {
      return (
        foos.map(f => f.bar + delimiter).reduce((acc, f) => acc + f) + suffix
      );
    }
  }

  @injectable()
  class Bar {
    constructor(
      @injectAllWithTransform("FooInterface", FooTransform, ",", "!!")
      public value: string
    ) {}
  }

  const result = await container.resolve(Bar);

  expect(result.value).toEqual("foo1,foo2,!!");
});
