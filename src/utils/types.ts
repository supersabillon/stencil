/**
 * A 'loose' type useful for wrapping an incomplete / possible malformed
 * object as we workon getting it comply with a particular Interface T.
 *
 * Example:
 * 
 * ```ts
 * interface Foo {
 *   bar: string
 * }
 *
 * function validateFoo(foo: Loose<Foo>): Foo {
 *   let validatedFoo = {
 *     ...foo,
 *     bar: foo.bar || DEFAULT_BAR
 *   }
 *
 *   return validatedFoo
 * }
 * ```
 *
 * Use this when you need to take user input or something from some other part
 * of the world that we don't control and transform it into something
 * conforming to a given interface. For best results, pair with a validation
 * function as shown in the example.
 */
export type Loose<T extends Object> = Record<string, any> & Partial<T>
