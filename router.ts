import { Context, EventType, Method } from "./context.ts";
import { Layer } from "./layer.ts";
import {
  compose,
  isMountHandler,
  Middleware,
  MountMiddleware,
  Next,
} from "./middleware.ts";

export interface MiddlewareOptions {
  /** An unique identifier for created the layer */
  name?: string;
  end?: boolean;
}

export interface RouterOptions {
  prefix?: string;
  delimiter?: string;
}

export class Router {
  #options: RouterOptions;
  #stack: Array<Layer> = [];

  constructor(options: RouterOptions = {}) {
    this.#options = options;
  }

  /** Add a listener for a given event on all methods. */
  public use(
    pathOrMiddleware: string | Array<string> | Middleware | MountMiddleware,
    ...middleware: Array<Middleware | MountMiddleware>
  ): this {
    let path: string | string[] | undefined;
    if (typeof pathOrMiddleware === "function") {
      middleware.unshift(pathOrMiddleware);
    } else {
      path = pathOrMiddleware;
    }
    return this.register(path ?? "(.*)", middleware, [], {
      end: false,
    });
  }

  public get(
    path: string | string[],
    ...middleware: Array<Middleware | MountMiddleware>
  ): this {
    return this.register(path, middleware, ["GET"]);
  }

  /** Add a listener for a given event and methods. */
  public register(
    path: string | Array<string>,
    middlewares: Array<Middleware | MountMiddleware>,
    methods: Method[],
    options?: MiddlewareOptions,
  ): this {
    if (Array.isArray(path)) {
      for (const p of path) {
        this.register(p, middlewares, methods, options);
      }
      return this;
    }

    let layerMiddlewares: Array<Middleware | MountMiddleware> = [];
    for (const middleware of middlewares) {
      if (!isMountHandler(middleware)) {
        layerMiddlewares.push(middleware);
        continue;
      }
      if (layerMiddlewares.length) {
        this.#addLayer(path, layerMiddlewares, methods, options);
        layerMiddlewares = [];
      }
      this.#addLayer(path, [middleware], methods, {
        ...options,
        end: false,
      });
    }
    if (layerMiddlewares.length) {
      this.#addLayer(path, layerMiddlewares, methods, options);
    }

    return this;
  }

  #addLayer = (
    path: string,
    middlewares: Array<Middleware | MountMiddleware>,
    methods: Array<Method>,
    options: MiddlewareOptions = {},
  ) => {
    const route = new Layer(
      path,
      methods,
      middlewares,
      {
        delimiter: this.#options.delimiter,
        prefix: this.#options.prefix,
        ...options,
      },
    );

    this.#stack.push(route);
  };

  public async emit(
    methods: Method[],
    ctx: EventType,
    name?: string,
  ): Promise<void> {
    await this.dispatch(this.createContext(methods, ctx, name));
  }

  public async dispatch(
    ctx: Context,
    last?: Next,
    prefix?: string,
  ): Promise<void> {
    const next = (layer: Layer, next: Next) =>
      layer.dispatch(ctx, next, prefix);
    await compose(this.#stack, next, last);
  }

  /** Creates a mount handler. */
  public routes(): MountMiddleware {
    const fn: MountMiddleware = (ctx: Context, next: Next, prefix?: string) =>
      this.dispatch(ctx, next, prefix);
    fn.mountable = true;
    return fn;
  }

  public createContext<O extends Record<string, unknown>>(
    methods?: Method[],
    type?: EventType,
    name?: string,
    ctx?: O,
  ): Context | Context & O {
    return Object.assign(
      new Context(methods, type, name),
      ctx || {},
    ) as Context | Context & O;
  }
}
