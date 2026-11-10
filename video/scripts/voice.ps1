$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$cursandoNarration = Get-Content -Encoding utf8 -LiteralPath (Join-Path $PSScriptRoot '../public/narration.json') | ConvertFrom-Json
$cursandoVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$cursandoVoice.SelectVoice('Microsoft Maria Desktop')
$cursandoVoice.Rate = 0
$cursandoVoice.Volume = 100
try {
    for ($cursandoIndex = 0; $cursandoIndex -lt $cursandoNarration.Count; $cursandoIndex++) {
        $cursandoAudioPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../public/audio/raw/voice-$cursandoIndex.wav"))
        $cursandoVoice.SetOutputToWaveFile($cursandoAudioPath)
        $cursandoVoice.Speak($cursandoNarration[$cursandoIndex].text)
    }
} finally { $cursandoVoice.Dispose() }
