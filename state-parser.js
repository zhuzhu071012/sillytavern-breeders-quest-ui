const WUZHOU_PATTERNS = [
  /<wuzhou_state>\s*([\s\S]*?)\s*<\/wuzhou_state>/gi,
  /```(?:wuzhou-state|wuzhou_state|武周状态)\s*([\s\S]*?)```/gi,
];
const LEGACY_PATTERNS = [
  /<breeder_state>\s*([\s\S]*?)\s*<\/breeder_state>/gi,
  /```(?:breeder-state|breeder_state|育种状态)\s*([\s\S]*?)```/gi,
];

export const ABILITY_KEYS = ['学识', '文采', '政略', '德望', '人脉', '体魄', '家业'];
export const ADULT_AGE = 21;

export const DEFAULT_STATE = Object.freeze({
  calendar: { year: 660, reign: '显庆五年', month: 1, season: '春', phase: '武后参政' },
  location: '东都洛阳',
  powers: {
    timeStop: { active: false, affected: '世界万物（玩家除外）' },
    hypnosis: { enabled: true, lastTarget: '', effect: '' },
    malePregnancy: { enabled: true },
  },
  worldRules: { femaleDominant: true, malePregnancy: true },
  protagonist: { id: 'player', name: '玩家', isPlayer: true, gender: '未定', age: 21, origin: '未选择', title: '白身', office: '无', generation: 1, alive: true },
  abilities: { 学识: 10, 文采: 10, 政略: 10, 德望: 10, 人脉: 10, 体魄: 60, 家业: 10 },
  examination: { stage: '未入场', rank: '无', next: '选择出身并开始启蒙', progress: 0 },
  estate: { cash: 20, land: 0, reputation: 0, influence: 0 },
  quests: [], relations: [], spouses: [], pregnancies: [], children: [],
  historicalEvents: [], notices: [], inventory: [],
  succession: { required: false, reason: '', eligibleHeirs: [], regent: null, extinct: false, previousProtagonists: [] },
});

const text = (value, fallback = '') => typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
const number = (value, fallback = 0, min = -999999, max = 999999) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};
const objects = (value, limit = 50) => Array.isArray(value) ? value.filter(item => item && typeof item === 'object').slice(0, limit) : [];
const values = (value, limit = 50) => Array.isArray(value) ? value.slice(0, limit) : [];

export function lifeStage(age) {
  if (age < 6) return '幼年';
  if (age < 12) return '启蒙';
  if (age < ADULT_AGE) return '少年';
  return '成年';
}

function normalizePerson(person, index = 0) {
  const age = number(person?.age, 0, 0, 120);
  const alive = person?.alive !== false;
  return {
    id: text(person?.id, `person-${index + 1}`), name: text(person?.name, '未命名'), gender: text(person?.gender, '未定'),
    age, stage: lifeStage(age), alive, relationship: text(person?.relationship, '子女'), personality: text(person?.personality, '尚未定型'),
    talent: text(person?.talent, '待观察'), health: number(person?.health, 60, 0, 100), intimacy: number(person?.intimacy, 50, -100, 100),
    education: text(person?.education, '自由成长'), mentor: text(person?.mentor, '家中长辈'), marriage: text(person?.marriage, '未婚'),
    career: text(person?.career, '无'), heirEligible: alive && age >= ADULT_AGE && person?.heirEligible !== false,
  };
}

export function normalizeState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const calendar = source.calendar || {};
  const protagonist = source.protagonist || source.player || {};
  const examination = source.examination || {};
  const estate = source.estate || {};
  const powers = source.powers || {};
  const timeStop = powers.timeStop || {};
  const hypnosis = powers.hypnosis || {};
  const malePregnancy = powers.malePregnancy || {};
  const worldRules = source.worldRules || {};
  const abilitiesSource = source.abilities || source.stats || {};
  const abilities = Object.fromEntries(ABILITY_KEYS.map(key => [key, number(abilitiesSource[key], DEFAULT_STATE.abilities[key], 0, 100)]));
  const children = objects(source.children).map(normalizePerson);
  const successionSource = source.succession || {};
  const computedHeirs = children.filter(child => child.heirEligible).map(child => child.id);
  return {
    calendar: { year: number(calendar.year, 660, 600, 800), reign: text(calendar.reign, '显庆五年'), month: number(calendar.month, 1, 1, 12), season: text(calendar.season, '春'), phase: text(calendar.phase, '武后参政') },
    location: text(source.location, DEFAULT_STATE.location),
    powers: {
      timeStop: { active: Boolean(timeStop.active), affected: text(timeStop.affected, '世界万物（玩家除外）') },
      hypnosis: { enabled: hypnosis.enabled !== false, lastTarget: text(hypnosis.lastTarget), effect: text(hypnosis.effect) },
      malePregnancy: { enabled: malePregnancy.enabled !== false },
    },
    worldRules: { femaleDominant: worldRules.femaleDominant !== false, malePregnancy: worldRules.malePregnancy !== false },
    protagonist: { id: text(protagonist.id, 'player'), name: text(protagonist.name, '玩家'), isPlayer: true, gender: text(protagonist.gender, '未定'), age: number(protagonist.age, 21, 0, 120), origin: text(protagonist.origin, '未选择'), title: text(protagonist.title, '白身'), office: text(protagonist.office, '无'), generation: number(protagonist.generation, 1, 1, 99), alive: protagonist.alive !== false },
    abilities,
    examination: { stage: text(examination.stage, '未入场'), rank: text(examination.rank, '无'), next: text(examination.next, '选择出身并开始启蒙'), progress: number(examination.progress, 0, 0, 100) },
    estate: { cash: number(estate.cash, 20), land: number(estate.land, 0), reputation: number(estate.reputation, 0), influence: number(estate.influence, 0) },
    quests: objects(source.quests), relations: objects(source.relations), spouses: objects(source.spouses), pregnancies: objects(source.pregnancies), children,
    historicalEvents: objects(source.historicalEvents), notices: values(source.notices, 15), inventory: values(source.inventory, 40),
    succession: {
      required: Boolean(successionSource.required), reason: text(successionSource.reason), eligibleHeirs: values(successionSource.eligibleHeirs).length ? values(successionSource.eligibleHeirs) : computedHeirs,
      regent: successionSource.regent || null, extinct: Boolean(successionSource.extinct), previousProtagonists: objects(successionSource.previousProtagonists),
    },
  };
}

function legacyToWuzhou(legacy) {
  return normalizeState({
    protagonist: { ...(legacy.player || {}), age: 21, origin: legacy.player?.race || '旧版存档', office: '无' },
    location: legacy.location, abilities: {}, quests: legacy.quests, children: (legacy.lineage || []).map((child, index) => ({ ...child, id: `legacy-${index}`, age: 21, alive: true })),
    pregnancies: legacy.gestations, inventory: legacy.inventory, notices: ['已以只读兼容模式载入1.0存档', ...(legacy.notices || [])],
  });
}

function extractByPatterns(messages, patterns, transform = normalizeState) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const body = typeof messages[index] === 'string' ? messages[index] : messages[index]?.mes;
    if (typeof body !== 'string') continue;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const matches = [...body.matchAll(pattern)];
      for (let cursor = matches.length - 1; cursor >= 0; cursor -= 1) {
        try { return transform(JSON.parse(matches[cursor][1])); } catch { /* streamed or malformed block */ }
      }
    }
  }
  return null;
}

export function extractLatestState(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return extractByPatterns(list, WUZHOU_PATTERNS) || extractByPatterns(list, LEGACY_PATTERNS, legacyToWuzhou);
}

export function eligibleHeirs(state) {
  const normalized = normalizeState(state);
  return normalized.children.filter(child => child.alive && child.age >= ADULT_AGE && normalized.succession.eligibleHeirs.includes(child.id));
}

export function advanceStateYears(state, years) {
  const normalized = structuredClone(normalizeState(state));
  const delta = number(years, 0, 0, 80);
  normalized.calendar.year += delta;
  normalized.protagonist.age += delta;
  normalized.children = normalized.children.map(child => normalizePerson({ ...child, age: child.age + delta, heirEligible: undefined }, 0));
  normalized.succession.eligibleHeirs = normalized.children.filter(child => child.heirEligible).map(child => child.id);
  return normalized;
}

export function validateAdultOnly(state) {
  const normalized = normalizeState(state);
  const peopleById = new Map([[normalized.protagonist.id, normalized.protagonist], ...normalized.children.map(child => [child.id, child])]);
  const violations = [];
  for (const spouse of normalized.spouses) if (number(spouse.age, 0) < ADULT_AGE) violations.push(`配偶 ${text(spouse.name)} 未满${ADULT_AGE}岁`);
  for (const pregnancy of normalized.pregnancies) {
    const parent = peopleById.get(pregnancy.parentId);
    if (parent && parent.age < ADULT_AGE) violations.push(`孕育者 ${parent.name} 未满${ADULT_AGE}岁`);
  }
  return { valid: violations.length === 0, violations };
}

export function isStatePayloadText(body) {
  const value = String(body ?? '').trim();
  const nakedJson = value.startsWith('{') && value.includes('"calendar"') && value.includes('"protagonist"') && value.includes('"succession"');
  return value.startsWith('<wuzhou_state>') || value.startsWith('<breeder_state>') || /^```(?:wuzhou|breeder)/i.test(value) || nakedJson;
}

export function stripStateBlocks(body) {
  if (isStatePayloadText(body) && String(body).trim().startsWith('{')) return '';
  let result = String(body ?? '');
  for (const pattern of [...WUZHOU_PATTERNS, ...LEGACY_PATTERNS]) { pattern.lastIndex = 0; result = result.replace(pattern, ''); }
  return result.trimEnd();
}
