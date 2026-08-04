import { api } from './api';
import { assertGatewayBootstrap, assertIssuedClient, assertOperatorPolicy, assertPolicyEvaluation } from './gateway-contracts';
import type { CreateClientInput, GatewayPort, PolicyEvaluationInput } from './gateway-port';
import type { AuditEvent, Client, DevelopmentCatalog, DevelopmentReport, Discovery, GatewayBootstrap, HealthDetails, OperatorServicePolicy, OperatorStatus, Ready, UiContext } from './models';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;

export type { CreateClientInput, GatewayBootstrap, PolicyEvaluationInput } from './gateway-port';
export interface GatewayApi extends GatewayPort {}

export const createGatewayApi = (request: Request = api): GatewayApi => ({
  async loadBootstrap(signal?: AbortSignal) {
    const requestInit = signal ? { signal } : undefined;
    const [ready, clients, audit, development, developmentReports, uiContext, healthDetails, operatorStatus, operatorPolicy] = await Promise.all([
      request<Ready>('/../ready', requestInit),
      request<Client[]>('/clients', requestInit),
      request<AuditEvent[]>('/audit', requestInit),
      request<DevelopmentCatalog>('/development/catalog', requestInit),
      request<DevelopmentReport[]>('/development/reports', requestInit),
      request<UiContext>('/ui/context', requestInit),
      request<HealthDetails>('/health/details', requestInit),
      request<OperatorStatus>('/operator/status', requestInit),
      request<OperatorServicePolicy>('/operator/service-policy', requestInit),
    ]);
    assertOperatorPolicy(operatorPolicy);
    const bootstrap = { ready, clients, audit, development, developmentReports, uiContext, healthDetails, operatorStatus, operatorPolicy };
    assertGatewayBootstrap(bootstrap);
    return bootstrap;
  },
  async createClient(input) {
    const result = await request<Client & { token: string }>('/clients', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    assertIssuedClient(result);
    return result;
  },
  revokeClient: (clientId) => request<void>(`/clients/${encodeURIComponent(clientId)}/revoke`, { method: 'POST' }),
  async rotateClient(clientId) {
    const result = await request<Client & { token: string }>(`/clients/${encodeURIComponent(clientId)}/rotate`, { method: 'POST' });
    assertIssuedClient(result);
    return result;
  },
  loadDiscovery: (token) => request<Discovery>('/mcp/discovery', { headers: { Authorization: `Bearer ${token}` } }),
  loadAudit: (decision) => request<AuditEvent[]>(`/audit?limit=100${decision ? `&decision=${encodeURIComponent(decision)}` : ''}`),
  async saveOperatorPolicy(selected) {
    const result = await request<unknown>('/operator/service-policy', {
      method: 'PUT',
      body: JSON.stringify({ selected }),
    });
    return result as void;
  },
  async evaluatePolicy(input) {
    const result = await request<{ decision: string; reason: string }>('/policy/evaluate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    assertPolicyEvaluation(result);
    return result;
  },
});
