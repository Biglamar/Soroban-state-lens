import { describe, it, expect } from 'vitest';
import { parseCustomSectionName } from '../lib/decoder/sectionValidator';

describe('parseCustomSectionName', () => {
  it('should successfully parse valid UTF-8 section names', () => {
    const validBytes = new TextEncoder().encode('custom_section_valid');
    expect(parseCustomSectionName(validBytes)).toBe('custom_section_valid');
  });

  it('should throw a controlled error on malformed UTF-8 byte sequences', () => {
    // Malformed UTF-8 byte sequence (e.g., an orphaned continuation byte)
    const malformedBytes = new Uint8Array([0x63, 0x75, 0x73, 0x74, 0x6f, 0xff]);
    
    expect(() => parseCustomSectionName(malformedBytes)).toThrowError(
      'ValidationError: Malformed UTF-8 sequence detected in custom section name.'
    );
  });
});
