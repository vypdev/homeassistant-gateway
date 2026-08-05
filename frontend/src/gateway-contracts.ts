import { GatewayError } from './gateway-errors';
import type { AuditEvent, Client, GatewayBootstrap, HealthCheck, HealthDetails, OperatorPolicySaveResponse, OperatorService, OperatorServicePolicy, OperatorStatus, PolicyDecision, Ready } from './models';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const hasStrings = (value: Record<string, unknown>, keys: string[]): boolean => keys.every((key) => typeof value[key] === 'string');
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const POLICY_DECISIONS = new Set(['allowed', 'denied', 'approval_required']);

const isReady = (value: unknown): value is Ready => isRecord(value) && hasStrings(value, ['status', 'storage', 'mcp', 'home_assistant']);
const isClient = (value: unknown): value is Client => {
  if (!isRecord(value) || !hasStrings(value, ['client_id', 'display_name', 'created_at', 'status'])) return false;
  return (value.profile === 'observer' || value.profile === 'operator')
    && isStringArray(value.capabilities)
    && isStringArray(value.operator_services)
    && (value.revoked_at === null || typeof value.revoked_at === 'string');
};
const isAuditEvent = (value: unknown): value is AuditEvent => {
  if (!isRecord(value) || !hasStrings(value, ['event_id', 'occurred_at', 'request_id', 'action', 'target', 'decision', 'outcome'])) return false;
  return (value.remote_user_id === null || typeof value.remote_user_id === 'string') && typeof value.status_code === 'number';
};
const isHealthCheck = (value: unknown): value is HealthCheck => isRecord(value)
  && hasStrings(value, ['name', 'status', 'code'])
  && typeof value.latency_ms === 'number'
  && (value.http_status === null || typeof value.http_status === 'number');
const isHealthDetails = (value: unknown): value is HealthDetails => isRecord(value)
  && typeof value.status === 'string'
  && Array.isArray(value.checks)
  && value.checks.every(isHealthCheck);
const isOperatorStatus = (value: unknown): value is OperatorStatus => isRecord(value)
  && typeof value.operator_enabled === 'boolean'
  && hasStrings(value, ['execution', 'reason'])
  && isStringArray(value.registered_mutation_tools)
  && isStringArray(value.capabilities);
const isOperatorService = (value: unknown): value is OperatorService => isRecord(value)
  && hasStrings(value, ['id', 'domain', 'service', 'name', 'description'])
  && isRecord(value.fields);
const isOperatorPolicy = (value: unknown): value is OperatorServicePolicy => isRecord(value)
  && Array.isArray(value.services)
  && value.services.every(isOperatorService)
  && isStringArray(value.selected);

const invalid = (message: string): never => { throw new GatewayError('invalid_response', message); };

export function assertGatewayBootstrap(value: unknown): asserts value is GatewayBootstrap {
  if (!isRecord(value)
    || !isReady(value.ready)
    || !Array.isArray(value.clients)
    || !value.clients.every(isClient)
    || !Array.isArray(value.audit)
    || !value.audit.every(isAuditEvent)
    || !isRecord(value.development)
    || !Array.isArray(value.development.operations)
    || !Array.isArray(value.development.packs)
    || !Array.isArray(value.developmentReports)
    || !isRecord(value.uiContext)
    || typeof value.uiContext.locale !== 'string'
    || !['light', 'dark', 'auto'].includes(String(value.uiContext.theme))
    || !isHealthDetails(value.healthDetails)
    || !isOperatorStatus(value.operatorStatus)
    || !isOperatorPolicy(value.operatorPolicy)) invalid('Invalid gateway bootstrap response');
}

export function assertOperatorPolicy(value: unknown): asserts value is OperatorServicePolicy {
  if (!isOperatorPolicy(value)) invalid('Invalid operator policy response');
}

export function assertOperatorPolicySaveResponse(value: unknown): asserts value is OperatorPolicySaveResponse {
  if (!isRecord(value) || !isStringArray(value.selected)) invalid('Invalid operator policy save response');
}

export function assertIssuedClient(value: unknown): asserts value is Client & { token: string } {
  if (!isRecord(value) || typeof value.token !== 'string' || value.token.length === 0 || typeof value.client_id !== 'string') invalid('Invalid issued client response');
}

export function assertPolicyEvaluation(value: unknown): asserts value is { decision: PolicyDecision; reason: string } {
  if (!isRecord(value) || typeof value.decision !== 'string' || !POLICY_DECISIONS.has(value.decision) || typeof value.reason !== 'string') invalid('Invalid policy evaluation response');
}
