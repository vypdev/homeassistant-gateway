import { gatewayErrorFromResponse, gatewayErrorFromUnknown } from './gateway-errors';

export const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(new URL(`./api${path}`, document.baseURI), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw gatewayErrorFromUnknown(error);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw gatewayErrorFromResponse(response.status, body);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
};
