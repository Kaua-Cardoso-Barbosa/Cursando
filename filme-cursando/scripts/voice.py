from pathlib import Path
import json
import soundfile as sf
import numpy as np
from kokoro_onnx import Kokoro
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
options = ort.SessionOptions()
options.intra_op_num_threads = 4
session = ort.InferenceSession(str(ROOT/'models/kokoro.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
engine = Kokoro.from_session(session, str(ROOT/'models/voices.bin'))
clips = json.loads((ROOT/'audio/roteiro.json').read_text(encoding='utf-8'))
rate = 24000
out = np.zeros(rate*60, dtype=np.float32)
report = []
for i, clip in enumerate(clips):
    samples, rate = engine.create(clip['text'], voice='pf_dora', speed=1.02, lang='pt-br')
    duration = len(samples)/rate
    available = clip['end']-clip['start']-.08
    if duration > available:
        samples, rate = engine.create(clip['text'], voice='pf_dora', speed=1.02*duration/available, lang='pt-br')
    sf.write(ROOT/f'audio/voz-{i:02}.wav', samples, rate)
    start = int(clip['start']*rate)
    out[start:start+len(samples)] += samples
    report.append({**clip, 'duration': len(samples)/rate, 'voice': 'pf_dora', 'engine': 'Kokoro ONNX local'})
    print('Voice',i,round(len(samples)/rate,2),'s',flush=True)
sf.write(ROOT/'audio/narracao.wav', out, rate)
(ROOT/'audio/voz-relatorio.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
