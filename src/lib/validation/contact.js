import { z } from "zod";
import { email } from "@/lib/validation/auth";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  email,
  message: z.string().trim().min(1, "required").min(10, "messageShort").max(5000, "tooLong"),
});
