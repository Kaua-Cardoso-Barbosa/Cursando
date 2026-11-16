from pathlib import Path
import json,subprocess
import numpy as np
from faster_whisper import WhisperModel

ROOT=Path(__file__).resolve().parents[1]
model=WhisperModel('base',device='cpu',compute_type='int8',cpu_threads=2,download_root=str(ROOT/'models/whisper'))
result=[]
offset=.65
for part,duration in [('parte-01.mp3',24.267688),('parte-02.mp3',32.391750)]:
 pcm=subprocess.run([str(ROOT.parent/'ferramentas/ffmpeg/bin/ffmpeg.exe'),'-v','error','-i',str(ROOT/'audio/narracao-recebida'/part),'-f','f32le','-ar','16000','-ac','1','pipe:1'],capture_output=True,check=True).stdout
 samples=np.frombuffer(pcm,dtype=np.float32)
 segments,info=model.transcribe(samples,language='pt',word_timestamps=True,beam_size=3,vad_filter=False)
 for segment in segments:
  row=dict(start=segment.start+offset,end=segment.end+offset,text=segment.text.strip(),words=[dict(start=w.start+offset,end=w.end+offset,text=w.word.strip()) for w in segment.words])
  result.append(row)
  print(f'{row["start"]:.2f}-{row["end"]:.2f} {row["text"]}',flush=True)
 offset+=duration+.22
(ROOT/'audio/alinhamento-escolar.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
