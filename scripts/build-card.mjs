import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'main_anypov-breeder-s-quest-forge-of-dynasties-f8722c5027c1_spec_v2.json');
const targetDirectory = resolve(root, 'character-card');
const target = resolve(targetDirectory, 'breeders-quest-community-zh.json');
const card = JSON.parse(await readFile(source, 'utf8'));
function adultOnly(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('teen adolescence', 'a fully adult form (age 21+)')
      .replaceAll('almost child-like', 'petite but unmistakably adult');
  }
  if (Array.isArray(value)) return value.map(adultOnly);
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) value[key] = adultOnly(child);
  }
  return value;
}
adultOnly(card);
const protocol = `

[Adventure panel state protocol]
After the story text in every reply, output exactly one <breeder_state> JSON block for the SillyTavern UI. Do not explain it. The JSON must be valid, use double quotes, and not use a Markdown fence. Use [] for empty lists. Keep this exact schema:
<breeder_state>{"player":{"name":"character name","race":"race","level":1,"title":"title"},"stats":{"STR":0,"DEX":0,"INT":0,"CON":0,"CHA":0,"WIS":0,"FERT":0},"location":"location","time":"game time","quests":[{"name":"quest","status":"active","progress":"0/1"}],"lineage":[{"name":"offspring","race":"hybrid race","status":"unlocked"}],"gestations":[{"parent":"gestating parent","otherParent":"other parent","remaining":"time remaining","status":"gestating"}],"inventory":["item"],"notices":["latest system notice"]}</breeder_state>
Carry state forward from the prior turn and change it only when events occur. Keep all values consistent with the narrative and prior records. Use Chinese values when the conversation is in Chinese.`;

card.data.name = '育种者任务：王朝锻炉';
card.data.character_version = '社区前端适配版 1.0.0';
card.data.post_history_instructions = `${card.data.post_history_instructions || ''}${protocol}`.trim();
card.data.post_history_instructions += '\n\n[Adult-only rule] Every player, NPC, monster, avatar, and playable offspring involved in romantic, sexual, reproductive, or nude content is an adult age 21 or older. Newly unlocked avatars manifest directly in a fully adult body. Never portray minors or minor-coded bodies in such content.';
card.data.creator_notes = `【社区版说明】已适配“王朝锻炉 · 冒险面板”SillyTavern 扩展。先安装扩展，再导入本 JSON；聊天中的状态协议会自动转换为任务、属性、血统和孕育面板。\n\n${card.data.creator_notes || ''}`;
card.data.tags = [...new Set([...(card.data.tags || []), '中文前端', 'SillyTavern扩展适配'])];

await mkdir(targetDirectory, { recursive: true });
await writeFile(target, `${JSON.stringify(card, null, 2)}\n`, 'utf8');
await copyFile(resolve(root, '育种者任务.png'), resolve(targetDirectory, 'cover.png'));
process.stdout.write(`${target}\n`);
