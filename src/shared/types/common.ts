/**
 * Common type definitions shared across the application
 * Following functional programming principles with immutable data structures
 */

/**
 * Result type for error handling without exceptions
 * Inspired by Rust's Result<T, E> and Haskell's Either
 */
export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

/**
 * Constructor functions for Result type
 */
export const Ok = <T>(value: T): Result<T, never> => ({
	ok: true,
	value,
});

export const Err = <E = Error>(error: E): Result<never, E> => ({
	ok: false,
	error,
});

/**
 * Option type for nullable values
 * Inspired by Rust's Option<T> and Haskell's Maybe
 */
export type Option<T> = { some: true; value: T } | { some: false };

/**
 * Constructor functions for Option type
 */
export const Some = <T>(value: T): Option<T> => ({
	some: true,
	value,
});

export const None = <T>(): Option<T> => ({
	some: false,
});

/**
 * Utility type for making all properties DeepReadonly
 */
export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
