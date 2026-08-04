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
  refresh(): Promise<GatewayBootstrap>;
  createClient(input: CreateClientInput): Promise<ClientMutationResult>;
  revokeClient(clientId: string): Promise<GatewayBootstrap>;
  rotateClient(clientId: string): Promise<ClientMutationResult>;
  loadDiscovery(token: string): Promise<Discovery>;
  loadAudit(decision: string): Promise<AuditEvent[]>;
  saveOperatorPolicy(selected: string[]): Promise<void>;
  evaluatePolicy(input: PolicyEvaluationInput): Promise<{ decision: string; reason: string }>;
}

export const createGatewayController = (gatewayApi: GatewayPort, operatorPolicy: OperatorPolicyService = createOperatorPolicyService((selected) => gatewayApi.saveOperatorPolicy(selected))): GatewayController => ({
  refresh: () => gatewayApi.loadBootstrap(),
  async createClient(input) {
    const client = await gatewayApi.createClient(input);
    return { client, bootstrap: await gatewayApi.loadBootstrap() };
  },
  async revokeClient(clientId) {
    await gatewayApi.revokeClient(clientId);
    return gatewayApi.loadBootstrap();
  },
  async rotateClient(clientId) {
    const client = await gatewayApi.rotateClient(clientId);
    return { client, bootstrap: await gatewayApi.loadBootstrap() };
  },
  loadDiscovery: (token) => gatewayApi.loadDiscovery(token),
  loadAudit: (decision) => gatewayApi.loadAudit(decision),
  saveOperatorPolicy: (selected) => operatorPolicy.save(selected),
  evaluatePolicy: (input) => gatewayApi.evaluatePolicy(input),
});
