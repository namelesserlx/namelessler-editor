export function deepMerge<T>(baseValue?: T, overrideValue?: T): T | undefined {
    if (overrideValue === undefined) return baseValue;
    if (baseValue === undefined) return overrideValue;
    if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) return overrideValue;

    const merged: Record<string, unknown> = { ...baseValue };

    for (const [key, value] of Object.entries(overrideValue)) {
        if (value === undefined) continue;

        const currentValue = merged[key];
        if (isPlainObject(currentValue) && isPlainObject(value)) {
            merged[key] = deepMerge(currentValue, value);
            continue;
        }

        merged[key] = value;
    }

    return merged as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
