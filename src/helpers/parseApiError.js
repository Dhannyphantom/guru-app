/** Normalize RTK Query / fetch errors into a user-facing string. */
export function parseApiError(err, fallback = "Something went wrong") {
  if (!err) return fallback;

  if (typeof err?.status === "string" && err.status.includes("FETCH_ERROR")) {
    return "Unable to reach the server. Check your internet connection and try again.";
  }

  const data = err?.data ?? err?.error;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (typeof err?.error === "string" && err.error.trim()) return err.error;

  return fallback;
}
