const { z } = require('zod');

// Valid parishes matching Prisma Enum
const PARISHES = [
  'KINGSTON',
  'ST_ANDREW',
  'ST_THOMAS',
  'PORTLAND',
  'ST_MARY',
  'ST_ANN',
  'TRELAWNY',
  'ST_JAMES',
  'HANOVER',
  'WESTMORELAND',
  'ST_ELIZABETH',
  'MANCHESTER',
  'CLARENDON',
  'ST_CATHERINE'
];

const registerSchema = z.object({
  email: z.string()
    .email({ message: "Invalid email address" })
    .transform(val => val.toLowerCase().trim()),

  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long" }),
    // Future: Add complexity requirements
    // .regex(/[0-9]/, "Password must contain at least one number")
    // .regex(/[!@#$%^&*]/, "Password must contain at least one special character")

  firstName: z.string()
    .min(2, { message: "First name must be at least 2 characters" })
    .max(100)
    .trim(),

  lastName: z.string()
    .min(2, { message: "Last name must be at least 2 characters" })
    .max(100)
    .trim(),

  parish: z.string()
    .transform(val => {
      // Normalize: "St. Andrew" -> "ST_ANDREW"
      return val.toUpperCase().trim()
        .replace(/\./g, '')  // Remove dots (St. -> St -> ST)
        .replace(/\s+/g, '_'); // Replace spaces with underscores
    })
    .refine(val => PARISHES.includes(val), {
      message: "Invalid parish. Must be one of Jamaica's 14 parishes."
    }),

  phone: z.string()
    .optional()
    .nullable()
    // Basic loose phone validation (allows +1-876-..., 876..., etc)
    .refine(val => !val || /^[\d+\-\s()]{7,20}$/.test(val), {
      message: "Invalid phone number format"
    }),

  address: z.string()
    .max(500, "Address is too long")
    .optional()
    .nullable(),

  smsAlerts: z.boolean().optional().default(false),
  emailAlerts: z.boolean().optional().default(true),
  emergencyOnly: z.boolean().optional().default(false)
});

// Login schema for future use or current endpoint
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

module.exports = {
  registerSchema,
  loginSchema,
  PARISHES
};
