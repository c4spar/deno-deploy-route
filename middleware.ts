import { Context, RouteParams, State } from "./context.ts";

export type Next = () => Promise<void> | void;

export type Middleware<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
> = (ctx: Context<P, S>, next: Next) => Promise<void>;

export interface MountMiddleware<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
> extends Middleware {
  (ctx: Context<P, S>, next: Next, prefix?: string): Promise<void>;
  mountable: true;
}

export function isMountMiddleware<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
>(
  fn: Middleware<P, S> | MountMiddleware<P, S>,
): fn is MountMiddleware<P, S> {
  const mw = fn as MountMiddleware;
  return typeof mw === "function" && mw.mountable === true;
}

export async function compose<T>(
  stack: ReadonlyArray<T>,
  next: (value: T, next: Next) => Promise<void>,
  last?: Next,
): Promise<void> {
  if (!stack.length) {
    await last?.();
    return;
  }

  stack = stack.slice();
  let nextIndex = -1;

  const dispatch = async (index: number): Promise<void> => {
    if (nextIndex >= index) {
      throw new Error("next() called multiple times");
    }
    nextIndex = index;

    if (!stack[index]) {
      await last?.();
      return;
    }

    await next(stack[index], () => dispatch(index + 1));
  };

  await dispatch(0);
}
