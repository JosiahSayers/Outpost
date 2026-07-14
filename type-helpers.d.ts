// Same as Partial<T>, but keeps each field's own null-ability intact
// (e.g. `string | null` stays overridable with either a string or null).
export type OptionalPartial<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export type PickStringLiteral<A, B extends A> = B;
