import { Context } from "./context.ts";

export type Next = () => Promise<void> | void;

export type Middleware = (ctx: Context, next: Next) => Promise<void>;

export interface MountMiddleware extends Middleware {
  (ctx: Context, next: Next, prefix?: string): Promise<void>;
  mountable: true;
}

export function isMiddleware(
  fn: Middleware,
): fn is Middleware {
  return typeof fn === "function";
}

export function isMountMiddleware(
  fn: Middleware | MountMiddleware,
): fn is MountMiddleware {
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
