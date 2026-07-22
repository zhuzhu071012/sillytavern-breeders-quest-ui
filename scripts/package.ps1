$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'sillytavern-breeders-quest-ui'
if (Test-Path $dist) { Remove-Item -LiteralPath $dist -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
@('manifest.json','index.js','state-parser.js','style.css','settings.html','README.md','LICENSE') | ForEach-Object {
  Copy-Item -LiteralPath (Join-Path $root $_) -Destination $stage
}
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath (Join-Path $dist 'sillytavern-breeders-quest-ui.zip')
Copy-Item -LiteralPath (Join-Path $root 'character-card') -Destination $dist -Recurse
Write-Output $dist
