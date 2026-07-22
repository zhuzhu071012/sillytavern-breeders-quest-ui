# 神都世家：武周人生录

《神都世家》是为 SillyTavern 制作的中国古代人生与家族模拟角色卡。故事从显庆五年（660）开始，经历武后参政、二圣临朝、临朝称制、690年建立武周，直至705年神龙政变。

玩家可以读书应举、作答策问、入仕治政、经营田产、成婚育子，并培养不会瞬间长大的真实年龄后代。成年后可主动切换为后代；主角死亡后必须从成年后代中选择继承人。

> 女子参加科举是本作明确的架空改革。其他制度和历史节点尽量贴近唐至武周年代。

## 安装

在 SillyTavern 打开“扩展 → 安装扩展”，粘贴：

```text
https://github.com/zhuzhu071012/sillytavern-breeders-quest-ui
```

随后下载并直接导入 `character-card/shendu-families-wuzhou-life-v2.png`。该PNG已经内嵌完整角色卡；也可以导入同目录JSON，并用 `cover.png` 设置封面。

也可下载 `dist/sillytavern-breeders-quest-ui.zip`，解压到：

```text
SillyTavern/public/scripts/extensions/third-party/sillytavern-breeders-quest-ui/
```

确保 `manifest.json` 直接位于上述文件夹内，然后重启 SillyTavern。

## 2.0功能

- 武周古籍与宫廷风格人生面板
- 学识、文采、政略、德望、人脉、体魄、家业七项属性
- 乡贡、省试、殿前问策与具体评卷
- 官职、考课、升贬、地方治理和朝堂派系
- 现银、田产、声望与影响力
- 子女真实年龄、教育路线、师承、健康和亲密度
- 成年主动换代、死亡强制继承、摄理与绝嗣结局
- 660—705历史时间线与可改写关键节点
- `<wuzhou_state>` 2.0协议，兼容读取1.0 `<breeder_state>`

## 成人内容边界

成人亲密内容只允许发生在明确年满21岁、自愿且具有同意能力的角色之间。未成年人只会进入家庭、成长、健康与教育剧情，不允许婚姻、情色、孕育或裸露内容。

## 开发与打包

```powershell
npm run check
npm run card
npm run package
```

项目无需安装NPM依赖。状态解析和继承规则使用 Node.js 内置测试运行器验证。

## 版本

- `v2.0.2`：蓝灰书生服饰与圣光女皇意象封面
- `v2.0.1`：双主角封面，女书生居主要位置
- `v2.0.0`：《神都世家：武周人生录》
- `v1.0.0`：旧《王朝锻炉》西幻版，仅作归档

项目主页：https://github.com/zhuzhu071012/sillytavern-breeders-quest-ui
