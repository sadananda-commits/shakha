/**
 * Thin client for the HSS Denmark Apps Script API.
 * See /hss-apps-script/README.md for the CORS workaround this relies on:
 * POST with Content-Type: text/plain to avoid a preflight OPTIONS request.
 */

const HSS_API_URL = process.env.NEXT_PUBLIC_HSS_API_URL || '';

export class HssApiError extends Error {}

export async function callHssApi<T = any>(
  action: string,
  params: Record<string, any> = {}
): Promise<T> {
  if (!HSS_API_URL) {
    throw new HssApiError(
      'NEXT_PUBLIC_HSS_API_URL is not set. Add the Apps Script /exec URL to .env.local.'
    );
  }

  let res: Response;
  try {
    res = await fetch(HSS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...params }),
    });
  } catch (err) {
    throw new HssApiError("We couldn't reach the server right now. Please try again.");
  }

  let json: { success: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch (err) {
    throw new HssApiError('Unexpected response from the server.');
  }

  if (!json.success) {
    throw new HssApiError(json.error || 'Something went wrong. Please try again.');
  }

  return json.data as T;
}
