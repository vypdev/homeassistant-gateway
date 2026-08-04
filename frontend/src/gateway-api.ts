import { api } from './api';
import { assertGatewayBootstrap, assertIssuedClient, assertOperatorPolicy, assertPolicyEvaluation } from './gateway-contracts';
import type {
  GatewayBootstrap,
  Client,
  AuditEvent,
  UiContext,
  Discovery,
  DevelopmentCatalog,
  DevelopmentReport,
  HealthDetails,
  OperatorServicePolicy,
  OperatorStatus,
  Ready,
} from './models';

export type { GatewayBootstrap } from './models';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;

export type CreateClientInput = {
  client_id: string;
  display_name: string;
  profile: string;
  capabilities: string[];
  operator_services: string[];
};

export type PolicyEvaluationInput = {
  client_id: string;
  capability: string;
  mutation: boolean;
};

export interface GatewayApi {
  loadBootstrap(): Promise<GatewayBootstrap>;
  createClient(input: CreateClientInput): Promise<Client & { token: string }>;
  revokeClient(clientId: string): Promise<void>;
  rotateClient(clientId: string): Promise<Client & { token: string }>;
  loadDiscovery(token: string): Promise<Discovery>;
  loadAudit(decision: string): Promise<AuditEvent[]>;
  saveOperatorPolicy(selected: string[]): Promise<void>;
  evaluatePolicy(input: PolicyEvaluationInput): Promise<{ decision: string; reason: string }>;
}

export const createGatewayApi = (request: Request = api): GatewayApi => ({
  async loadBootstrap() {
    const [ready, clients, audit, development, developmentReports, uiContext, healthDetails, operatorStatus, operatorPolicy] = await Promise.all([
      request<Ready>('/../ready'),
      request<Client[]>('/clients'),
      request<AuditEvent[]>('/audit'),
      request<DevelopmentCatalog>('/development/catalog'),
      request<DevelopmentReport[]>('/development/reports'),
      request<UiContext>('/ui/context'),
      request<HealthDetails>('/health/details'),
      request<OperatorStatus>('/operator/status'),
      request<OperatorServicePolicy>('/operator/service-policy'),
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
