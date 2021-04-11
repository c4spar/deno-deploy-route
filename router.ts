import { HTTPMethod, Layer } from "./layer.ts";
import {
  compose,
  isMountMiddleware,
  Middleware,
  MountMiddleware,
  Next,
} from "./middleware.ts";
import { Context } from "./context.ts";

export interface MiddlewareOptions {
  /** An unique identifier for created the layer */
  // name?: string;
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
  use(
    pathOrMiddleware:
      | string
      | Array<string>
      | Middleware
      | MountMiddleware,
    ...middleware: Array<Middleware | MountMiddleware>
  ): this {
    let path: string | Array<string> | undefined;
    if (
      typeof pathOrMiddleware === "string" || Array.isArray(pathOrMiddleware)
    ) {
      path = pathOrMiddleware;
    } else {
      middleware.unshift(pathOrMiddleware);
    }
    return this.register([], path ?? "(.*)", middleware, {
      end: false,
    });
  }

  get(
    path: string | Array<string>,
    ...middleware: Array<Middleware | MountMiddleware>
  ): Router {
    return this.register(["GET"], path, middleware);
  }

  /** Add a listener for a given event and methods. */
  register(
    methods: Array<HTTPMethod>,
    path: string | Array<string>,
    middlewares: Array<Middleware | MountMiddleware>,
    options?: MiddlewareOptions,
  ): this {
    if (Array.isArray(path)) {
      for (const p of path) {
        this.register(methods, p, middlewares, options);
      }
      return this;
    }

    let layerMiddlewares: Array<Middleware | MountMiddleware> = [];
    for (const middleware of middlewares) {
      if (!isMountMiddleware(middleware)) {
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
    methods: Array<HTTPMethod>,
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

  /** Creates a mount handler. */
  routes(): MountMiddleware {
    const fn: MountMiddleware = (ctx: Context, next: Next, prefix?: string) =>
      this.dispatch(ctx, next, prefix);
    fn.mountable = true;
    return fn;
  }

  async dispatch(
    ctx: Context,
    last?: Next,
    prefix?: string,
  ): Promise<void> {
    const next = (layer: Layer, next: Next) =>
      layer.dispatch(ctx, next, prefix);
    await compose(this.#stack, next, last);
  }
}
