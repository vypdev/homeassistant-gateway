import type { Client } from './models';
import type { CreateClientInput, GatewayPort, PolicyEvaluationInput } from './gateway-port';
import type { GatewayBootstrap } from './models';
import type { AuditEvent, Discovery } from './models';
import { createOperatorPolicyService, type OperatorPolicyService } from './operator-policy-service';

export type ClientMutationResult = {
  client: Client & { token: string };
  bootstrap: GatewayBootstrap;
};

export interface GatewayController {
  refresh(signal?: AbortSignal): Promise<GatewayBootstrap>;
  createClient(input: CreateClientInput): Promise<ClientMutationResult>;
  revokeClient(clientId: string): Promise<GatewayBootstrap>;
  rotateClient(clientId: string): Promise<ClientMutationResult>;
  loadDiscovery(token: string): Promise<Discovery>;
  loadAudit(decision: string): Promise<AuditEvent[]>;
  saveOperatorPolicy(selected: string[]): Promise<void>;
  evaluatePolicy(input: PolicyEvaluationInput): Promise<{ decision: string; reason: string }>;
}

export const createGatewayController = (gatewayPort: GatewayPort, operatorPolicy: OperatorPolicyService = createOperatorPolicyService((selected) => gatewayPort.saveOperatorPolicy(selected))): GatewayController => ({
  refresh: (signal) => gatewayPort.loadBootstrap(signal),
  async createClient(input) {
    const client = await gatewayPort.createClient(input);
    return { client, bootstrap: await gatewayPort.loadBootstrap() };
  },
  async revokeClient(clientId) {
    await gatewayPort.revokeClient(clientId);
    return gatewayPort.loadBootstrap();
  },
  async rotateClient(clientId) {
    const client = await gatewayPort.rotateClient(clientId);
    return { client, bootstrap: await gatewayPort.loadBootstrap() };
  },
  loadDiscovery: (token) => gatewayPort.loadDiscovery(token),
  loadAudit: (decision) => gatewayPort.loadAudit(decision),
  saveOperatorPolicy: (selected) => operatorPolicy.save(selected),
  evaluatePolicy: (input) => gatewayPort.evaluatePolicy(input),
});
