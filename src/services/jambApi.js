import { baseUrl } from "../helpers/apiConfig";
import store from "../context/store";

export class JambError extends Error {
  constructor({ status, code, message, details }) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT = 30000;

/**
 * Thin fetch client for /jamb. Uses the same x-auth-token as the rest of the
 * app (read from the redux store) and normalises errors into JambError.
 * Returns null for 204 responses.
 */
export async function jamb(method, path, { data, headers, timeout } = {}) {
  const token = store.getState()?.users?.token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout ?? DEFAULT_TIMEOUT);

  let res;
  try {
    res = await fetch(`${baseUrl}/jamb${path}`, {
      method: method.toUpperCase(),
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { "x-auth-token": token } : {}),
        ...headers,
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch (e) {
    const aborted = e?.name === "AbortError";
    throw new JambError({
      status: 0,
      code: aborted ? "TIMEOUT" : "NETWORK",
      message: aborted
        ? "The request timed out. Check your connection and try again."
        : "Network error. Check your connection and try again.",
    });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  let body = null;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = body?.error;
    throw new JambError({
      status: res.status,
      code: err?.code ?? (res.status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN"),
      message:
        err?.message ??
        (typeof body === "string" ? body : `Request failed (${res.status})`),
      details: err?.details,
    });
  }

  return body;
}

const RETRYABLE = [
  "NETWORK",
  "TIMEOUT",
  "INTERNAL_ERROR",
  "SUBMIT_IN_PROGRESS",
  "RATE_LIMITED",
];

/** True when retrying the SAME request (same idempotency key) is appropriate. */
export const isRetryable = (e) =>
  e instanceof JambError &&
  (e.status === 0 || e.status >= 500 || RETRYABLE.includes(e.code));
