import { Key, pathToRegexp } from "./deps.ts";
import {
  compose,
  isMountMiddleware,
  Middleware,
  MountMiddleware,
  Next,
} from "./middleware.ts";
import { Context, RouteParams, State } from "./context.ts";

export type HTTPMethod =
  | "HEAD"
  | "OPTIONS"
  | "GET"
  | "PUT"
  | "PATCH"
  | "POST"
  | "DELETE";

export interface LayerOptions {
  delimiter?: string;
  prefix?: string;
  end?: boolean;
  // name?: string;
}

export interface MatchResult {
  matched: boolean;
  params: RouteParams;
}

export class Layer<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
> {
  // readonly name?: string;
  private readonly delimiter: string;
  private readonly prefix: string;
  private readonly end: boolean;
  private readonly stack: Array<Middleware<P, S> | MountMiddleware<P, S>>;
  private readonly cache: { [s: string]: MatchResult } = {};

  constructor(
    public readonly path: string,
    public readonly methods: ReadonlyArray<HTTPMethod> = [],
    middlewares: Array<Middleware<P, S> | MountMiddleware<P, S>>,
    { delimiter = "/", prefix, end }: LayerOptions,
  ) {
    this.end = end === false ? end : true;
    // this.name = name;
    this.delimiter = delimiter;
    this.stack = middlewares;
    this.prefix = prefix ? prefix + this.path : this.path;
  }

  match(
    method?: HTTPMethod,
    path?: string,
    // name?: string,
    prefix?: string,
  ): MatchResult {
    if (
      // (name && name !== this.name) ||
      (method && this.methods.length &&
        !this.methods.some((m: HTTPMethod) => m === method))
    ) {
      return { matched: false, params: {} };
    }

    prefix = prefix ?? "";
    path = path ?? "";

    // const key = `${name}|${prefix}|${path}`;
    const key = `${prefix}|${this.prefix}|${path}`;

    if (this.cache[key]) {
      return this.cache[key];
    }

    const keys: Array<Key> = [];
    const params: RouteParams = {};
    const regex = pathToRegexp(`${prefix}${this.prefix}`, keys, {
      sensitive: false,
      strict: false,
      start: true,
      end: this.end,
      delimiter: this.delimiter,
    });

    const [matched, ...matches] = regex.exec(path) ?? [];
    if (matched) {
      for (let i = 0; i < keys.length; i++) {
        params[keys[i].name] = decodeComponent(matches[i]);
      }
    }

    this.cache[key] = { matched: !!matched, params };

    return this.cache[key];
  }

  async dispatch(
    ctx: Context<P, S>,
    last?: Next,
    prefix?: string,
  ): Promise<void> {
    const request: Request = ctx.request;
    const { matched, params } = this.match(
      request.method as HTTPMethod,
      new URL(request.url, import.meta.url).pathname,
      // ctx.name,
      prefix,
    );

    if (!matched) {
      return last?.();
    }

    Object.assign(ctx.params, params);

    const next = (
      middleware: Middleware<P, S> | MountMiddleware<P, S>,
      next: Next,
    ) => {
      if (isMountMiddleware<P, S>(middleware)) {
        prefix = `${prefix ?? ""}${this.prefix}`;
        return middleware(ctx, next, prefix);
      }
      return middleware(ctx, next);
    };

    await compose(this.stack, next, last);
  }
}

function decodeComponent(text: string) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
