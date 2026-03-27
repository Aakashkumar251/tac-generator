import { describe, it, expect } from 'vitest';
import { samples } from '@ctac/core-compiler';
import { compile } from '@ctac/core-compiler';

describe('All samples compile without errors', () => {
  for (const sample of samples) {
    it(`${sample.category} / ${sample.name}`, () => {
      const result = compile(sample.code);
      const fatalErrors = result.errors.filter(e => e.severity === 'error');
      if (fatalErrors.length > 0) {
        console.log(`Errors in "${sample.name}":`, fatalErrors.map(e => `L${e.line}: ${e.message}`));
      }
      expect(fatalErrors).toHaveLength(0);
      expect(result.tac.length).toBeGreaterThan(0);
    });
  }
});
