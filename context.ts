export type RouteParams = Record<string | number, string | undefined>;

// deno-lint-ignore no-explicit-any
export type State = Record<string | number | symbol, any>;

export interface FetchEvent {
  request: Request;
  respondWith(response: Response | Promise<Response>): Promise<Response>;
}

export class Context<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
> {
  readonly request: Request;
  readonly params: P = {} as P;
  readonly state: S = {} as S;
  #event: FetchEvent;

  constructor(event: FetchEvent) {
    this.#event = event;
    this.request = event.request;
  }

  respondWith(response: Response | Promise<Response>): Promise<Response> {
    return this.#event.respondWith(response);
  }
}
