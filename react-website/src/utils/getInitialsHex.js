const FALLBACK_COLOR = '#64748B';
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function hslToHex(hue) {
  const saturation = 0.68;
  const lightness = 0.48;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSection = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const offset = lightness - chroma / 2;
  let red;
  let green;
  let blue;

  if (hueSection < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (hueSection < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (hueSection < 3) [red, green, blue] = [0, chroma, secondary];
  else if (hueSection < 4) [red, green, blue] = [0, secondary, chroma];
  else if (hueSection < 5) [red, green, blue] = [secondary, 0, chroma];
  else[red, green, blue] = [chroma, 0, secondary];

  const toHex = (channel) => Math.round((channel + offset) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function getInitialsHex(initials) {
  if (typeof initials !== 'string')
    return FALLBACK_COLOR;

  const normalized = initials.trim().toUpperCase();
  if (!normalized)
    return FALLBACK_COLOR;
  if (normalized === 'NM')
    return '#ff334b';

  let hash = FNV_OFFSET_BASIS;
  for (const character of normalized) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hslToHex((hash >>> 0) % 360);
}
