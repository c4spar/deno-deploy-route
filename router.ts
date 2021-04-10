import { HTTPMethod, Layer } from "./layer.ts";
import {
  compose,
  isMountMiddleware,
  Middleware,
  MountMiddleware,
  Next,
  ServerRequest,
} from "./middleware.ts";

export interface MiddlewareOptions {
  /** An unique identifier for created the layer */
  // name?: string;
  end?: boolean;
}

export interface RouterOptions {
  prefix?: string;
  delimiter?: string;
}

export class Router<T> {
  #options: RouterOptions;
  #stack: Array<Layer<T>> = [];

  constructor(options: RouterOptions = {}) {
    this.#options = options;
  }

  /** Add a listener for a given event on all methods. */
  public use(
    pathOrMiddleware:
      | string
      | Array<string>
      | Middleware<T>
      | MountMiddleware<T>,
    ...middleware: Array<Middleware<T> | MountMiddleware<T>>
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

  public get(
    path: string | Array<string>,
    ...middleware: Array<Middleware<T> | MountMiddleware<T>>
  ): Router<T> {
    return this.register(["GET"], path, middleware);
  }

  /** Add a listener for a given event and methods. */
  public register(
    methods: Array<HTTPMethod>,
    path: string | Array<string>,
    middlewares: Array<Middleware<T> | MountMiddleware<T>>,
    options?: MiddlewareOptions,
  ): this {
    if (Array.isArray(path)) {
      for (const p of path) {
        this.register(methods, p, middlewares, options);
      }
      return this;
    }

    let layerMiddlewares: Array<Middleware<T> | MountMiddleware<T>> = [];
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
    middlewares: Array<Middleware<T> | MountMiddleware<T>>,
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
  public routes(): MountMiddleware<T> {
    const fn: MountMiddleware<T> =
      (async (ctx: T, next: Next, request: ServerRequest, prefix?: string) => {
        await this.dispatch(request, ctx, next, prefix);
      }) as MountMiddleware<T>;
    fn.mountable = true;
    return fn;
  }

  public async dispatch(
    request: ServerRequest,
    ctx: T,
    last?: Next,
    prefix?: string,
  ): Promise<void> {
    const next = (layer: Layer<T>, next: Next) =>
      layer.dispatch(request, ctx, next, prefix);
    await compose(this.#stack, next, last);
  }
}
