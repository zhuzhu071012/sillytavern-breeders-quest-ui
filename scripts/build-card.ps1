$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\main_anypov-breeder-s-quest-forge-of-dynasties-f8722c5027c1_spec_v2.json'
$targetDirectory = Join-Path $PSScriptRoot '..\character-card'
$target = Join-Path $targetDirectory 'breeders-quest-community-zh.json'
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
$card = Get-Content -Raw -LiteralPath $source | ConvertFrom-Json
$protocol = @'

[Adventure panel state protocol]
After the story text in every reply, output exactly one <breeder_state> JSON block for the SillyTavern UI. Do not explain it. The JSON must be valid, use double quotes, and not use a Markdown fence. Use [] for empty lists. Keep this exact schema:
<breeder_state>{"player":{"name":"character name","race":"race","level":1,"title":"title"},"stats":{"STR":0,"DEX":0,"INT":0,"CON":0,"CHA":0,"WIS":0,"FERT":0},"location":"location","time":"game time","quests":[{"name":"quest","status":"active","progress":"0/1"}],"lineage":[{"name":"offspring","race":"hybrid race","status":"unlocked"}],"gestations":[{"parent":"gestating parent","otherParent":"other parent","remaining":"time remaining","status":"gestating"}],"inventory":["item"],"notices":["latest system notice"]}</breeder_state>
Carry state forward from the prior turn and change it only when events occur. Keep all values consistent with the narrative and prior records. Use Chinese values when the conversation is in Chinese.
'@
$card.data.name = '育种者任务：王朝锻炉'
$card.data.character_version = '社区前端适配版 1.0.0'
$card.data.post_history_instructions = (($card.data.post_history_instructions + $protocol).Trim())
$card.data.creator_notes = "【社区版说明】已适配“王朝锻炉 · 冒险面板”SillyTavern 扩展。先安装扩展，再导入本 JSON；聊天中的状态协议会自动转换为任务、属性、血统和孕育面板。`n`n" + $card.data.creator_notes
$card.data.tags = @($card.data.tags) + @('中文前端', 'SillyTavern扩展适配') | Select-Object -Unique
$card | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $target -Encoding utf8
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\育种者任务.png') -Destination (Join-Path $targetDirectory 'cover.png') -Force
Write-Output $target
