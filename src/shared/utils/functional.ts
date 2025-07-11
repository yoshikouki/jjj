/**
 * Functional programming utilities
 * Provides common FP patterns: pipe, compose, curry, etc.
 */

/**
 * Pipe functions from left to right
 * pipe(f, g, h)(x) === h(g(f(x)))
 */
export const pipe =
	<T>(...fns: Array<(arg: T) => T>) =>
	(value: T): T =>
		fns.reduce((acc, fn) => fn(acc), value);

/**
 * Compose functions from right to left
 * compose(f, g, h)(x) === f(g(h(x)))
 */
export const compose =
	<T>(...fns: Array<(arg: T) => T>) =>
	(value: T): T =>
		fns.reduceRight((acc, fn) => fn(acc), value);

/**
 * Identity function
 */
export const identity = <T>(x: T): T => x;

/**
 * Constant function
 */
export const constant =
	<T>(x: T) =>
	(): T =>
		x;

/**
 * Memoize a pure function
 */
export const memoize = <TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => TResult,
	getKey?: (...args: TArgs) => string,
): ((...args: TArgs) => TResult) => {
	const cache = new Map<string, TResult>();

	return (...args: TArgs): TResult => {
		const key = getKey ? getKey(...args) : JSON.stringify(args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	};
};

/**
 * Debounce function calls
 */
export const debounce = <TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	delay: number,
): ((...args: TArgs) => void) => {
	let timeoutId: Timer | undefined;

	return (...args: TArgs): void => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
		}, delay);
	};
};

/**
 * Throttle function calls
 */
export const throttle = <TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	limit: number,
): ((...args: TArgs) => void) => {
	let inThrottle = false;

	return (...args: TArgs): void => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;

			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}
	};
};

/**
 * Partial application
 */
export const partial = <TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => TResult,
	...partialArgs: Partial<TArgs>
) => {
	return (...remainingArgs: TArgs): TResult => {
		const args = [...partialArgs, ...remainingArgs] as TArgs;
		return fn(...args);
	};
};

/**
 * Curry a function
 */
export const curry = <TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => TResult,
	arity = fn.length,
): unknown => {
	return function curried(...args: unknown[]): unknown {
		if (args.length >= arity) {
			return fn(...(args as TArgs));
		}
		return (...nextArgs: unknown[]): unknown => curried(...args, ...nextArgs);
	};
};
