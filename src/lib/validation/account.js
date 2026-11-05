import { z } from "zod";
import { email } from "@/lib/validation/auth";

// The account page's forms, checked on the server. Messages are "Form.errors" keys.

const password = z.string().min(1, "required").max(200, "tooLong");

export const profileSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  // Optional here: it's asked for when someone books
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ]{8,20})?$/, "bookingPhoneInvalid"),
});

export const changePasswordSchema = z.object({
  current: password,
  next: z.string().min(8, "passwordShort").max(200, "tooLong"),
});

export const changeEmailSchema = z.object({ email, password: password.optional() });
