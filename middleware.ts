export interface ServerRequest {
  method: string;
  url: string;
}

export type Next = () => Promise<void> | void;

export type Middleware<T> = (ctx: T, next: Next) => Promise<void>;

export interface MountMiddleware<T> extends Middleware<T> {
  (ctx: T, next: Next, request: ServerRequest, prefix?: string): Promise<void>;
  mountable: true;
}

export function isMiddleware<T>(
  fn: Middleware<T>,
): fn is Middleware<T> {
  return typeof fn === "function";
}

export function isMountMiddleware<T>(
  fn: any,
): fn is MountMiddleware<T> {
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
