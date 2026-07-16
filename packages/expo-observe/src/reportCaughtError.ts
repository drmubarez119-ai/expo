import AppMetrics from 'expo-app-metrics';

/**
 * The `reportError` payload shape sent to the native AppMetrics module. The native record types
 * `type`/`stacktrace` as optional strings and `message` as a required string, so a non-string value
 * would fail the record decode and drop the report. Every field is normalized to a string here.
 */
type NormalizedReportedError = {
  type?: string;
  message: string;
  stacktrace?: string;
};

/** Returns `value` when it's a string, otherwise `undefined`, so non-string fields never reach native. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Normalizes an arbitrary caught value into the fields the native `reportError` expects, the way the
 * global `ErrorUtils` handler does. Only a real `Error` contributes `name`/`message`/`stack`, and
 * each is used only when it's actually a string; anything else (a string, a plain object, a number,
 * an `Error` with non-string fields) falls back to `String(error)` for the message with no type or
 * stacktrace. This keeps a non-string field (e.g. `throw { message: 404 }`) from reaching native.
 */
function normalizeReportedError(error: unknown): NormalizedReportedError {
  if (error instanceof Error) {
    return {
      type: asString(error.name),
      message: asString(error.message) ?? String(error),
      stacktrace: asString(error.stack),
    };
  }
  return { message: String(error) };
}

/**
 * Reports a caught value as a non-fatal `caught`-source error through the AppMetrics module, shared
 * by the native and web `Observe.reportError` implementations.
 *
 * Never throws. `reportError` is called from a `catch` block, so a failure here (a pathological
 * thrown value with a throwing getter or `toString`, or a native call that rejects the payload) must
 * not escape and turn a handled error into an unhandled one. Any failure is swallowed, with a
 * `console.warn` in development so the problem is still visible while debugging.
 */
export function reportCaughtError(error: unknown): void {
  try {
    AppMetrics.reportError({
      source: 'caught',
      ...normalizeReportedError(error),
      isFatal: false,
    });
  } catch (reportingError) {
    if (__DEV__) {
      console.warn('[expo-observe] `reportError` failed to record the error:', reportingError);
    }
  }
}
