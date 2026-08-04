import type { CapabilityDefinition, Profile } from './models';

const isWriteCapability = (name: string) => name.startsWith('ha.write.');

export const canSelectCapability = (profile: Profile, name: string) => profile === 'operator' || !isWriteCapability(name);

export const capabilitiesForProfile = (profile: Profile, definitions: CapabilityDefinition[]) =>
  definitions
    .filter((definition) => profile === 'operator' || definition.group === 'observer')
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
) => {
  if (!canSelectCapability(profile, name)) return [...selected];
  const next = new Set(selected);
  if (checked) next.add(name); else next.delete(name);
  return [...next];
};
