// Removes nulls from partials
// Ex. string | null -> string | undefined
export type OptionalPartial<T> = {
  [K in keyof T]?: Exclude<T[K], null> | undefined;
};

export type PickStringLiteral<A, B extends A> = B;
