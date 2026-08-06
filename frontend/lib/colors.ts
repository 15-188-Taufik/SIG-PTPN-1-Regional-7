export const KEBUN_COLORS: Record<string, string> = {
  'Unit Way Berulu': '#0072B2',   // Biru
  'Unit Bergen': '#009E73',       // Hijau Kebiruan
  'Unit Way Lima': '#CC79A7',     // Merah Muda Keunguan
  'Unit Tulungbuyut': '#E69F00',  // Jingga
  'Unit Kedaton': '#56B4E9',      // Biru Langit
  'Unit Ketahun': '#D55E00',      // Merah Jingga / Vermillion
  'Unit Padang Pelawi': '#8B1A4A', // Merah Tua / Burgundy
  'Unit Musilandas': '#8A2BE2',  // Blue Violet
};

const FALLBACK_PALETTE = [
  '#393b79', '#5254a3', '#6b6ecf', '#9c9ede', '#637939', '#8ca252', '#b5cf6b', '#cedb9c',
  '#8c6d31', '#bd9e39', '#e7ba52', '#e7cb94', '#843c39', '#ad494a', '#d6616b', '#e7969c',
  '#7b4173', '#a55194', '#ce6dbd', '#de9ed6', '#3182bd', '#6baed6', '#9ecae1', '#c6dbef',
  '#e6550d', '#fd8d3c', '#fdae6b', '#fdd0a2', '#31a354', '#74c476', '#a1d99b', '#c7e9c0',
  '#756bb1', '#9e9ac8', '#bcbddc', '#dadaeb', '#636363', '#969696', '#bdbdbd', '#d9d9d9'
];

export function getKebunColor(kebun: string | null): string {
  if (!kebun) return '#848684'; // Default grey for undefined/null
  
  // Find case-insensitive match
  const matchedKey = Object.keys(KEBUN_COLORS).find(
    (k) => k.toLowerCase() === kebun.toLowerCase()
  );
  if (matchedKey) return KEBUN_COLORS[matchedKey];
  
  // Generate consistent hash-based color for new kebuns (dynamic fallback)
  let hash = 0;
  const cleanName = kebun.trim();
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
}
