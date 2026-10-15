import { derivePalette, isHexColor, normalizeHex, type Palette } from './theme'

/**
 * Builds the CSS custom properties the root layout inlines into
 * <html style="…">.
 *
 * isSafeCssBlock is the gate. Everything that reaches this string has already
 * been through isHexColor, but the value is interpolated into a style
 * attribute, so the block is re-validated as a whole before it is returned.
 * A caller that bypasses derivePalette gets null, not a partially valid
 * string.
 */
export function brandCssBlock(primary: string | null, accent: string | null): string | null {
  const safePrimary = isHexColor(primary) ? normalizeHex(primary) : null
  const safeAccent = isHexColor(accent) ? normalizeHex(accent) : null

  if (!safePrimary && !safeAccent) return null

  const declarations: string[] = []

  // Each colour contributes independently: an administrator who has set an
  // accent but not yet a primary still gets that accent applied. Returning
  // null whenever the primary was missing threw the accent away too.
  if (safePrimary) {
    const palette: Palette = derivePalette(safePrimary)
    declarations.push(`--color-primary:${palette.primary}`)
    declarations.push(`--color-primary-hover:${palette.primaryHover}`)
    declarations.push(`--color-primary-soft:${palette.primarySoft}`)
    declarations.push(`--color-on-primary:${palette.onPrimary}`)
  }

  if (safeAccent) {
    declarations.push(`--color-accent:${safeAccent}`)
  }

  const block = declarations.join(';')
  return isSafeCssBlock(block) ? block : null
}

/**
 * Converts a validated block into the object React expects for a `style`
 * prop.
 *
 * React's style prop takes a mapping, not a declaration string, so passing
 * the raw block straight through throws at render. The split is deliberate:
 * isSafeCssBlock validates the text once, here, and this function only
 * parses a string that has already passed — so a new declaration shape
 * still has to clear the same gate.
 */
export function cssBlockToStyle(block: string | null): Record<string, string> {
  if (!block || !isSafeCssBlock(block)) return {}

  const style: Record<string, string> = {}
  for (const declaration of block.split(';')) {
    const separator = declaration.indexOf(':')
    if (separator === -1) continue
    const property = declaration.slice(0, separator).trim()
    const value = declaration.slice(separator + 1).trim()
    // Custom properties are the only members; isSafeCssBlock has already
    // established that each name matches --[a-z0-9-]+ and the value is hex.
    style[property] = value
  }
  return style
}

/**
 * Rejects anything that is not a sequence of `--name:VALUE` pairs where
 * VALUE is a colour literal. The test asserts this returns false for
 * 'javascript:alert(1)' and for a declaration that tries to close the
 * attribute.
 */
export function isSafeCssBlock(block: string | null | undefined): block is string {
  if (!block) return false
  if (block.length === 0) return false

  // No quotes, no angle brackets, no semicolons beyond the separators, and
  // nothing that could terminate a style attribute.
  if (/["'<>\\]/.test(block)) return false
  if (/javascript:|url\(|expression\(|@import/i.test(block)) return false

  const declarations = block.split(';').filter((part) => part.trim().length > 0)
  if (declarations.length === 0) return false

  for (const declaration of declarations) {
    const match = /^--[a-z0-9-]+:#[0-9A-F]{6}$/i.exec(declaration.trim())
    if (!match) return false
  }

  return true
}
