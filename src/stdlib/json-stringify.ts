/** Return the JSON stringification of a simple primitive value. */
export const JSONStringify: (value: boolean | null | number | string) => string = JSON.stringify;
