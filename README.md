<h1 align="center">Deploy Route</h1>

<p align="center" class="badges-container">
  <a href="https://github.com/c4spar/deno-deploy-route/releases">
    <img alt="Version" src="https://img.shields.io/github/v/release/c4spar/deno-deploy-route?logo=github&color=blue" />
  </a>
  <a href="https://github.com/c4spar/deno-deploy-route/actions/workflows/test.yml">
    <img alt="Build status" src="https://github.com/c4spar/deno-deploy-route/workflows/Test/badge.svg?branch=main" />
  </a>
  <a href="https://codecov.io/gh/c4spar/deno-deploy-route">
    <img src="https://codecov.io/gh/c4spar/deno-deploy-route/branch/main/graph/badge.svg"/>
  </a>
  <a href="https://github.com/c4spar/deno-deploy-route/issues">
    <img alt="issues" src="https://img.shields.io/github/issues/c4spar/deno-deploy-route?label=issues&logo=github">
  </a>
  <a href="https://deno.land/">
    <img alt="Deno version" src="https://img.shields.io/badge/deno-^1.6.0-blue?logo=deno" />
  </a>
  <a href="./LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/c4spar/deno-deploy-route?logo=github" />
  </a>
  <br>
  <a href="https://deno.land/x/deploy_route">
    <img alt="deno.land" src="https://img.shields.io/badge/Published on deno.land-blue?logo=deno&logoColor=959DA6&color=272727" />
  </a>
  <a href="https://nest.land/package/deploy_route">
    <img alt="nest.land" src="https://nest.land/badge.svg">
  </a>
</p>

<p align="center">
  <b>Experimental routing module for deno deploy 🦕</br>
</p>

> ⚠️ Work In Progress! Expect breaking changes!

## Usage

```typescript
import { Context, Router } from "https://deno.land/x/deploy_route/mod.ts";

const router = new Router()
  .use(async (event, next) => {
    const time = Date.now();
    await next();
    console.log(
      "[%s] %s %o +%sms",
      event.request.method,
      event.request.url,
      event.params,
      Date.now() - time,
    );
  })
  .get<{ foo: string }>("/hello/world/:foo", async (event) => {
    await event.respondWith(
      new Response(`Hello ${event.params.foo}!\n`, {
        headers: { "content-type": "text/plain" },
      }),
    );
  })
  .get("(.*)", async (event) => {
    await event.respondWith(
      new Response("Not found!\n", {
        headers: { "content-type": "text/plain" },
        status: 404,
      }),
    );
  });

addEventListener("fetch", async (event) => {
  await router.dispatch(new Context(event));
});
```

## Nested Routers

```typescript
const router1 = new Router();
const router2 = new Router();

router1.use("/foo/:bar", router2.routes());

router2.get<{ bar: string; baz: string }>("/:baz", async (event) => {
  await event.respondWith(
    new Response(`bar: ${event.params.bar}, baz: ${event.params.baz}\n`, {
      headers: { "content-type": "text/plain" },
    }),
  );
});

addEventListener("fetch", async (event) => {
  await router.dispatch(new Context(event));
});
```
