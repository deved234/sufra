import { z } from "zod";
import { DURATIONS } from "@/lib/booking-slots";

// Booking input, checked on the server. Messages are "Form.errors" keys.

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "generic");
const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "generic");
const party = z.coerce.number().int("generic").min(1, "generic").max(100, "generic");
// Local or international: people type their mobile the way they know it
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{8,20}$/, "bookingPhoneInvalid");
const note = z.string().trim().max(200, "tooLong");

export const bookingSchema = z.object({ party, date, time, phone, note });

// A booking the owner takes over the phone: the name comes from the caller
export const manualBookingSchema = bookingSchema.extend({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
});

// A change the owner wants. The reason is required when asking a customer, which the
// action decides, because a booking taken by phone has nobody to ask.
export const bookingChangeSchema = z.object({ party, date, time, reason: note });

// Why the owner cancelled, for the customer. Optional.
export const cancelReasonSchema = note;

export function readBookingChangeForm(formData) {
  return {
    party: formData.get("party") ?? "",
    date: formData.get("date") ?? "",
    time: formData.get("time") ?? "",
    reason: formData.get("reason") ?? "",
  };
}

export const bookingSettingsSchema = z
  .object({
    enabled: z.boolean(),
    // Asked outright, never assumed: an empty box must not pass as zero seats
    capacity: z.string().trim().min(1, "capacityRequired").pipe(z.coerce.number().int("capacityInvalid").min(1, "capacityInvalid").max(1000, "capacityInvalid")),
    durationMinutes: z.coerce.number().refine((value) => DURATIONS.includes(value), "generic"),
    maxParty: z.coerce.number().int("maxPartyInvalid").min(1, "maxPartyInvalid").max(100, "maxPartyInvalid"),
  })
  .refine(({ capacity, maxParty }) => maxParty <= capacity, { message: "maxPartyOverCapacity", path: ["maxParty"] });

export function readBookingForm(formData) {
  return {
    party: formData.get("party") ?? "",
    date: formData.get("date") ?? "",
    time: formData.get("time") ?? "",
    phone: formData.get("phone") ?? "",
    note: formData.get("note") ?? "",
    ...(formData.has("name") && { name: formData.get("name") }),
  };
}

export function readBookingSettingsForm(formData) {
  return {
    enabled: formData.get("enabled") === "on",
    capacity: String(formData.get("capacity") ?? ""),
    durationMinutes: formData.get("durationMinutes") ?? "",
    maxParty: formData.get("maxParty") ?? "",
  };
}
