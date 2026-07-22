import { extension_settings, getContext } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';
import { DEFAULT_STATE, extractLatestState } from './state-parser.js';

const EXTENSION_NAME = 'sillytavern-breeders-quest-ui';
const EXTENSION_PATH = `scripts/extensions/third-party/${EXTENSION_NAME}`;
const DEFAULT_SETTINGS = { autoOpen: true, hideBlocks: true, accent: '#d69a55' };
const STATE_PROTOCOL = `<breeder_state>{"player":{"name":"角色名","race":"种族","level":1,"title":"称号"},"stats":{"STR":0,"DEX":0,"INT":0,"CON":0,"CHA":0,"WIS":0,"FERT":0},"location":"地点","time":"游戏时间","quests":[{"name":"任务名","status":"进行中","progress":"0/1"}],"lineage":[{"name":"后代名","race":"混血种族","status":"已解锁"}],"gestations":[{"parent":"孕育者","otherParent":"另一亲本","remaining":"剩余时间","status":"孕育中"}],"inventory":["物品"],"notices":["最新系统通知"]}</breeder_state>`;

let panel;
let latestState = DEFAULT_STATE;
let mutationObserver;
let autoOpened = false;

function settings() {
  extension_settings[EXTENSION_NAME] = { ...DEFAULT_SETTINGS, ...(extension_settings[EXTENSION_NAME] || {}) };
  return extension_settings[EXTENSION_NAME];
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function field(label, value) {
  const node = el('div', 'bq-field');
  node.append(el('span', '', label), el('strong', '', value));
  return node;
}

function section(title, emptyText, items, renderItem) {
  const root = el('section', 'bq-section');
  const heading = el('div', 'bq-section-title');
  heading.append(el('h3', '', title), el('span', 'bq-count', String(items.length)));
  root.append(heading);
  if (!items.length) root.append(el('p', 'bq-empty', emptyText));
  else items.forEach((item) => root.append(renderItem(item)));
  return root;
}

function textFrom(item, key, fallback = '—') {
  const value = item && typeof item === 'object' ? item[key] : undefined;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function render(state = latestState) {
  latestState = state || DEFAULT_STATE;
  if (!panel) return;
  const body = panel.querySelector('.bq-body');
  body.replaceChildren();

  const hero = el('section', 'bq-hero');
  const identity = el('div', 'bq-identity');
  identity.append(el('span', 'bq-eyebrow', `${latestState.player.race} · Lv.${latestState.player.level}`));
  identity.append(el('h2', '', latestState.player.name));
  identity.append(el('p', '', latestState.player.title));
  const world = el('div', 'bq-world');
  world.append(field('当前位置', latestState.location), field('世界时间', latestState.time));
  hero.append(identity, world);
  body.append(hero);

  const stats = el('section', 'bq-stats');
  const maxStat = Math.max(10, ...Object.values(latestState.stats));
  Object.entries(latestState.stats).forEach(([key, value]) => {
    const item = el('div', 'bq-stat');
    const label = el('div', 'bq-stat-label');
    label.append(el('span', '', key), el('strong', '', String(value)));
    const track = el('div', 'bq-stat-track');
    const fill = el('i', '');
    fill.style.width = `${Math.max(3, (value / maxStat) * 100)}%`;
    track.append(fill);
    item.append(label, track);
    stats.append(item);
  });
  body.append(stats);

  const grid = el('div', 'bq-grid');
  grid.append(
    section('任务日志', '尚未接取任务', latestState.quests, (item) => {
      const card = el('article', 'bq-card');
      card.append(el('strong', '', textFrom(item, 'name')), el('span', 'bq-chip', textFrom(item, 'status')));
      card.append(el('small', '', textFrom(item, 'progress', '等待更新')));
      return card;
    }),
    section('血统档案', '尚未解锁后代', latestState.lineage, (item) => {
      const card = el('article', 'bq-card');
      card.append(el('strong', '', textFrom(item, 'name')), el('span', 'bq-chip', textFrom(item, 'status')));
      card.append(el('small', '', textFrom(item, 'race')));
      return card;
    }),
    section('孕育进程', '当前没有孕育事件', latestState.gestations, (item) => {
      const card = el('article', 'bq-card bq-gestation');
      card.append(el('strong', '', `${textFrom(item, 'parent')} × ${textFrom(item, 'otherParent')}`));
      card.append(el('span', 'bq-timer', textFrom(item, 'remaining')));
      return card;
    }),
    section('系统通知', '等待第一条系统消息', latestState.notices.map((value) => ({ value })), (item) => el('div', 'bq-notice', textFrom(item, 'value'))),
  );
  body.append(grid);

  const inventory = el('section', 'bq-inventory');
  inventory.append(el('h3', '', '随身物品'));
  const items = el('div', 'bq-item-list');
  if (!latestState.inventory.length) items.append(el('span', 'bq-empty', '背包为空'));
  else latestState.inventory.forEach((item) => items.append(el('span', 'bq-item', typeof item === 'string' ? item : textFrom(item, 'name'))));
  inventory.append(items);
  body.append(inventory);
}

function createPanel() {
  panel = el('aside', 'bq-panel');
  panel.id = 'bq-panel';
  panel.setAttribute('aria-label', '王朝锻炉冒险面板');
  panel.innerHTML = `<header class="bq-header"><div><span class="bq-kicker">BREEDER'S QUEST</span><h1>王朝锻炉</h1></div><div class="bq-header-actions"><button class="bq-refresh" title="刷新状态" aria-label="刷新状态">↻</button><button class="bq-close" title="关闭面板" aria-label="关闭面板">×</button></div></header><div class="bq-body"></div><footer class="bq-footer"><button data-prompt="查看我的完整属性、遗传上限与当前状态。">查看属性</button><button data-prompt="打开任务板，列出适合我当前等级的任务。">任务板</button><button data-prompt="查看我的血统档案与所有已解锁角色。">血统谱系</button></footer>`;
  document.body.append(panel);
  panel.querySelector('.bq-close').addEventListener('click', () => panel.classList.remove('is-open'));
  panel.querySelector('.bq-refresh').addEventListener('click', refresh);
  panel.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => sendPrompt(button.dataset.prompt)));
  render();
}

function sendPrompt(text) {
  const textarea = document.querySelector('#send_textarea');
  if (!textarea) return window.toastr?.warning('未找到聊天输入框');
  textarea.value = text;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
  panel.classList.remove('is-open');
}

function refresh() {
  const context = getContext();
  const parsed = extractLatestState(context?.chat);
  render(parsed || DEFAULT_STATE);
  hideProtocolBlocks();
  if (parsed && settings().autoOpen && !autoOpened) {
    autoOpened = true;
    panel?.classList.add('is-open');
  }
}

function hideProtocolBlocks() {
  const enabled = settings().hideBlocks;
  document.querySelectorAll('#chat .mes_text').forEach((node) => {
    node.querySelectorAll('p, pre').forEach((block) => {
      const text = block.textContent.trim();
      const isProtocol = text.startsWith('<breeder_state>') || /^```(?:breeder-state|breeder_state|育种状态)/i.test(text);
      block.classList.toggle('bq-protocol-block', enabled && isProtocol);
    });
  });
}

function togglePanel(force) {
  if (!panel) createPanel();
  panel.classList.toggle('is-open', force ?? !panel.classList.contains('is-open'));
  if (panel.classList.contains('is-open')) refresh();
}

function addLauncher() {
  if (document.querySelector('#bq-launcher')) return;
  const button = el('button', 'bq-launcher', '♜');
  button.id = 'bq-launcher';
  button.title = '打开王朝锻炉冒险面板';
  button.setAttribute('aria-label', button.title);
  button.addEventListener('click', () => togglePanel());
  document.body.append(button);
}

async function copyProtocol() {
  await navigator.clipboard.writeText(STATE_PROTOCOL);
  window.toastr?.success('状态协议已复制');
}

function bindSettings() {
  const value = settings();
  $('#bq-auto-open').prop('checked', value.autoOpen).on('input', (event) => { value.autoOpen = event.target.checked; saveSettingsDebounced(); });
  $('#bq-hide-blocks').prop('checked', value.hideBlocks).on('input', (event) => { value.hideBlocks = event.target.checked; hideProtocolBlocks(); saveSettingsDebounced(); });
  $('#bq-accent').val(value.accent).on('input', (event) => { value.accent = event.target.value; document.documentElement.style.setProperty('--bq-accent', value.accent); saveSettingsDebounced(); });
  $('#bq-open-panel').on('click', () => togglePanel(true));
  $('#bq-copy-prompt').on('click', copyProtocol);
  document.documentElement.style.setProperty('--bq-accent', value.accent);
}

jQuery(async () => {
  settings();
  const html = await $.get(`${EXTENSION_PATH}/settings.html`);
  $('#extensions_settings2').append(html);
  bindSettings();
  createPanel();
  addLauncher();
  mutationObserver = new MutationObserver(() => refresh());
  const chat = document.querySelector('#chat');
  if (chat) mutationObserver.observe(chat, { childList: true, subtree: true });
  refresh();
});
