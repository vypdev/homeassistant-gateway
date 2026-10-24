import type { CapabilityDefinition, Profile } from './models';

const isWriteCapability = (name: string) => name.startsWith('ha.write.');

export const canSelectCapability = (profile: Profile, name: string, implemented = true) => implemented && (profile === 'operator' || !isWriteCapability(name));

export const capabilitiesForProfile = (profile: Profile, definitions: CapabilityDefinition[]) =>
  definitions
    .filter((definition) => definition.implemented !== false && (profile === 'operator' || definition.group === 'observer'))
    .map((definition) => definition.name);

export const capabilitiesAfterProfileChange = (
  profile: Profile,
  selected: Iterable<string>,
) => profile === 'observer'
  ? [...selected].filter((name) => !isWriteCapability(name))
  : [...selected];

export const toggleCapability = (
  profile: Profile,
  selected: Iterable<string>,
  name: string,
  checked: boolean,
  implemented = true,
) => {
  if (checked && !canSelectCapability(profile, name, implemented)) return [...selected];
  const next = new Set(selected);
  if (checked) next.add(name); else next.delete(name);
  return [...next];
};
