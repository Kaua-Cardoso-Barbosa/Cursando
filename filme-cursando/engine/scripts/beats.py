"""Grid medido de áudio. Downbeats são candidatos em 4/4, não detecção de compasso."""
import argparse
import json
from pathlib import Path
import librosa
import numpy as np

def analyze(filename, offset=None):
    y, sr = librosa.load(filename, sr=None, mono=True)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    beats = librosa.frames_to_time(frames, sr=sr)
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    peaks = librosa.util.peak_pick(onset, pre_max=3, post_max=3, pre_avg=3,
                                 post_avg=5, delta=0.5, wait=10)
    # O estimador não conhece o primeiro tempo musical; nunca declarar certeza.
    candidates = beats[(offset or 0)::4]
    return {"bpm": float(np.atleast_1d(tempo)[0]),
            "beats": beats.round(4).tolist(),
            "downbeat_candidates": candidates.round(4).tolist(),
            "downbeats_confirmed": offset is not None,
            "assumed_meter": "4/4",
            "hits": librosa.frames_to_time(peaks, sr=sr).round(4).tolist(),
            "duration": round(len(y)/sr, 4),
            "warning": "Inspecione o grid e confirme compasso/primeiro tempo. Voz e SFX podem confundir o detector."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input")
    parser.add_argument("--out", default="out/beats.json")
    parser.add_argument("--downbeat-offset", type=int, choices=range(4))
    options = parser.parse_args()
    result = analyze(options.input, options.downbeat_offset)
    target = Path(options.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{result['bpm']:.2f} BPM estimados; {len(result['beats'])} beats; {target}")
