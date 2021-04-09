import { pathToRegexp } from "./deps.ts";
import { Context, EventType, Method } from "./context.ts";
import {
  compose,
  isMountHandler,
  Middleware,
  MountMiddleware,
  Next,
} from "./middleware.ts";

export interface LayerOptions {
  delimiter?: string;
  prefix?: string;
  end?: boolean;
  name?: string;
}

export class Layer {
  readonly name?: string;
  private readonly delimiter: string;
  private readonly prefix: string;
  private readonly end: boolean;
  private readonly stack: Array<Middleware | MountMiddleware>;
  protected cache: { [s: string]: boolean } = {};

  public constructor(
    public path: EventType,
    public methods: Method[] = [],
    middlewares: Array<Middleware | MountMiddleware>,
    { name, delimiter = "/", prefix, end }: LayerOptions,
  ) {
    this.end = end === false ? end : true;
    this.name = name;
    this.delimiter = delimiter;
    this.stack = middlewares;
    this.prefix = prefix ? prefix + this.path : this.path;
  }

  public match(
    methods?: Array<Method>,
    path?: EventType,
    name?: string,
    prefix?: EventType,
    cache: boolean = true,
  ): boolean {
    if (
      name && name !== this.name ||
      (methods?.length && this.methods.length &&
        !this.methods.some((method: Method) => methods.includes(method)))
    ) {
      return false;
    }

    if (this.prefix === "(.*)") {
      return true;
    }

    const key = `${name}|${methods}|${prefix}|${path}`;
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
    ctx: Context,
    last?: Next,
    prefix?: string,
  ): Promise<void> {
    const matched: boolean = this.match(
      ctx.methods,
      ctx.path,
      ctx.name,
      prefix,
    );

    if (!matched) {
      return last?.();
    }

    const next = async (
      middleware: Middleware | MountMiddleware,
      next: Next,
    ) => {
      if (isMountHandler(middleware)) {
        prefix = `${prefix ?? ""}${this.prefix}`;
        this.log(ctx.methods, ctx.path, prefix, middleware.name);
        return middleware(ctx, next, prefix);
      }
      this.log(ctx.methods, ctx.path, this.prefix);
      return middleware(ctx, next);
    };

    await compose(this.stack, next, last);
  }

  public log(
    methods?: string[],
    path?: string,
    prefix?: string,
    name?: string,
  ) {
    console.log(
      "[%s:%s] %s (%s)",
      methods?.length ? methods.join(",") : "ALL",
      path || "/",
      prefix || this.prefix,
      name || this.name || "unknown",
    );
  }
}
