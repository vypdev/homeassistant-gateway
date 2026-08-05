import type { Client, GatewayBootstrap, PolicyDecision } from './models';
import type { CreateClientInput, GatewayPort, PolicyEvaluationInput } from './gateway-port';
import type { AuditEvent, Discovery } from './models';
import { createOperatorPolicyService, type OperatorPolicyService } from './operator-policy-service';

export type ClientMutationResult = {
  client: Client & { token: string };
};

export interface GatewayController {
  refresh(signal?: AbortSignal): Promise<GatewayBootstrap>;
  refreshClients(signal?: AbortSignal): Promise<Client[]>;
  createClient(input: CreateClientInput, signal?: AbortSignal): Promise<ClientMutationResult>;
  revokeClient(clientId: string, signal?: AbortSignal): Promise<void>;
  deleteClient(clientId: string, signal?: AbortSignal): Promise<void>;
  rotateClient(clientId: string, signal?: AbortSignal): Promise<ClientMutationResult>;
  loadDiscovery(token: string): Promise<Discovery>;
  loadAudit(decision: string): Promise<AuditEvent[]>;
  saveOperatorPolicy(selected: string[]): Promise<void>;
  evaluatePolicy(input: PolicyEvaluationInput): Promise<{ decision: PolicyDecision; reason: string }>;
}

export const createGatewayController = (gatewayPort: GatewayPort, operatorPolicy: OperatorPolicyService = createOperatorPolicyService(async (selected) => { await gatewayPort.saveOperatorPolicy(selected); })): GatewayController => ({
  refresh: (signal) => gatewayPort.loadBootstrap(signal),
  refreshClients: (signal) => gatewayPort.loadClients(signal),
  async createClient(input, signal) {
    const client = await gatewayPort.createClient(input, signal);
    return { client };
  },
  revokeClient: (clientId, signal) => gatewayPort.revokeClient(clientId, signal),
  deleteClient: (clientId, signal) => gatewayPort.deleteClient(clientId, signal),
  async rotateClient(clientId, signal) {
    const client = await gatewayPort.rotateClient(clientId, signal);
    return { client };
  },
  loadDiscovery: (token) => gatewayPort.loadDiscovery(token),
  loadAudit: (decision) => gatewayPort.loadAudit(decision),
  saveOperatorPolicy: (selected) => operatorPolicy.save(selected),
  evaluatePolicy: (input) => gatewayPort.evaluatePolicy(input),
});
