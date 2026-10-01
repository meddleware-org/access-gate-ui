import { describe, it, expect } from 'vitest'
import { imageUrlError, MAX_IMAGE_URL_LENGTH } from '../src/validation.js'

describe('imageUrlError', () => {
  it('accepts empty, https and data:image values', () => {
    expect(imageUrlError('')).toBeNull()
    expect(imageUrlError('  ')).toBeNull()
    expect(imageUrlError('https://aggregator.walrus-testnet.walrus.space/v1/blobs/abc')).toBeNull()
    expect(imageUrlError('data:image/png;base64,iVBORw0KGgo=')).toBeNull()
    expect(imageUrlError('data:image/svg+xml,%3Csvg%3E')).toBeNull()
  })

  it('refuses other schemes and malformed values', () => {
    expect(imageUrlError('http://example.com/a.png')).toMatch(/https/)
    expect(imageUrlError('javascript:alert(1)')).toMatch(/https/)
    expect(imageUrlError('data:text/html,<script>x</script>')).toMatch(/https/)
    expect(imageUrlError('not a url')).toMatch(/not a valid URL/)
  })

  it('refuses an overlong value', () => {
    expect(imageUrlError('https://x.example/' + 'a'.repeat(MAX_IMAGE_URL_LENGTH))).toMatch(/longer than/)
  })
})
