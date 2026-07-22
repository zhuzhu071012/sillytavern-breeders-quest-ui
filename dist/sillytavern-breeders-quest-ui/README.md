# 王朝锻炉 · SillyTavern 社区前端

为《育种者任务：王朝锻炉》角色卡制作的中文沉浸式前端。它是纯浏览器 UI 扩展：从当前聊天回复末尾的状态块读取数据，展示属性、任务、血统、孕育进程、背包和系统通知，不需要额外服务器。

## 安装

1. 在 SillyTavern 打开“扩展 → 安装扩展”，粘贴 `https://github.com/zhuzhu071012/sillytavern-breeders-quest-ui`。
2. 或把 `sillytavern-breeders-quest-ui` 文件夹复制到 `public/scripts/extensions/third-party/`，重启 SillyTavern。
3. 导入 `character-card/breeders-quest-community-zh.json`，并可用同目录 `cover.png` 作为封面。
4. 开始新聊天。右下角的棋子按钮可打开冒险面板。

`dist/sillytavern-breeders-quest-ui.zip` 是可分发扩展包，`dist/character-card/` 是角色卡与配图。

## 使用说明

- “查看属性 / 任务板 / 血统谱系”会把建议指令填入输入框，不会自动发送。
- 模型必须保留回复末尾的 `<breeder_state>` 状态块，面板才能实时更新。
- 若模型输出了损坏的 JSON，前端会继续显示上一个有效状态；下一回合通常会自行恢复。
- 设置页可关闭状态块隐藏、修改强调色或关闭自动打开选项。

## 社区发布建议

发布时同时提供扩展仓库地址、角色卡 JSON、封面 PNG 和本说明。第三方扩展拥有页面脚本权限，使用者应只从可信仓库安装；本扩展不发起网络请求，也不上传聊天内容。

项目主页：https://github.com/zhuzhu071012/sillytavern-breeders-quest-ui

## 兼容性

面向当前 SillyTavern 第三方 UI 扩展结构，使用原生 JavaScript/CSS，无构建依赖。角色卡仍是 `chara_card_v2`，不安装扩展也能作为普通角色卡使用，只是不会显示独立面板。
