import { Router } from "../router.ts";
import { Context } from "../context.ts";

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
  .get("/hello/world/:foo", async (event) => {
    await event.respondWith(
      new Response("Hello World!\n", {
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
