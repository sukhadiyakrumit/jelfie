// Utility for handling server-side errors without leaking DB internals to clients.
// Logs the full error server-side and throws a generic, user-safe message.

type UnknownError = { message?: string; code?: string; details?: string } | Error | null | undefined;

export function throwSafe(error: UnknownError, userMessage = "Something went wrong. Please try again."): never {
  if (error) {
    // Server-side log with full detail for debugging
    console.error("[server-error]", error);
  }
  throw new Error(userMessage);
}
