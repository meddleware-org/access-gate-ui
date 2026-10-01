// Input checks for values written on-chain into every NFT a gate mints.

/** Longest image URL accepted (a data: URI of a small icon fits; anything larger belongs on Walrus). */
export const MAX_IMAGE_URL_LENGTH = 2048

/**
 * Why `url` cannot be a gate's NFT image, or `null` when it can. Accepted: empty (no image), an
 * `https:` URL, or a `data:image/…` URI. Rejected: `http:`, `javascript:` and every other scheme,
 * and anything over {@link MAX_IMAGE_URL_LENGTH} characters.
 */
export function imageUrlError(url: string): string | null {
  const value = url.trim()
  if (value === '') return null
  if (value.length > MAX_IMAGE_URL_LENGTH) return `The image URL is longer than ${MAX_IMAGE_URL_LENGTH} characters.`
  if (/^data:image\/[a-z0-9.+-]+[;,]/i.test(value)) return null
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'The image URL is not a valid URL.'
  }
  return parsed.protocol === 'https:' ? null : 'The image URL must use https (or be a data:image URI).'
}
