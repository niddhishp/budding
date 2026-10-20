/** Each mounted child-specific view owns its requests. Late responses are discarded. */
export class RequestScope {
  private controllers = new Set<AbortController>();
  start(timeoutMs = 58_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    this.controllers.add(controller);
    return { signal: controller.signal, active: () => !controller.signal.aborted, cancel: () => controller.abort(),
      finish: () => { clearTimeout(timer); this.controllers.delete(controller); } };
  }
  cancel() { for (const c of this.controllers) c.abort(); this.controllers.clear(); }
}
