import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLatestState, normalizeState, stripStateBlocks } from '../state-parser.js';

test('extracts the newest valid state block', () => {
  const messages = [
    { mes: '<breeder_state>{"player":{"name":"旧角色"}}</breeder_state>' },
    { mes: '正文\n<breeder_state>{"player":{"name":"洛安","level":7},"stats":{"STR":18}}</breeder_state>' },
  ];
  const state = extractLatestState(messages);
  assert.equal(state.player.name, '洛安');
  assert.equal(state.player.level, 7);
  assert.equal(state.stats.STR, 18);
});

test('ignores malformed streamed state and falls back', () => {
  const messages = [
    { mes: '```breeder-state\n{"location":"旧城"}\n```' },
    { mes: '<breeder_state>{"location":</breeder_state>' },
  ];
  assert.equal(extractLatestState(messages).location, '旧城');
});

test('normalization clamps stats and limits arrays', () => {
  const state = normalizeState({ stats: { STR: 2000, DEX: -4 }, notices: Array(30).fill('x') });
  assert.equal(state.stats.STR, 999);
  assert.equal(state.stats.DEX, 0);
  assert.equal(state.notices.length, 10);
});

test('removes protocol blocks from display text', () => {
  assert.equal(stripStateBlocks('故事正文\n<breeder_state>{"time":"夜晚"}</breeder_state>'), '故事正文');
});
