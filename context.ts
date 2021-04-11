export type RouteParams = Record<string | number, string | undefined>;

export class Context {
  readonly request: Request;
  readonly params: RouteParams = {};
  #event: FetchEvent;

  constructor(event: FetchEvent) {
    this.#event = event;
    this.request = event.request;
  }

  respondWith(
    ...args: Parameters<FetchEvent["respondWith"]>
  ): ReturnType<FetchEvent["respondWith"]> {
    return this.#event.respondWith(...args);
  }
}
