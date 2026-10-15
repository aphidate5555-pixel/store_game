/**
 * JSON-LD serialisation that is safe to inline in a <script> tag (C-42).
 *
 * `JSON.stringify` does not escape `<` or `>`, so a product name containing
 * `</script>` closes the tag before the browser ever reaches the JSON parser.
 * The same applies to the two line separators that are legal in JSON strings
 * but illegal in JavaScript string literals.
 *
 * This is the ONLY place in the project allowed to call
 * dangerouslySetInnerHTML, and the call site carries a scoped
 * `eslint-disable-next-line react/no-danger`.
 */
const BACKSLASH_U = `${String.fromCharCode(92)}u`

const UNSAFE = new Set<string>([
  '<',
  '>',
  '&',
  String.fromCharCode(0x2028), // LINE SEPARATOR
  String.fromCharCode(0x2029), // PARAGRAPH SEPARATOR
])

export function ldJson(value: unknown): string {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) return 'null'

  let out = ''
  for (const char of serialized) {
    if (UNSAFE.has(char)) {
      out += BACKSLASH_U + char.charCodeAt(0).toString(16).padStart(4, '0')
    } else {
      out += char
    }
  }
  return out
}
