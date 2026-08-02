import type { CapabilityDefinition } from './models';

export const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  { name: 'ha.read.diagnostics', group: 'observer', label: 'Gateway diagnostics', description: 'Read gateway health, readiness, capabilities and sanitized diagnostics.' },
  { name: 'ha.read.entities', group: 'observer', label: 'Entity inventory', description: 'Read bounded entity and service inventory metadata.' },
  { name: 'ha.read.states', group: 'observer', label: 'Entity states', description: 'Read current states, optionally for one entity.' },
  { name: 'ha.read.automations', group: 'observer', label: 'Automations', description: 'Read automation entities and their current state.' },
  { name: 'ha.read.config_entries', group: 'observer', label: 'Configuration metadata', description: 'Read safe configuration and registry metadata without secrets.' },
  { name: 'ha.read.history', group: 'observer', label: 'History', description: 'Read bounded state history with optional filters.' },
  { name: 'ha.read.logbook', group: 'observer', label: 'Logbook', description: 'Read bounded logbook records with optional filters.' },
  { name: 'ha.read.registry', group: 'observer', label: 'Registries and resources', description: 'Read devices, areas, floors, labels, entity registry, scripts, scenes, helpers and integrations.' },
  { name: 'ha.read.services', group: 'observer', label: 'Service catalog', description: 'Read the available Home Assistant service catalog; this does not execute services.' },
  { name: 'ha.read.events', group: 'observer', label: 'Event catalog', description: 'Read the bounded event catalog; this does not fire events.' },
  { name: 'ha.write.services', group: 'operator', label: 'Service execution', description: 'Write capability; unavailable while operator mode is disabled.' },
  { name: 'ha.write.automations', group: 'operator', label: 'Automation changes', description: 'Write capability; unavailable while operator mode is disabled.' },
  { name: 'ha.write.configuration', group: 'operator', label: 'Configuration changes', description: 'Write capability; unavailable while operator mode is disabled.' },
];
