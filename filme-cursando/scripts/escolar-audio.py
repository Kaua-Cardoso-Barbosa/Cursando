from pathlib import Path
import subprocess
import numpy as np
import soundfile as sf
ROOT=Path(__file__).resolve().parents[1]
ff=ROOT.parent/'ferramentas/ffmpeg/bin/ffmpeg.exe'
rate=48000
mix=np.zeros(rate*60,dtype=np.float32)
for name,start in [('parte-01.mp3',.65),('parte-02.mp3',25.137688)]:
 pcm=subprocess.run([str(ff),'-v','error','-i',str(ROOT/'audio/narracao-recebida'/name),'-af','highpass=f=70','-f','f32le','-ar',str(rate),'-ac','1','pipe:1'],capture_output=True,check=True).stdout
 samples=np.frombuffer(pcm,dtype=np.float32).copy()
 active=samples[np.abs(samples)>.015]
 rms=np.sqrt(np.mean(active**2)) if len(active) else .1
 gain=min(.14/max(rms,.001),.85/max(float(np.max(np.abs(samples))),.001))
 samples*=gain
 n=min(240,len(samples)//2)
 samples[:n]*=np.linspace(0,1,n);samples[-n:]*=np.linspace(1,0,n)
 i=round(start*rate);mix[i:i+len(samples)]+=samples
sf.write(ROOT/'audio/narracao-escolar.wav',mix,rate)
print('Narracao unida: 60s, 48kHz; originais preservados.')
