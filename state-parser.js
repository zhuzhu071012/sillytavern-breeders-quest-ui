const BLOCK_PATTERNS = [
  /<breeder_state>\s*([\s\S]*?)\s*<\/breeder_state>/gi,
  /```(?:breeder-state|breeder_state|育种状态)\s*([\s\S]*?)```/gi,
];

export const DEFAULT_STATE = Object.freeze({
  player: { name: '等待创建角色', race: '未知', level: 1, title: '初来乍到' },
  stats: { STR: 0, DEX: 0, INT: 0, CON: 0, CHA: 0, WIS: 0, FERT: 0 },
  location: '登录大厅',
  time: '第 1 天 · 清晨',
  quests: [],
  lineage: [],
  gestations: [],
  inventory: [],
  notices: [],
});

function asText(value, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function asList(value, limit = 20) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').slice(0, limit) : [];
}

export function normalizeState(input) {
  const value = input && typeof input === 'object' ? input : {};
  const player = value.player && typeof value.player === 'object' ? value.player : {};
  const stats = value.stats && typeof value.stats === 'object' ? value.stats : {};
  const cleanStats = {};
  for (const key of Object.keys(DEFAULT_STATE.stats)) {
    const raw = Number(stats[key]);
    cleanStats[key] = Number.isFinite(raw) ? Math.max(0, Math.min(999, Math.round(raw))) : 0;
  }
  return {
    player: {
      name: asText(player.name, DEFAULT_STATE.player.name),
      race: asText(player.race, DEFAULT_STATE.player.race),
      level: Math.max(1, Number.parseInt(player.level, 10) || 1),
      title: asText(player.title, DEFAULT_STATE.player.title),
    },
    stats: cleanStats,
    location: asText(value.location, DEFAULT_STATE.location),
    time: asText(value.time, DEFAULT_STATE.time),
    quests: asList(value.quests),
    lineage: asList(value.lineage),
    gestations: asList(value.gestations),
    inventory: Array.isArray(value.inventory) ? value.inventory.slice(0, 30) : [],
    notices: Array.isArray(value.notices) ? value.notices.slice(-10) : [],
  };
}

export function extractLatestState(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const text = typeof list[index] === 'string' ? list[index] : list[index]?.mes;
    if (typeof text !== 'string') continue;
    for (const pattern of BLOCK_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = [...text.matchAll(pattern)];
      for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex -= 1) {
        try {
          return normalizeState(JSON.parse(matches[matchIndex][1]));
        } catch {
          // A partially streamed block is expected occasionally; keep looking backwards.
        }
      }
    }
  }
  return null;
}

export function stripStateBlocks(text) {
  let result = String(text ?? '');
  for (const pattern of BLOCK_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '');
  }
  return result.trimEnd();
}
