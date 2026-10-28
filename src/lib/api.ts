/* Talks to Next.js API routes (/api/*). Throws an Error carrying the server's message. */
export async function api<T = any>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: any } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw Object.assign(new Error('Could not reach the server. Please check your connection and try again.'), { status: 0 });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `Request failed (${res.status}).`), { status: res.status });
  }
  return data as T;
}
