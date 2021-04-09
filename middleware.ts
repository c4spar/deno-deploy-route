import { Context } from "./context.ts";

export type Next = () => Promise<void>;

export interface Middleware {
  (event: Context, next: Next): any;
}

export interface MountMiddleware {
  mountable?: boolean;

  (event: Context, next: Next, prefix?: string): any;
}

export function isMountHandler(fn: MountMiddleware): fn is MountMiddleware {
  return typeof fn === "function" && fn.mountable === true;
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
  let nextIndex: number = -1;

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
