import { pathToRegexp } from "./deps.ts";
import {
  compose,
  isMountMiddleware,
  Middleware,
  MountMiddleware,
  Next,
  ServerRequest,
} from "./middleware.ts";

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

export class Layer<T> {
  // readonly name?: string;
  private readonly delimiter: string;
  private readonly prefix: string;
  private readonly end: boolean;
  private readonly stack: Array<Middleware<T> | MountMiddleware<T>>;
  protected cache: { [s: string]: boolean } = {};

  public constructor(
    public path: string,
    public methods: Array<HTTPMethod> = [],
    middlewares: Array<Middleware<T> | MountMiddleware<T>>,
    { delimiter = "/", prefix, end }: LayerOptions,
  ) {
    this.end = end === false ? end : true;
    // this.name = name;
    this.delimiter = delimiter;
    this.stack = middlewares;
    this.prefix = prefix ? prefix + this.path : this.path;
  }

  public match(
    method?: HTTPMethod,
    path?: string,
    // name?: string,
    prefix?: string,
    cache: boolean = true,
  ): boolean {
    if (
      // (name && name !== this.name) ||
      (method && !this.methods.some((m: HTTPMethod) => m === method))
    ) {
      return false;
    }

    if (this.prefix === "(.*)") {
      return true;
    }

    // const key = `${name}|${method}|${prefix}|${path}`;
    const key = `${method}|${prefix}|${path}`;
    let matched = this.cache[key];

    if (typeof matched === "undefined") {
      matched = (!prefix && !path) ||
        this.createRegExp(prefix).test(path || "");

      if (cache) {
        this.cache[key] = matched;
      }
    }

    return matched;
  }

  public createRegExp(prefix?: string) {
    return pathToRegexp(`${prefix ?? ""}${this.prefix}`, [], {
      sensitive: false,
      strict: false,
      start: true,
      end: this.end,
      delimiter: this.delimiter,
    });
  }

  public async dispatch(
    request: ServerRequest,
    ctx: T,
    last?: Next,
    prefix?: string,
  ): Promise<void> {
    const matched: boolean = this.match(
      request.method as HTTPMethod,
      new URL(request.url, import.meta.url).pathname,
      // ctx.name,
      prefix,
    );

    if (!matched) {
      return last?.();
    }

    const next = (
      middleware: Middleware<T> | MountMiddleware<T>,
      next: Next,
    ) => {
      if (isMountMiddleware<T>(middleware)) {
        prefix = `${prefix ?? ""}${this.prefix}`;
        this.log(request, ctx, prefix, middleware.name);
        return middleware(ctx, next, request, prefix);
      }
      this.log(request, ctx, this.prefix);
      return middleware(ctx, next);
    };

    await compose(this.stack, next, last);
  }

  public log(
    request: ServerRequest,
    ctx: T,
    prefix?: string,
    name?: string,
  ) {
    console.log(
      "[%s:%s] %s (%s)",
      request.method ?? "ALL",
      request.url ?? "/",
      prefix ?? this.prefix,
      name ?? "unknown",
      // name ?? this.name ?? "unknown",
    );
  }
}
