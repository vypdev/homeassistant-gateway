export type Translator = (key: string) => string;

const CAPABILITY_KEYS: Record<string, string> = {
  'ha.read.diagnostics': 'Diagnostics',
  'ha.read.entities': 'Entities',
  'ha.read.states': 'States',
  'ha.read.automations': 'Automations',
  'ha.read.config_entries': 'Config',
  'ha.read.history': 'History',
  'ha.read.logbook': 'Logbook',
  'ha.read.registry': 'Registry',
  'ha.read.services': 'Services',
  'ha.read.events': 'Events',
  'ha.write.services': 'WriteServices',
  'ha.write.automations': 'WriteAutomations',
  'ha.write.configuration': 'WriteConfig',
};

const PACK_KEYS: Record<string, string> = {
  basic_inventory: 'Basic',
  automation_diagnostics: 'Automation',
  mcp_readiness: 'Mcp',
  data_completeness: 'Completeness',
};

export function capabilityText(localeCatalog: Record<string, string> | undefined, name: string, suffix: 'Label' | 'Description', fallback: string): string {
  const key = `cap${CAPABILITY_KEYS[name] ?? name}${suffix}`;
  return localeCatalog?.[key] ?? fallback;
}

export function statusText(translator: Translator, status: string): string {
  return translator(status === 'warning' ? 'statusPartial' : status === 'unavailable' ? 'statusError' : `status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

export function isProblemStatus(status: string): boolean {
  return status === 'error' || status === 'warning' || status === 'unavailable';
}

export function operationText(translator: Translator, operation: string, field: 'Label' | 'Description', fallback: string): string {
  const name = operation === 'entity_registry' ? 'EntityRegistry' : operation === 'automation_config' ? 'AutomationConfig' : operation === 'gateway_ports' ? 'GatewayPorts' : operation.charAt(0).toUpperCase() + operation.slice(1);
  const key = `op${name}${field}`;
  const value = translator(key);
  return value === key ? fallback : value;
}

export function packText(translator: Translator, pack: string, field: 'Label' | 'Description', fallback: string): string {
  const key = `pack${PACK_KEYS[pack] ?? pack}${field}`;
  const value = translator(key);
  return value === key ? fallback : value;
}

export function pageTitle(translator: Translator, view: string): string {
  return ({ overview: translator('overviewTitle'), development: translator('developmentTitle'), clients: translator('clientsTitle'), policy: translator('policyTitle'), mcp: translator('mcpTitle'), audit: translator('auditTitle'), catalog: translator('catalogTitle') } as Record<string, string>)[view] ?? translator('overviewTitle');
}

export function pageSubtitle(translator: Translator, view: string): string {
  return ({ overview: translator('overviewSubtitle'), development: translator('developmentSubtitle'), clients: translator('clientsSubtitle'), policy: translator('policySubtitle'), mcp: translator('mcpSubtitle'), audit: translator('auditSubtitle'), catalog: translator('catalogSubtitle') } as Record<string, string>)[view] ?? translator('overviewSubtitle');
}
