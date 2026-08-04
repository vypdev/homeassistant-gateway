import { GatewayError } from './gateway-errors';
import type { Client, OperatorServicePolicy } from './models';
import type { GatewayBootstrap } from './gateway-api';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

export function assertGatewayBootstrap(value: unknown): asserts value is GatewayBootstrap {
  if (!isRecord(value)
    || !isRecord(value.ready)
    || !isArray(value.clients)
    || !isArray(value.audit)
    || !isRecord(value.development)
    || !isArray(value.developmentReports)
    || !isRecord(value.uiContext)
    || !isRecord(value.healthDetails)
    || !isRecord(value.operatorStatus)
    || !isRecord(value.operatorPolicy)) {
    throw new GatewayError('invalid_response', 'Invalid gateway bootstrap response');
  }
}

export function assertOperatorPolicy(value: unknown): asserts value is OperatorServicePolicy {
  if (!isRecord(value) || !isArray(value.services) || !isArray(value.selected)) {
    throw new GatewayError('invalid_response', 'Invalid operator policy response');
  }
}

export function assertIssuedClient(value: unknown): asserts value is Client & { token: string } {
  if (!isRecord(value) || typeof value.token !== 'string' || typeof value.client_id !== 'string') {
    throw new GatewayError('invalid_response', 'Invalid issued client response');
  }
}

export function assertPolicyEvaluation(value: unknown): asserts value is { decision: string; reason: string } {
  if (!isRecord(value) || typeof value.decision !== 'string' || typeof value.reason !== 'string') {
    throw new GatewayError('invalid_response', 'Invalid policy evaluation response');
  }
}
