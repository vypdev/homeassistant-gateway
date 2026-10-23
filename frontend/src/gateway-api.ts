import { api } from './api';
import { BootstrapError, GatewayError, gatewayErrorFromUnknown } from './gateway-errors';
import { assertBootstrapResponse, assertCapabilityProbeReport, assertClient, assertClients, assertGatewayBootstrap, assertIssuedClient, assertOperatorPolicySaveResponse, assertPolicyEvaluation } from './gateway-contracts';
import type { BootstrapProgress, CreateClientInput, GatewayPort, PolicyEvaluationInput } from './gateway-port';
import type { AuditEvent, BootstrapCheck, BootstrapCheckId, CapabilityProbeReport, Client, DevelopmentCatalog, DevelopmentReport, Discovery, GatewayBootstrap, HealthDetails, OperatorServicePolicy, OperatorStatus, Ready, UiContext } from './models';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;

export type { CreateClientInput, GatewayBootstrap, PolicyEvaluationInput } from './gateway-port';
export interface GatewayApi extends GatewayPort {}

export const createGatewayApi = (request: Request = api): GatewayApi => ({
  async loadBootstrap(signal?: AbortSignal, onProgress?: BootstrapProgress) {
    const requestInit = signal ? { signal } : undefined;
    const checks: Array<{ id: BootstrapCheckId; path: string; load: () => Promise<unknown> }> = [
      { id: 'readiness' as const, path: '/ready', load: () => request<Ready>('/../ready', requestInit) },
      { id: 'clients' as const, path: '/clients', load: () => request<Client[]>('/clients', requestInit) },
      { id: 'audit' as const, path: '/audit', load: () => request<AuditEvent[]>('/audit', requestInit) },
      { id: 'catalog' as const, path: '/development/catalog', load: () => request<DevelopmentCatalog>('/development/catalog', requestInit) },
      { id: 'development_reports' as const, path: '/development/reports', load: () => request<DevelopmentReport[]>('/development/reports', requestInit) },
      { id: 'ui_context' as const, path: '/ui/context', load: () => request<UiContext>('/ui/context', requestInit) },
      { id: 'health_details' as const, path: '/health/details', load: () => request<HealthDetails>('/health/details', requestInit) },
      { id: 'operator_status' as const, path: '/operator/status', load: () => request<OperatorStatus>('/operator/status', requestInit) },
      { id: 'operator_policy' as const, path: '/operator/service-policy', load: () => request<OperatorServicePolicy>('/operator/service-policy', requestInit) },
    ];
    const progress = new Map<BootstrapCheckId, BootstrapCheck>(checks.map(({ id, path }) => [id, { id, path, status: 'pending', duration_ms: null, error: null }]));
    const report = (id: BootstrapCheckId, update: Partial<BootstrapCheck>) => {
      const current = progress.get(id);
      if (!current) return;
      const next = { ...current, ...update };
      progress.set(id, next);
      onProgress?.(next);
    };
    checks.forEach(({ id }) => report(id, { status: 'pending' }));

    const values = new Map<string, unknown>();
    await Promise.all(checks.map(async ({ id, path, load }) => {
      const started = performance.now();
      report(id, { status: 'running', error: null });
      try {
        const value = await load();
        assertBootstrapResponse(id, value);
        values.set(id, value);
        report(id, { status: 'ok', duration_ms: Math.round(performance.now() - started) });
      } catch (error) {
        const normalized = gatewayErrorFromUnknown(error);
        report(id, {
          status: 'failed',
          duration_ms: Math.round(performance.now() - started),
          error: { code: normalized.code, http_status: normalized.status ?? null, message: normalized.message },
        });
      }
    }));

    const snapshotChecks = [...progress.values()];
    if (snapshotChecks.some((check) => check.status === 'failed')) throw new BootstrapError(snapshotChecks);
    const bootstrap = {
      ready: values.get('readiness'),
      clients: values.get('clients'),
      audit: values.get('audit'),
      development: values.get('catalog'),
      developmentReports: values.get('development_reports'),
      uiContext: values.get('ui_context'),
      healthDetails: values.get('health_details'),
      operatorStatus: values.get('operator_status'),
      operatorPolicy: values.get('operator_policy'),
    };
    assertGatewayBootstrap(bootstrap);
    return bootstrap;
  },
  async loadClients(signal?: AbortSignal) {
    const clients = await request<Client[]>('/clients', signal ? { signal } : undefined);
    assertClients(clients);
    return clients;
  },
  async createClient(input, signal) {
    const result = await request<Client & { token: string }>('/clients', {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
    assertIssuedClient(result);
    return result;
  },
  async updateClientCapabilities(clientId, capabilities, signal) {
    const result = await request<Client>(`/clients/${encodeURIComponent(clientId)}/capabilities`, {
      method: 'PATCH',
      body: JSON.stringify({ capabilities }),
      signal,
    });
    assertClient(result);
    return result;
  },
  revokeClient: (clientId, signal) => request<void>(`/clients/${encodeURIComponent(clientId)}/revoke`, { method: 'POST', signal }),
  deleteClient: (clientId, signal) => request<void>(`/clients/${encodeURIComponent(clientId)}`, { method: 'DELETE', signal }),
  async rotateClient(clientId, signal) {
    const result = await request<Client & { token: string }>(`/clients/${encodeURIComponent(clientId)}/rotate`, { method: 'POST', signal });
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
    assertOperatorPolicySaveResponse(result);
    return result;
  },
  async evaluatePolicy(input) {
    const result = await request<{ decision: string; reason: string }>('/policy/evaluate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    assertPolicyEvaluation(result);
    return result;
  },
  async probeCapabilities(clientId, entityId, signal) {
    const query = entityId ? `?entity_id=${encodeURIComponent(entityId)}` : '';
    const result = await request<CapabilityProbeReport>(`/clients/${encodeURIComponent(clientId)}/capability-probe${query}`, { method: 'POST', signal });
    assertCapabilityProbeReport(result);
    return result;
  },
});
