import { z } from "zod";

// Messages are keys in the "Form.errors" messages, translated by the form
export const email = z.string().trim().toLowerCase().max(254, "emailInvalid").pipe(z.email("emailInvalid"));

const newPassword = z.string().min(8, "passwordShort").max(200, "tooLong");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  email,
  password: newPassword,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "required").max(200, "tooLong"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });

// The first message for each field, e.g. { email: "emailInvalid" }
export function fieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}
