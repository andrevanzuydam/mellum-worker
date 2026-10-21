$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$env:PI_CODING_AGENT_DIR = Join-Path $root 'learn\code\profile'
$sessionDir = Join-Path ([System.IO.Path]::GetTempPath()) 'clinic-session'

$piArgs = @(
  '-p'
  '--session-id', 'clinic'
  '--session-dir', $sessionDir
  '--provider', 'llamacpp'
  '--model', 'Mellum2.1-12B-A2.5B-Thinking'
  '--no-approve'
  '--no-extensions'
  '--no-skills'
  '--no-prompt-templates'
  '--no-themes'
  '--no-context-files'
  '-e', (Join-Path $root 'extensions\mellum-worker.ts')
)

& pi @piArgs @args
exit $LASTEXITCODE
