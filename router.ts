import { HTTPMethod, Layer } from "./layer.ts";
import {
  compose,
  isMountMiddleware,
  Middleware,
  MountMiddleware,
  Next,
} from "./middleware.ts";
import { Context, RouteParams, State } from "./context.ts";

export interface MiddlewareOptions {
  /** An unique identifier for created the layer */
  name?: string;
  end?: boolean;
}

export interface RouterOptions {
  prefix?: string;
  delimiter?: string;
}

export class Router<
  RP extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  RS extends State = Record<string, any>,
> {
  #options: RouterOptions;
  #stack: Array<Layer> = [];

  constructor(options: RouterOptions = {}) {
    this.#options = options;
  }

  /** Register middleware to be used on every matched route. */
  use<P extends RouteParams = RP, S extends State = RS>(
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware to be used on every route that matches the supplied
   * `path`. */
  use<P extends RouteParams = RP, S extends State = RS>(
    path: string | string[],
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  use<P extends RouteParams = RP, S extends State = RS>(
    pathOrMiddleware:
      | string
      | string[]
      | Middleware<P, S>
      | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    let path: string | Array<string> | undefined;
    if (
      typeof pathOrMiddleware === "string" || Array.isArray(pathOrMiddleware)
    ) {
      path = pathOrMiddleware;
    } else {
      middleware.unshift(pathOrMiddleware);
    }
    return this.#register(
      path ?? "(.*)",
      middleware as Array<Middleware | MountMiddleware>,
      [],
      {
        end: false,
      },
    );
  }

  /** Register named middleware for the specified routes when the `DELETE`,
   * `GET`, `POST`, or `PUT` method is requested. */
  all<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `DELETE`,
   * `GET`, `POST`, or `PUT` method is requested. */
  all<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  all<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["DELETE", "GET", "POST", "PUT"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `DELETE`,
   *  method is requested. */
  delete<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `DELETE`,
   * method is requested. */
  delete<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  delete<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["DELETE"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `GET`,
   *  method is requested. */
  get<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `GET`,
   * method is requested. */
  get<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  get<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["GET"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `HEAD`,
   *  method is requested. */
  head<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `HEAD`,
   * method is requested. */
  head<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  head<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["HEAD"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `OPTIONS`,
   * method is requested. */
  options<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `OPTIONS`,
   * method is requested. */
  options<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  options<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["OPTIONS"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `PATCH`,
   * method is requested. */
  patch<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `PATCH`,
   * method is requested. */
  patch<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  patch<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["PATCH"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `POST`,
   * method is requested. */
  post<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `POST`,
   * method is requested. */
  post<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  post<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["POST"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  /** Register named middleware for the specified routes when the `PUT`
   * method is requested. */
  put<P extends RouteParams = RP, S extends State = RS>(
    name: string,
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  /** Register middleware for the specified routes when the `PUT`
   * method is requested. */
  put<P extends RouteParams = RP, S extends State = RS>(
    path: string,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)>;
  put<P extends RouteParams = RP, S extends State = RS>(
    nameOrPath: string,
    pathOrMiddleware: string | Middleware<P, S> | MountMiddleware<P, S>,
    ...middleware: Array<Middleware<P, S> | MountMiddleware<P, S>>
  ): Router<P extends RP ? P : (P & RP), S extends RS ? S : (S & RS)> {
    this.#useVerb(
      nameOrPath,
      pathOrMiddleware as (string | Middleware | MountMiddleware),
      middleware as Array<Middleware | MountMiddleware>,
      ["PUT"],
    );
    // deno-lint-ignore no-explicit-any
    return this as Router<any, any>;
  }

  #useVerb = (
    nameOrPath: string,
    pathOrMiddleware: string | Middleware | MountMiddleware,
    middleware: Array<Middleware | MountMiddleware>,
    methods: HTTPMethod[],
  ): void => {
    let name: string | undefined = undefined;
    let path: string;
    if (typeof pathOrMiddleware === "string") {
      name = nameOrPath;
      path = pathOrMiddleware;
    } else {
      path = nameOrPath;
      middleware.unshift(pathOrMiddleware);
    }

    this.#register(path, middleware, methods, { name });
  };

  /** Add a listener for a given event and methods. */
  #register = (
    path: string | Array<string>,
    middlewares: Array<Middleware | MountMiddleware>,
    methods: Array<HTTPMethod>,
    options?: MiddlewareOptions,
  ): this => {
    if (Array.isArray(path)) {
      for (const p of path) {
        this.#register(p, middlewares, methods, options);
      }
      return this;
    }
    // console.log("register:", path, methods);

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
  };

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
  routes(): MountMiddleware<RP, RS> {
    const fn: MountMiddleware<RP, RS> = (
      ctx: Context,
      next: Next,
      prefix?: string,
    ) => this.dispatch(ctx as Context, next, prefix);
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
