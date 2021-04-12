import { Router } from "./router.ts";
import { HTTPMethod } from "./layer.ts";
import { Context } from "./context.ts";
import { Next } from "./middleware.ts";
import { assertEquals, assertThrowsAsync } from "./dev_deps.ts";

const methodNames: Array<Lowercase<HTTPMethod>> = [
  "head",
  "options",
  "get",
  "put",
  "patch",
  "post",
  "delete",
];

export class MockContext extends Context {
  constructor(method: string, path: string) {
    super({
      request: {
        method: method.toUpperCase(),
        url: `http://localhost:8080${path}`,
      },
    } as any);
  }
}

Deno.test({
  name: `router - no middlewares registered`,
  async fn() {
    await new Router().dispatch(new MockContext("GET", "/foo/123/beep"));
  },
});

for (const methodName of methodNames) {
  Deno.test({
    name: `router - match route - ${methodName}`,
    async fn() {
      const callStack: Array<number> = [];
      const router = new Router();
      const method = router[methodName] as Function;

      router.use(async (ctx, next) => {
        callStack.push(1);
        await next();
      });
      router.use("/foo", async (ctx, next) => {
        callStack.push(2);
        await next();
      });
      router.use("/foo/bar", async (ctx, next) => {
        callStack.push(3);
        await next();
      });
      router.use("/foo/baz", async (ctx, next) => {
        callStack.push(4);
        await next();
      });

      method.call(router, "/foo", (ctx: Context, next: Next) => {
        callStack.push(5);
        return next();
      });
      method.call(router, "/foo/bar", (ctx: Context, next: Next) => {
        callStack.push(6);
        return next();
      });
      method.call(router, "/foo/bar", () => {
        callStack.push(7);
      });
      method.call(router, "/foo/bar", () => {
        callStack.push(8);
      });

      await router.dispatch(new MockContext(methodName, "/foo/bar"));

      assertEquals(callStack, [1, 2, 3, 6, 7]);
    },
  });
}

Deno.test({
  name: `router - match route - all`,
  async fn() {
    let callStack: Array<string> = [];
    const router = new Router();

    router.all("/foo/bar", async (ctx, next) => {
      callStack.push(ctx.request.method);
      return next();
    });

    for (const methodName of methodNames) {
      await router.dispatch(new MockContext(methodName, "/foo/bar"));
    }
    assertEquals(callStack, ["GET", "PUT", "POST", "DELETE"]);
  },
});

for (const methodName of methodNames) {
  Deno.test({
    name: `router - match array of routes - ${methodName}`,
    async fn() {
      let callStack: Array<number> = [];
      const router = new Router();
      const method = router[methodName] as Function;

      router.use(async (ctx, next) => {
        callStack.push(1);
        await next();
      });

      method.call(router, "/foo/bar", (ctx: Context, next: Next) => {
        callStack.push(2);
        return next();
      });
      method.call(
        router,
        ["/foo/bar", "/foo/baz"],
        (ctx: Context, next: Next) => {
          callStack.push(3);
          return next();
        },
      );

      await router.dispatch(new MockContext(methodName, "/foo/bar"));
      assertEquals(callStack, [1, 2, 3]);

      callStack = [];

      await router.dispatch(new MockContext(methodName, "/foo/baz"));
      assertEquals(callStack, [1, 3]);
    },
  });
}

for (const methodName of methodNames) {
  Deno.test({
    name: `router - match params - ${methodName}`,
    async fn() {
      let callStack: Array<unknown> = [];
      const router1 = new Router();
      const router2 = new Router();
      const method1 = router1[methodName] as Function;
      const method2 = router2[methodName] as Function;

      method1.call(router1, "/foo/:bar", router2.routes());

      method2.call(router2, "/:baz", (ctx: Context, next: Next) => {
        callStack.push(ctx.params);
        return next();
      });

      await router1.dispatch(new MockContext(methodName, "/foo/123/beep"));
      assertEquals(callStack, [{ bar: "123", baz: "beep" }]);
    },
  });
}

Deno.test({
  name: `router - next called multiple times`,
  async fn() {
    let callStack: Array<unknown> = [];
    const router = new Router();
    router.get("/foo", async (ctx: Context, next: Next) => {
      await next();
      await next();
    });

    assertThrowsAsync(
      () => router.dispatch(new MockContext("GET", "/foo")),
      Error,
      "next() called multiple times",
    );
  },
});
