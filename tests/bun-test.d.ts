declare module "bun:test" {
  export interface Mock<T extends (...args: never[]) => unknown> {
    (...args: Parameters<T>): ReturnType<T>;
    mockClear(): void;
    mockReset(): void;
    mock: {
      calls: Parameters<T>[];
    };
  }

  interface ExpectMatchers<T> {
    toEqual(expected: T): void;
    toBe(expected: unknown): void;
    toBeString(): void;
    toMatch(expected: RegExp): void;
    not: {
      toHaveBeenCalled(): void;
    };
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(times: number): void;
    toHaveBeenCalledWith(...args: unknown[]): void;
  }

  interface MockFn {
    <T extends (...args: never[]) => unknown>(fn?: T): Mock<T>;
    module(id: string, factory: () => Record<string, unknown>): void;
  }

  export const mock: MockFn;

  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;

  export function expect<T>(actual: T): ExpectMatchers<T>;
}
