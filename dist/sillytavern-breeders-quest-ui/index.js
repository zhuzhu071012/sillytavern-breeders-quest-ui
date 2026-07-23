import { extension_settings, getContext } from '../../../extensions.js';
import { eventSource, event_types, extension_prompt_types, saveSettingsDebounced, setExtensionPrompt } from '../../../../script.js';
import { ABILITY_KEYS, ADULT_AGE, DEFAULT_STATE, eligibleHeirs, extractLatestState, isStatePayloadText } from './state-parser.js';

const EXTENSION_NAME = 'sillytavern-breeders-quest-ui';
const EXTENSION_PATH = `scripts/extensions/third-party/${EXTENSION_NAME}`;
const DEFAULT_SETTINGS = { autoOpen: true, hideBlocks: true, promptReminder: true, accent: '#a83b32' };
const PROMPT_KEY = 'shendu-wuzhou-state-reminder';
const STATE_PROTOCOL = ['```wuzhou-state', '{"calendar":{"year":660,"reign":"显庆五年","month":1,"season":"春","phase":"武后参政"},"location":"东都洛阳","gameplay":{"mode":"沉浸人生","immersion":100},"powers":{"timeStop":{"active":false,"affected":"世界万物（玩家除外）"},"hypnosis":{"enabled":true,"lastTarget":"","effect":""},"malePregnancy":{"enabled":true}},"worldRules":{"femaleDominant":true,"malePregnancy":true},"protagonist":{"id":"player","name":"玩家","isPlayer":true,"gender":"未定","age":21,"origin":"寒门","title":"白身","office":"无","generation":1,"alive":true},"abilities":{"学识":10,"文采":10,"政略":10,"德望":10,"人脉":10,"体魄":60,"家业":10},"examination":{"stage":"未入场","rank":"无","next":"乡贡","progress":0},"estate":{"cash":20,"land":0,"reputation":0,"influence":0},"quests":[],"relations":[],"spouses":[],"pregnancies":[],"children":[],"historicalEvents":[],"notices":[],"inventory":[],"succession":{"required":false,"reason":"","eligibleHeirs":[],"regent":null,"extinct":false,"previousProtagonists":[]}}', '```'].join('\n');
const TABS = [
  ['overview', '总览'], ['powers', '神通'], ['exam', '科举'], ['career', '仕途'], ['family', '家族'], ['children', '子女'], ['relations', '关系'], ['history', '史事'],
];

let panel;
let latestState = DEFAULT_STATE;
let activeTab = 'overview';
let autoOpened = false;
let statusWarning = '';
let refreshTimers = [];

function settings() {
  extension_settings[EXTENSION_NAME] = { ...DEFAULT_SETTINGS, ...(extension_settings[EXTENSION_NAME] || {}) };
  return extension_settings[EXTENSION_NAME];
}
function node(tag, className = '', content) { const element = document.createElement(tag); element.className = className; if (content !== undefined) element.textContent = content; return element; }
function safe(item, key, fallback = '—') { const value = item?.[key]; return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback; }
function metric(label, value) { const root = node('div', 'ss-metric'); root.append(node('span', '', label), node('strong', '', String(value))); return root; }
function empty(text) { return node('p', 'ss-empty', text); }
function card(title, subtitle, badge) { const root = node('article', 'ss-card'); const top = node('div', 'ss-card-top'); top.append(node('strong', '', title)); if (badge) top.append(node('span', 'ss-badge', badge)); root.append(top); if (subtitle) root.append(node('small', '', subtitle)); return root; }
function section(title, items, renderer, emptyText = '暂无记录') { const root = node('section', 'ss-section'); const head = node('div', 'ss-section-head'); head.append(node('h3', '', title), node('span', 'ss-count', String(items.length))); root.append(head); if (!items.length) root.append(empty(emptyText)); else items.forEach(item => root.append(renderer(item))); return root; }

function overviewView(state) {
  const root = node('div', 'ss-view ss-overview');
  const hero = node('section', 'ss-hero');
  const identity = node('div');
  identity.append(node('span', 'ss-kicker', `第${state.protagonist.generation}代 · ${state.protagonist.origin}`));
  identity.append(node('h2', '', state.protagonist.name));
  identity.append(node('p', '', `玩家化身 · ${state.protagonist.age}岁 · ${state.protagonist.title} · ${state.protagonist.office}`));
  const time = node('div', 'ss-time-seal'); time.append(node('strong', '', state.calendar.reign), node('span', '', `${state.calendar.year}年 · ${state.calendar.season}${state.calendar.month}月`), node('small', '', state.calendar.phase));
  hero.append(identity, time); root.append(hero);
  const abilities = node('section', 'ss-abilities');
  ABILITY_KEYS.forEach(key => { const item = node('div', 'ss-ability'); const label = node('div'); label.append(node('span', '', key), node('b', '', state.abilities[key])); const track = node('i'); const fill = node('em'); fill.style.width = `${state.abilities[key]}%`; track.append(fill); item.append(label, track); abilities.append(item); });
  root.append(abilities);
  const metrics = node('div', 'ss-metrics'); metrics.append(metric('现银', `${state.estate.cash}贯`), metric('田产', `${state.estate.land}亩`), metric('声望', state.estate.reputation), metric('朝野影响', state.estate.influence)); root.append(metrics);
  root.append(
    section('当前要事', state.quests, item => card(safe(item, 'name'), safe(item, 'progress'), safe(item, 'status'))),
    section('系统记事', state.notices.map(text => ({ text })), item => card(safe(item, 'text')), '暂无系统记事'),
  );
  return root;
}

function powersView(state) {
  const root = node('div', 'ss-view');
  const mode = node('section', 'ss-power-hero');
  mode.append(node('span', 'ss-kicker', 'PLAY STYLE'), node('h2', '', state.gameplay.mode), node('p', '', state.gameplay.mode === '纵情沙盒' ? '神通低摩擦，随心探索、改写与玩乐；世界仍记录你的行动结果。' : '以身份、时间与关系的连续性沉浸体验一生，神通仅在你主动使用时生效。'));
  const switchMode = node('button', 'ss-power-action', state.gameplay.mode === '纵情沙盒' ? '切换为沉浸人生' : '切换为纵情沙盒');
  switchMode.addEventListener('click', () => queuePrompt(state.gameplay.mode === '纵情沙盒' ? '从现在起切换为“沉浸人生”模式。保留当前状态，但恢复严格的时代因果、身份限制、资源消耗与社会反应，并更新 gameplay。' : '从现在起切换为“纵情沙盒”模式。保留当前状态，让我可以低摩擦地使用神通、探索和改写时代，并更新 gameplay。'));
  mode.append(switchMode); root.append(mode);

  const powers = [
    {
      title: '时停',
      badge: state.powers.timeStop.active ? '已冻结' : '流动中',
      text: state.powers.timeStop.active ? '除玩家外的世界万物停滞，年月不得推进。' : '可令除玩家外的世界停止，直至主动恢复。',
      action: state.powers.timeStop.active ? '恢复时间' : '发动时停',
      prompt: state.powers.timeStop.active ? '我解除时停。让世界从冻结的同一瞬间恢复流动，结算我在时停中留下的变化，并将 powers.timeStop.active 更新为 false。' : '我发动时停。除我之外的世界万物立即冻结；时停期间年月、年龄和妊娠月份都不得推进，并将 powers.timeStop.active 更新为 true。',
    },
    {
      title: '催眠',
      badge: state.powers.hypnosis.enabled ? '可用' : '关闭',
      text: state.powers.hypnosis.lastTarget ? `最近目标：${state.powers.hypnosis.lastTarget} · ${state.powers.hypnosis.effect || '效果待定'}` : '可影响成年目标的认知、记忆与行动倾向；不能替代亲密同意。',
      action: '施展催眠',
      prompt: '我要对一名明确年满21岁的目标施展催眠。先让我填写目标、希望影响的认知／记忆／行动倾向及持续时间；催眠不得被解释为亲密同意，并在施展后更新 powers.hypnosis。',
    },
    {
      title: '男子孕育',
      badge: state.powers.malePregnancy.enabled ? '已开启' : '关闭',
      text: '可使明确年满21岁的男子受孕；按月记录孕程，孩子出生年龄为0。',
      action: '指定孕育',
      prompt: '我要使用“男子孕育”神通。先让我指定一名明确年满21岁的男子与另一位同样年满21岁的生育相关角色，并确认孕育设定；成立后加入 pregnancies，按月推进且不得让孩子即时成年。',
    },
  ];
  root.append(section('玩家神通', powers, power => {
    const item = card(power.title, power.text, power.badge);
    const button = node('button', 'ss-inline-action', power.action);
    button.addEventListener('click', () => queuePrompt(power.prompt));
    item.append(button);
    return item;
  }));
  return root;
}

function examView(state) {
  const root = node('div', 'ss-view');
  const scroll = node('section', 'ss-exam-scroll');
  scroll.append(node('span', 'ss-kicker', '贡举案卷'), node('h2', '', state.examination.stage), node('p', '', `当前名次：${state.examination.rank}`));
  const progress = node('div', 'ss-progress'); const fill = node('i'); fill.style.width = `${state.examination.progress}%`; progress.append(fill); scroll.append(progress, node('strong', '', `下一步：${state.examination.next}`));
  root.append(scroll);
  root.append(section('备考与试务', state.quests.filter(item => /试|学|策|诗|贡/.test(`${safe(item, 'name')} ${safe(item, 'type', '')}`)), item => card(safe(item, 'name'), safe(item, 'progress'), safe(item, 'status')), '尚未开始备考'));
  return root;
}

function careerView(state) {
  const root = node('div', 'ss-view');
  root.append(section('仕途履历', state.succession.previousProtagonists.concat([{ name: state.protagonist.name, office: state.protagonist.office, title: state.protagonist.title }]), item => card(safe(item, 'office', safe(item, 'title')), safe(item, 'name'), safe(item, 'status', '在任'))));
  root.append(section('政务与差遣', state.quests.filter(item => !/试|学|策|诗|贡/.test(`${safe(item, 'name')} ${safe(item, 'type', '')}`)), item => card(safe(item, 'name'), safe(item, 'progress'), safe(item, 'status')), '当前无官府差遣'));
  return root;
}

function familyView(state) {
  const root = node('div', 'ss-view');
  root.append(section('婚姻', state.spouses, item => card(safe(item, 'name'), `${safe(item, 'age')}岁 · ${safe(item, 'relationship', '配偶')}`, safe(item, 'status', '婚姻存续')), '尚未成婚'));
  root.append(section('孕育', state.pregnancies, item => card(safe(item, 'parentName'), safe(item, 'remaining'), safe(item, 'status', '孕育中')), '当前无孕育记录'));
  const inventory = section('家藏与随身', state.inventory.map(value => typeof value === 'string' ? { name: value } : value), item => card(safe(item, 'name')), '家藏尚空'); root.append(inventory);
  return root;
}

function childView(state) {
  const root = node('div', 'ss-view');
  root.append(section('子女培养', state.children, child => {
    const item = card(child.name, `${child.age}岁 · ${child.stage} · ${child.personality}`, child.alive ? child.education : '已故');
    const details = node('div', 'ss-child-details'); details.append(node('span', '', `天赋：${child.talent}`), node('span', '', `师承：${child.mentor}`), node('span', '', `健康：${child.health}`), node('span', '', `亲密：${child.intimacy}`)); item.append(details);
    const ageProgress = node('div', 'ss-progress slim'); const fill = node('i'); fill.style.width = `${Math.min(100, child.age / ADULT_AGE * 100)}%`; ageProgress.append(fill); item.append(ageProgress, node('small', '', child.age >= ADULT_AGE ? '已成年，可列入继承' : `距成年尚有 ${ADULT_AGE - child.age} 年`));
    if (child.heirEligible) { const button = node('button', 'ss-inline-action', '传位此人'); button.addEventListener('click', () => queuePrompt(`我决定将主角身份不可逆地传给成年后代“${child.name}”（ID: ${child.id}）。请结算交接、保存族谱与家产，并从其视角继续。`)); item.append(button); }
    return item;
  }, '尚无子女'));
  return root;
}

function relationView(state) { const root = node('div', 'ss-view'); root.append(section('人物关系', state.relations, item => card(safe(item, 'name'), safe(item, 'role'), `${safe(item, 'attitude', '中立')} · ${safe(item, 'score', 0)}`), '尚未结识重要人物')); return root; }
function historyView(state) { const root = node('div', 'ss-view'); root.append(section('时代大事', state.historicalEvents, item => card(safe(item, 'name'), `${safe(item, 'year', state.calendar.year)}年 · ${safe(item, 'outcome', '尚待发展')}`, safe(item, 'status', '将至')), '史册尚待落笔')); return root; }

function render() {
  if (!panel) return;
  const body = panel.querySelector('.ss-body'); body.replaceChildren();
  if (statusWarning) body.append(node('div', 'ss-sync-warning', statusWarning));
  const views = { overview: overviewView, powers: powersView, exam: examView, career: careerView, family: familyView, children: childView, relations: relationView, history: historyView };
  body.append((views[activeTab] || overviewView)(latestState));
  panel.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === activeTab));
  renderSuccession();
}

function renderSuccession() {
  panel.querySelector('.ss-succession')?.remove();
  if (!latestState.succession.required) return;
  const modal = node('div', 'ss-succession'); const paper = node('div', 'ss-succession-paper');
  paper.append(node('span', 'ss-kicker', '家主身故 · 必择继承'), node('h2', '', latestState.succession.extinct ? '宗脉断绝' : '择立新主'), node('p', '', latestState.succession.reason || '前代人生已终，请从成年后代中选择继承人。'));
  const heirs = eligibleHeirs(latestState);
  if (heirs.length) heirs.forEach(heir => { const button = node('button', 'ss-heir'); button.append(node('strong', '', heir.name), node('span', '', `${heir.age}岁 · ${heir.education} · ${heir.career}`)); button.addEventListener('click', () => queuePrompt(`前代主角已经死亡。我选择成年继承人“${heir.name}”（ID: ${heir.id}）继承全部家产、关系与族谱，请完成强制换代并继续。`)); paper.append(button); });
  else if (latestState.succession.regent) paper.append(node('p', 'ss-warning', `暂无成年后代，由${safe(latestState.succession.regent, 'name', '宗亲')}摄理。请推进至最近继承人成年。`));
  else paper.append(node('p', 'ss-warning', '没有合法继承人，家族断绝。请回退聊天分支或从最近存档重选。'));
  modal.append(paper); panel.append(modal);
}

function createPanel() {
  panel = node('aside', 'ss-panel'); panel.id = 'ss-panel'; panel.setAttribute('aria-label', '武周人生面板');
  const header = node('header', 'ss-header'); const title = node('div'); title.append(node('span', 'ss-kicker', 'A LIFE IN WU ZHOU'), node('h1', '', '武周人生'), node('small', '', '玩家化身 · 双模式'));
  const actions = node('div', 'ss-header-actions'); const refreshButton = node('button', '', '↻'); refreshButton.title = '刷新'; refreshButton.addEventListener('click', refresh); const close = node('button', '', '×'); close.title = '关闭'; close.addEventListener('click', () => { if (!latestState.succession.required) panel.classList.remove('is-open'); }); actions.append(refreshButton, close); header.append(title, actions);
  const tabs = node('nav', 'ss-tabs'); TABS.forEach(([id, label]) => { const button = node('button', '', label); button.dataset.tab = id; button.addEventListener('click', () => { activeTab = id; render(); }); tabs.append(button); });
  const body = node('div', 'ss-body');
  const footer = node('footer', 'ss-footer'); [['温书备考','请根据我的科举阶段安排一段备考，并给出一道需要我作答的经义、诗赋或策问题。'],['查看朝局','请呈现当前朝局、重大历史节点、各派关系及我能够介入的机会。'],['发动时停','我发动时停。除我之外的世界万物立即冻结，年月不得推进，并更新神通状态。'],['施展催眠','我要对一名明确年满21岁的目标施展催眠。先让我指定目标、影响内容与持续时间；催眠不构成亲密同意。'],['男子孕育','我要使用男子孕育神通。先让我指定所有明确年满21岁的相关角色，再按月记录孕育。'],['教养子女','请列出每名子女的年龄、天赋、教育方针，并触发合适的培养事件。'],['整理族谱','请完整列出历代主角、配偶、子女、婚配、事业与继承资格。']].forEach(([label,prompt]) => { const button = node('button','',label); button.addEventListener('click',()=>queuePrompt(prompt)); footer.append(button); });
  panel.append(header, tabs, body, footer); document.body.append(panel); render();
}

function queuePrompt(message) { const textarea = document.querySelector('#send_textarea'); if (!textarea) return window.toastr?.warning('未找到聊天输入框'); textarea.value = message; textarea.dispatchEvent(new Event('input', { bubbles: true })); textarea.focus(); if (!latestState.succession.required) panel.classList.remove('is-open'); }
function updatePromptReminder(hasState) {
  if (!hasState || !settings().promptReminder) return setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.IN_PROMPT, 0);
  const snapshot = JSON.stringify(latestState).slice(0, 12000);
  const reminder = `【武周人生状态同步】以下是上一回合已验证状态：${snapshot}\n本回合必须根据实际剧情更新它，并在正文末尾输出且只输出一个标记为 wuzhou-state 的有效JSON代码块。必须保留 gameplay、powers 与 worldRules，不得照抄已发生变化的字段，不得省略顶层字段，代码块后不得追加文字。`;
  setExtensionPrompt(PROMPT_KEY, reminder, extension_prompt_types.IN_PROMPT, 0, false);
}
function refresh({ expectUpdate = false } = {}) {
  const chat = getContext()?.chat || [];
  const newestState = extractLatestState(chat.length ? [chat.at(-1)] : []);
  const parsed = newestState || extractLatestState(chat);
  if (parsed) latestState = parsed;
  else latestState = DEFAULT_STATE;
  statusWarning = expectUpdate && !newestState ? '最新回复未包含有效状态，面板暂时保留上一回合数据。请点击“重试同步”，或要求模型补发状态。' : '';
  updatePromptReminder(Boolean(parsed));
  hideStateBlocks(); render(); placeLauncher();
  if ((parsed && settings().autoOpen && !autoOpened) || latestState.succession.required) { autoOpened = true; panel?.classList.add('is-open'); }
}
function scheduleRefresh(expectUpdate = false) {
  refreshTimers.forEach(clearTimeout);
  refreshTimers = [0, 120, 500, 1200].map((delay, index, delays) => setTimeout(() => refresh({ expectUpdate: expectUpdate && index === delays.length - 1 }), delay));
}
function hideStateBlocks() {
  document.querySelectorAll('#chat .mes_text p, #chat .mes_text pre, #chat .mes_text .code-block, #chat .mes_text .codeblock, #chat .mes_text .mes_code').forEach(block => {
    block.classList.toggle('ss-protocol-block', settings().hideBlocks && isStatePayloadText(block.textContent));
  });
}
function placeLauncher() {
  const row = document.querySelector('#ss-launcher-row');
  if (!row) return;
  const messages = [...document.querySelectorAll('#chat .mes[is_user="false"]')].filter(message => message.getAttribute('is_system') !== 'true');
  const target = messages.at(-1)?.querySelector('.mes_text');
  row.hidden = !target;
  if (target && (row.parentElement !== target.parentElement || row.previousElementSibling !== target)) target.insertAdjacentElement('afterend', row);
}
function addLauncher() {
  const row = node('div', 'ss-launcher-row'); row.id = 'ss-launcher-row';
  const button = node('button', 'ss-launcher', '周'); button.id = 'ss-launcher'; button.title = '打开武周人生玩家面板'; button.setAttribute('aria-label', button.title);
  button.addEventListener('click', () => { if (latestState.succession.required) panel.classList.add('is-open'); else panel.classList.toggle('is-open'); if (panel.classList.contains('is-open')) refresh(); });
  row.append(button); row.hidden = true; document.body.append(row); placeLauncher();
}
async function copyProtocol() { await navigator.clipboard.writeText(STATE_PROTOCOL); window.toastr?.success('武周状态协议已复制'); }
function bindSettings() { const value = settings(); $('#ss-auto-open').prop('checked', value.autoOpen).on('input', event => { value.autoOpen = event.target.checked; saveSettingsDebounced(); }); $('#ss-hide-blocks').prop('checked', value.hideBlocks).on('input', event => { value.hideBlocks = event.target.checked; hideStateBlocks(); saveSettingsDebounced(); }); $('#ss-prompt-reminder').prop('checked', value.promptReminder).on('input', event => { value.promptReminder = event.target.checked; updatePromptReminder(latestState !== DEFAULT_STATE); saveSettingsDebounced(); }); $('#ss-accent').val(value.accent).on('input', event => { value.accent = event.target.value; document.documentElement.style.setProperty('--ss-accent', value.accent); saveSettingsDebounced(); }); $('#ss-open-panel').on('click', () => { panel.classList.add('is-open'); refresh(); }); $('#ss-copy-protocol').on('click', copyProtocol); $('#ss-retry-sync').on('click', () => { queuePrompt('请不要推进剧情，只根据刚才已经发生的内容补发一个完整、有效、已更新的 wuzhou-state JSON代码块。'); }); document.documentElement.style.setProperty('--ss-accent', value.accent); }

jQuery(async () => {
  settings(); $('#extensions_settings2').append(await $.get(`${EXTENSION_PATH}/settings.html`)); bindSettings(); createPanel(); addLauncher();
  const chat = document.querySelector('#chat'); if (chat) new MutationObserver(() => scheduleRefresh(false)).observe(chat, { childList: true, subtree: true });
  [event_types.MESSAGE_RECEIVED, event_types.CHARACTER_MESSAGE_RENDERED, event_types.GENERATION_ENDED, event_types.MESSAGE_SWIPED, event_types.MESSAGE_UPDATED, event_types.MESSAGE_EDITED].forEach(type => eventSource.on(type, () => { placeLauncher(); scheduleRefresh(true); }));
  [event_types.CHAT_CHANGED, event_types.MESSAGE_DELETED].forEach(type => eventSource.on(type, () => { autoOpened = false; statusWarning = ''; scheduleRefresh(false); }));
  scheduleRefresh(false);
});
