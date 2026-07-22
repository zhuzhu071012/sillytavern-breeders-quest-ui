import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const coverPath = resolve(root, 'character-card/cover.png');
const jsonPath = resolve(root, 'character-card/shendu-families-wuzhou-life-v2.json');
const outputPath = resolve(root, 'character-card/shendu-families-wuzhou-life-v2.png');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0); typeBuffer.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

const image = await readFile(coverPath);
if (!image.subarray(0, 8).equals(signature)) throw new Error('cover.png is not a valid PNG');
let cursor = 8;
const chunks = [signature];
while (cursor < image.length) {
  const length = image.readUInt32BE(cursor);
  const end = cursor + 12 + length;
  const type = image.toString('ascii', cursor + 4, cursor + 8);
  if (type === 'IEND') {
    const json = await readFile(jsonPath, 'utf8');
    const payload = Buffer.from(`chara\0${Buffer.from(json, 'utf8').toString('base64')}`, 'latin1');
    chunks.push(chunk('tEXt', payload));
  }
  chunks.push(image.subarray(cursor, end));
  cursor = end;
}
await writeFile(outputPath, Buffer.concat(chunks));
process.stdout.write(`${outputPath}\n`);
