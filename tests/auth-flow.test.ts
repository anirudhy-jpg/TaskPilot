import { describe, it, expect, vi } from 'vitest';
import { forgotPasswordSchema, resetPasswordSchema } from '@/features/auth/schemas/auth.schema';

describe('Auth Validation Schemas', () => {
  describe('forgotPasswordSchema', () => {
    it('should validate a correct email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
      expect(result.success).toBe(true);
    });

    it('should fail on invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'invalid-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('should trim email whitespace', () => {
      const result = forgotPasswordSchema.safeParse({ email: '  test@example.com  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate matching passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(result.success).toBe(true);
    });

    it('should fail on passwords less than 6 characters', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'pass',
        confirmPassword: 'pass',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
      }
    });

    it('should fail on mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'Password123!',
        confirmPassword: 'Password124!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
        expect(result.error.issues[0].path[0]).toBe('confirmPassword');
      }
    });
  });
});

describe('Password Flow Logic Simulation', () => {
  it('should handle successful password update flow', async () => {
    // Mock Supabase client
    const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    
    const supabaseClient = {
      auth: {
        updateUser: mockUpdateUser,
        signOut: mockSignOut,
      }
    };

    const payload = { password: 'NewPassword123!' };
    const { error } = await supabaseClient.auth.updateUser(payload);
    
    expect(error).toBeNull();
    expect(mockUpdateUser).toHaveBeenCalledWith(payload);

    // Simulate cleanup
    await supabaseClient.auth.signOut();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should handle password update error flow', async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({ 
      data: null, 
      error: { message: 'Weak password' } 
    });
    
    const supabaseClient = {
      auth: {
        updateUser: mockUpdateUser,
      }
    };

    const payload = { password: 'weak' };
    const { error } = await supabaseClient.auth.updateUser(payload);
    
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Weak password');
    expect(mockUpdateUser).toHaveBeenCalledWith(payload);
  });
});
