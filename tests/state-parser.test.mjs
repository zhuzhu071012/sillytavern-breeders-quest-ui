import test from 'node:test';
import assert from 'node:assert/strict';
import { ADULT_AGE, advanceStateYears, eligibleHeirs, extractLatestState, isStatePayloadText, lifeStage, normalizeState, stripStateBlocks, validateAdultOnly } from '../state-parser.js';

const block = value => `\`\`\`wuzhou-state\n${JSON.stringify(value)}\n\`\`\``;

test('新协议优先于旧协议并读取最新有效状态', () => {
  const state = extractLatestState([
    { mes: '<breeder_state>{"player":{"name":"旧版"}}</breeder_state>' },
    { mes: block({ protagonist: { name: '裴清', age: 27 }, calendar: { year: 690, reign: '天授元年' } }) },
    { mes: '<wuzhou_state>{"calendar":</wuzhou_state>' },
  ]);
  assert.equal(state.protagonist.name, '裴清');
  assert.equal(state.calendar.year, 690);
});

test('旧协议以只读模式转换且不会崩溃', () => {
  const state = extractLatestState([{ mes: '<breeder_state>{"player":{"name":"旧角色","race":"旧种族"},"lineage":[{"name":"后代"}]}</breeder_state>' }]);
  assert.equal(state.protagonist.name, '旧角色');
  assert.equal(state.protagonist.origin, '旧种族');
  assert.match(state.notices[0], /兼容/);
});

test('年龄阶段与成年继承资格严格按21岁判定', () => {
  assert.equal(lifeStage(5), '幼年'); assert.equal(lifeStage(6), '启蒙'); assert.equal(lifeStage(12), '少年'); assert.equal(lifeStage(ADULT_AGE), '成年');
  const state = normalizeState({ children: [{ id: 'c20', name: '二十', age: 20 }, { id: 'c21', name: '二一', age: 21 }] });
  assert.deepEqual(eligibleHeirs(state).map(item => item.id), ['c21']);
});

test('事件制跳时同步主角、子女与继承名单', () => {
  const advanced = advanceStateYears({ calendar: { year: 683 }, protagonist: { age: 40 }, children: [{ id: 'c1', name: '阿宁', age: 11 }] }, 10);
  assert.equal(advanced.calendar.year, 693); assert.equal(advanced.protagonist.age, 50); assert.equal(advanced.children[0].age, 21); assert.equal(advanced.children[0].stage, '成年'); assert.deepEqual(advanced.succession.eligibleHeirs, ['c1']);
});

test('成人边界拒绝未成年配偶与未成年孕育者', () => {
  const invalid = validateAdultOnly({ protagonist: { id: 'p', age: 30 }, spouses: [{ name: '错误数据', age: 20 }], children: [{ id: 'c', name: '子女', age: 17 }], pregnancies: [{ parentId: 'c' }] });
  assert.equal(invalid.valid, false); assert.equal(invalid.violations.length, 2);
  assert.equal(validateAdultOnly({ protagonist: { id: 'p', age: 25 }, spouses: [{ name: '成年配偶', age: 21 }], pregnancies: [{ parentId: 'p' }] }).valid, true);
});

test('690与705历史节点可完整保留', () => {
  const state = normalizeState({ historicalEvents: [{ name: '武周建立', year: 690, status: '已发生', outcome: '玩家拥周' }, { name: '神龙政变', year: 705, status: '将至' }] });
  assert.deepEqual(state.historicalEvents.map(item => item.year), [690, 705]);
});

test('状态块可从消息显示文本中移除', () => {
  assert.equal(stripStateBlocks(`正文\n${block({ location: '神都' })}`), '正文');
  assert.equal(stripStateBlocks('旧正文\n<breeder_state>{"time":"夜"}</breeder_state>'), '旧正文');
  const strippedByRenderer = '{"calendar":{"year":660},"protagonist":{"name":"姓名"},"succession":{"required":false}}';
  assert.equal(isStatePayloadText(strippedByRenderer), true);
  assert.equal(stripStateBlocks(strippedByRenderer), '');
});

test('玩家身份与神通状态具有稳定默认值', () => {
  const immersive = normalizeState({});
  assert.equal(immersive.protagonist.isPlayer, true);
  assert.equal(immersive.powers.timeStop.active, false);
  assert.equal(immersive.powers.hypnosis.enabled, true);
  assert.equal(immersive.worldRules.malePregnancy, true);

  const stopped = normalizeState({ powers: { timeStop: { active: true } } });
  assert.equal(stopped.powers.timeStop.active, true);
});

test('男子孕育只校验年龄而不限制性别', () => {
  const adultMan = validateAdultOnly({
    protagonist: { id: 'player', age: 25 },
    children: [{ id: 'm1', name: '成年男子', gender: '男', age: 23 }],
    pregnancies: [{ parentId: 'm1', parentName: '成年男子', parentGender: '男' }],
  });
  assert.equal(adultMan.valid, true);

  const minorMan = validateAdultOnly({
    protagonist: { id: 'player', age: 25 },
    children: [{ id: 'm2', name: '未成年男子', gender: '男', age: 20 }],
    pregnancies: [{ parentId: 'm2', parentName: '未成年男子', parentGender: '男' }],
  });
  assert.equal(minorMan.valid, false);
});
