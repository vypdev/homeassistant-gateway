import { GatewayError, gatewayErrorFromResponse, gatewayErrorFromUnknown, isAbortError } from './gateway-errors';

export const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(new URL(`./api${path}`, document.baseURI), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw gatewayErrorFromUnknown(error);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw gatewayErrorFromResponse(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  try {
    return await response.json() as T;
  } catch (error) {
    throw new GatewayError('invalid_response', 'Gateway returned invalid JSON', response.status, error);
  }
};
