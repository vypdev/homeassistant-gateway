import type { AuditEvent, Client, Discovery, GatewayBootstrap, OperatorPolicySaveResponse, OperatorServicePolicy, PolicyDecision } from './models';

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

export interface GatewayPort {
  loadBootstrap(signal?: AbortSignal): Promise<GatewayBootstrap>;
  createClient(input: CreateClientInput, signal?: AbortSignal): Promise<Client & { token: string }>;
  revokeClient(clientId: string, signal?: AbortSignal): Promise<void>;
  deleteClient(clientId: string, signal?: AbortSignal): Promise<void>;
  rotateClient(clientId: string, signal?: AbortSignal): Promise<Client & { token: string }>;
  loadDiscovery(token: string): Promise<Discovery>;
  loadAudit(decision: string): Promise<AuditEvent[]>;
  saveOperatorPolicy(selected: string[]): Promise<OperatorPolicySaveResponse>;
  evaluatePolicy(input: PolicyEvaluationInput): Promise<{ decision: PolicyDecision; reason: string }>;
}

export type { GatewayBootstrap, OperatorServicePolicy };
