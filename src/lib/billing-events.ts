import { z } from "zod";
const entity = z.object({
  id: z.string().min(1).max(100),
  status: z.enum([
    "created",
    "authenticated",
    "active",
    "pending",
    "halted",
    "cancelled",
    "completed",
    "expired",
    "paused",
  ]),
  current_end: z.number().int().positive().nullable().optional(),
});
export const billingEventSchema = z.object({
  event: z.string().max(100),
  created_at: z.number().int().positive(),
  payload: z.object({
    subscription: z.object({ entity }),
    payment: z
      .object({
        entity: z.object({
          status: z.string(),
          captured: z.boolean().optional(),
        }),
      })
      .optional(),
  }),
});
export function billingEventArgs(
  id: string,
  event: z.infer<typeof billingEventSchema>,
) {
  const s = event.payload.subscription.entity;
  return {
    p_id: id,
    p_subscription: s.id,
    p_event: event.event,
    p_created: event.created_at,
    p_status: s.status,
    p_period_end: s.current_end
      ? new Date(s.current_end * 1000).toISOString()
      : null,
    p_paid:
      event.event === "subscription.charged" &&
      event.payload.payment?.entity.status === "captured",
  };
}
