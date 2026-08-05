import type { Client, GatewayBootstrap, PolicyDecision } from './models';
import type { CreateClientInput, GatewayPort, PolicyEvaluationInput } from './gateway-port';
import type { AuditEvent, Discovery } from './models';
import { createOperatorPolicyService, type OperatorPolicyService } from './operator-policy-service';

export type ClientMutationResult = {
  client: Client & { token: string };
  bootstrap: GatewayBootstrap;
};

export interface GatewayController {
  refresh(signal?: AbortSignal): Promise<GatewayBootstrap>;
  createClient(input: CreateClientInput, signal?: AbortSignal): Promise<ClientMutationResult>;
  revokeClient(clientId: string, signal?: AbortSignal): Promise<GatewayBootstrap>;
  deleteClient(clientId: string, signal?: AbortSignal): Promise<GatewayBootstrap>;
  rotateClient(clientId: string, signal?: AbortSignal): Promise<ClientMutationResult>;
  loadDiscovery(token: string): Promise<Discovery>;
  loadAudit(decision: string): Promise<AuditEvent[]>;
  saveOperatorPolicy(selected: string[]): Promise<void>;
  evaluatePolicy(input: PolicyEvaluationInput): Promise<{ decision: PolicyDecision; reason: string }>;
}

export const createGatewayController = (gatewayPort: GatewayPort, operatorPolicy: OperatorPolicyService = createOperatorPolicyService(async (selected) => { await gatewayPort.saveOperatorPolicy(selected); })): GatewayController => ({
  refresh: (signal) => gatewayPort.loadBootstrap(signal),
  createClient(input, signal) {
    return gatewayPort.createClient(input, signal).then(async (client) => ({ client, bootstrap: await gatewayPort.loadBootstrap(signal) }));
  },
  async revokeClient(clientId, signal) {
    await gatewayPort.revokeClient(clientId, signal);
    return gatewayPort.loadBootstrap(signal);
  },
  async deleteClient(clientId, signal) {
    await gatewayPort.deleteClient(clientId, signal);
    return gatewayPort.loadBootstrap(signal);
  },
  async rotateClient(clientId, signal) {
    const client = await gatewayPort.rotateClient(clientId, signal);
    return { client, bootstrap: await gatewayPort.loadBootstrap(signal) };
  },
  loadDiscovery: (token) => gatewayPort.loadDiscovery(token),
  loadAudit: (decision) => gatewayPort.loadAudit(decision),
  saveOperatorPolicy: (selected) => operatorPolicy.save(selected),
  evaluatePolicy: (input) => gatewayPort.evaluatePolicy(input),
});
