const { registerSchema, PARISHES } = require('../validation');

describe('Registration Validation', () => {
  const validUser = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    parish: 'St. Andrew',
    phone: '876-555-0123',
    address: '123 Test Lane',
    smsAlerts: true
  };

  test('validates a correct user object', () => {
    const result = registerSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parish).toBe('ST_ANDREW'); // Check transformation
      expect(result.data.email).toBe('test@example.com');
    }
  });

  test('validates various parish formats', () => {
    const parishes = [
      ['Kingston', 'KINGSTON'],
      ['st andrew', 'ST_ANDREW'],
      ['St. Mary', 'ST_MARY'],
      ['WESTMORELAND', 'WESTMORELAND'],
      ['St. Ann', 'ST_ANN']
    ];

    parishes.forEach(([input, expected]) => {
      const result = registerSchema.safeParse({ ...validUser, parish: input });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parish).toBe(expected);
      }
    });
  });

  test('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validUser, email: 'invalid-email' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.email).toBeDefined();
  });

  test('rejects short password', () => {
    const result = registerSchema.safeParse({ ...validUser, password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.password).toBeDefined();
  });

  test('rejects invalid parish', () => {
    const result = registerSchema.safeParse({ ...validUser, parish: 'Invalid Parish' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.parish).toBeDefined();
  });

  test('rejects missing required fields', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    const errors = result.error.flatten().fieldErrors;
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.parish).toBeDefined();
  });

  test('allows optional fields to be missing', () => {
    const minimalUser = {
      email: 'min@example.com',
      password: 'password123',
      firstName: 'Min',
      lastName: 'User',
      parish: 'Kingston'
    };
    const result = registerSchema.safeParse(minimalUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailAlerts).toBe(true); // Default
      expect(result.data.smsAlerts).toBe(false); // Default
    }
  });
});
