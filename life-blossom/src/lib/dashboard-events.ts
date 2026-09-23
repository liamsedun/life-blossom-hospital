/**
 * Lightweight cross-component event bus for dashboard refresh.
 *
 * Fire after any data mutation:
 *   emitDashboardRefresh("payments");
 *
 * Subscribe in a dashboard (inside useEffect):
 *   useDashboardRefresh(callback, ["payments"]);
 */

export type DashboardRefreshScope =
  | "payments"
  | "invoices"
  | "appointments"
  | "patients"
  | "expenses"
  | "income"
  | "staff"
  | "*";

const EVENT_NAME = "dashboard:refresh";

/** Fire a dashboard refresh event. */
export function emitDashboardRefresh(scope: DashboardRefreshScope = "*") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { scope, ts: Date.now() } })
  );
}

/**
 * React hook — calls `callback` when a matching refresh event fires.
 * Wrap in useEffect at the call site.
 *
 * @example
 *   useEffect(() => {
 *     return listenDashboardRefresh(() => refresh(), ["payments", "invoices"]);
 *   }, [refresh]);
 */
export function listenDashboardRefresh(
  callback: () => void,
  scopes: DashboardRefreshScope[] = ["*"]
): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { scope: DashboardRefreshScope };
    if (scopes.includes("*") || scopes.includes(detail.scope)) {
      callback();
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
