export type WorkerHeartbeat = {
  last_started_at?: string | null;
  last_finished_at: string | null;
  last_error: string | null;
};
export type WorkerAssessment = { state: 'unknown' | 'attention' | 'recent'; message: string };

/** The recovery worker runs every minute; allow five minutes for scheduling and execution. */
export function assessDeliveryWorker(health: WorkerHeartbeat | null, now = Date.now()): WorkerAssessment {
  if (!health) return { state: 'unknown', message: 'No recovery pass recorded. Verify the worker secret and the production schedule.' };
  if (health.last_error) return { state: 'attention', message: 'The recovery worker reported a problem. Check delivery jobs and provider configuration.' };
  if (!health.last_finished_at) return { state: 'unknown', message: 'No completed recovery pass recorded yet. A started pass is not proof of completion.' };
  const finished = Date.parse(health.last_finished_at);
  if (!Number.isFinite(finished) || finished > now + 60_000) return { state: 'unknown', message: 'The recorded recovery time is invalid. Check the worker before relying on delivery.' };
  if (now - finished > 5 * 60_000) return { state: 'attention', message: 'Recovery is overdue: no completed pass in the last five minutes. Check the production cron schedule and worker logs.' };
  return { state: 'recent', message: 'A recovery pass completed recently. This does not confirm that a message reached its recipient.' };
}
