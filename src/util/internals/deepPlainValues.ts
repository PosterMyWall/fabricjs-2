// *PMW* Helpers for nested plain (JSON-like) values inside text style
// declarations, e.g. the opaque `pmwRunStyles` passenger. Declarations are
// otherwise flat, so fabric's own copies and comparisons are shallow; nested
// values need a deep clone (to avoid sharing one object across characters)
// and a deep compare (so range grouping never merges distinct values).

export const cloneDeepPlainValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(cloneDeepPlainValue) as T;
  }
  if (value && typeof value === 'object') {
    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      cloned[key] = cloneDeepPlainValue(
        (value as Record<string, unknown>)[key],
      );
    }
    return cloned as T;
  }
  return value;
};

export const deepPlainValuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => deepPlainValuesEqual(item, b[index]))
    );
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) =>
        deepPlainValuesEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
      )
    );
  }
  return false;
};
