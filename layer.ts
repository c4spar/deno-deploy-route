import { Key, pathToRegexp } from "./deps.ts";
import {
  compose,
  isMountMiddleware,
  Middleware,
  MountMiddleware,
  Next,
} from "./middleware.ts";
import { Context, RouteParams } from "./context.ts";

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

const cache: { [s: string]: MatchResult } = {};

export class Layer {
  // readonly name?: string;
  private readonly delimiter: string;
  private readonly prefix: string;
  private readonly end: boolean;
  private readonly stack: Array<Middleware | MountMiddleware>;

  constructor(
    public readonly path: string,
    public readonly methods: ReadonlyArray<HTTPMethod> = [],
    middlewares: Array<Middleware | MountMiddleware>,
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
      (method && !this.methods.some((m: HTTPMethod) => m === method))
    ) {
      return { matched: false, params: {} };
    }

    prefix = prefix ?? "";
    path = path ?? "";

    // const key = `${name}|${prefix}|${path}`;
    const key = `${prefix}|${this.prefix}|${path}`;

    if (cache[key]) {
      return cache[key];
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
    const matches = path.match(regex)?.slice(1) ?? [];
    for (let i = 0; i < keys.length; i++) {
      params[keys[i].name] = matches[i];
    }

    cache[key] = { matched: matches.length > 0, params };

    return cache[key];
  }

  async dispatch(
    ctx: Context,
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
      middleware: Middleware | MountMiddleware,
      next: Next,
    ) => {
      if (isMountMiddleware(middleware)) {
        prefix = `${prefix ?? ""}${this.prefix}`;
        this.log(ctx, prefix, middleware.name);
        return middleware(ctx, next, prefix);
      }
      this.log(ctx, this.prefix);
      return middleware(ctx, next);
    };

    await compose(this.stack, next, last);
  }

  log(
    ctx: Context,
    prefix?: string,
    name?: string,
  ) {
    console.log(
      "[%s:%s] %s (%s)",
      ctx.request.method ?? "ALL",
      ctx.request.url ?? "/",
      prefix ?? this.prefix,
      name ?? "unknown",
      // name ?? this.name ?? "unknown",
    );
  }
}

function decodeComponent(text: string) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
