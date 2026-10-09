export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private readonly baseUrl = import.meta.env.VITE_API_URL || '/api';

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...options, headers, credentials: 'include' });
    } catch {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nestedError = typeof payload.error === 'object' && payload.error !== null ? payload.error : payload;
      const message = Array.isArray(nestedError.message) ? nestedError.message.join(', ') : nestedError.message;
      throw new ApiError(message || 'The request could not be completed.', response.status, nestedError.code);
    }
    if (payload.success === true && Object.hasOwn(payload, 'data')) return payload.data as T;
    return payload as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }
}

export const api = new ApiClient();