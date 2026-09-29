/**
 * Validates custom section names, rejecting malformed UTF-8 bytes with a controlled error
 * instead of silently replacing invalid sequences.
 */
export function parseCustomSectionName(bytes: Uint8Array): string {
  try {
    // TextDecoder with 'fatal: true' throws on invalid UTF-8 byte sequences
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch (error) {
    throw new Error('ValidationError: Malformed UTF-8 sequence detected in custom section name.');
  }
}
