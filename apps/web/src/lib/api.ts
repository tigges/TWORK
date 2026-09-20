const BASE = '/api/v1'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('ybot-app')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { token?: string } }
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    credentials: 'include',
    ...init,
  })

  const json = (await res.json()) as T
  if (!res.ok) {
    throw new ApiError(res.status, (json as { error: { code: string; message: string } }).error)
  }
  return json
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { code: string; message: string }
  ) {
    super(body.message)
    this.name = 'ApiError'
  }
}
