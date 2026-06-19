import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn utility function', () => {
  it('should merge standard classes correctly', () => {
    const result = cn('bg-red-500', 'text-white', 'px-4');
    expect(result).toBe('bg-red-500 text-white px-4');
  });

  it('should resolve and override conflicting tailwind classes', () => {
    // tailwind-merge should resolve this so bg-blue-500 wins
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('should correctly handle conditional and falsy classes', () => {
    const isError = true;
    const isDisabled = false;
    const result = cn(
      'text-sm', 
      isError && 'text-red-500', 
      isDisabled && 'opacity-50'
    );
    expect(result).toBe('text-sm text-red-500');
  });
});
