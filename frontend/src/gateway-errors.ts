export type GatewayErrorCode =
  | 'network_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'operator_service_policy_invalid'
  | 'invalid_response'
  | 'server_error'
  | 'unknown_error';

const knownCodes = new Set<GatewayErrorCode>([
  'network_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'validation_error',
  'operator_service_policy_invalid',
  'invalid_response',
  'server_error',
  'unknown_error',
]);

export class GatewayError extends Error {
  constructor(
    readonly code: GatewayErrorCode,
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

const statusCode = (status: number): GatewayErrorCode => {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 422) return 'validation_error';
  if (status >= 500) return 'server_error';
  return 'unknown_error';
};

export function gatewayErrorFromResponse(status: number, body: unknown): GatewayError {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawCode = typeof record.code === 'string' ? record.code : '';
  const code = knownCodes.has(rawCode as GatewayErrorCode)
    ? rawCode as GatewayErrorCode
    : statusCode(status);
  return new GatewayError(code, `Request failed (${status})`, status);
}

export function isAbortError(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'name' in error && (error as { name?: unknown }).name === 'AbortError';
}

export function gatewayErrorFromUnknown(error: unknown): GatewayError {
  if (error instanceof GatewayError) return error;
  return new GatewayError('network_error', 'Gateway request failed', undefined, error);
}
