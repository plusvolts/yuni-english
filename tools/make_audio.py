# 원어민 녹음 만들기 (녹음이 없는 문장만):
#   node tools/sentences.js > /tmp/sentences.json
#   python3 tools/make_audio.py /tmp/sentences.json <kokoro-v1.0.onnx> <voices-v1.0.bin>
# Kokoro v1.0 (Apache-2.0), 목소리 af_heart, 보통 0.92 / 천천히 0.72, mp3 24kHz 48kbps, 앞뒤 무음 정리
import sys, json, hashlib, os, subprocess, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro
from kokoro_onnx.tokenizer import Tokenizer

AUD = os.path.join(os.path.dirname(__file__), '..', 'audio')
keys = json.load(open(sys.argv[1]))
idx_path = os.path.join(AUD, 'index.json')
idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
todo = [k for k in keys if k not in idx or not os.path.exists(os.path.join(AUD, idx[k]))]
print('전체', len(keys), '/ 새로 만들 것', len(todo), flush=True)
kok = Kokoro(sys.argv[2], sys.argv[3]); tok = Tokenizer()
# 한국 이름 발음 보정 (음소 치환)
FIX = [('jˈuːnhuː', 'ˈʌnhuː'), ('kˈɔːɹɑːk', 'ʧˈoʊɹoʊk'), ('hˈaɪʌn', 'hjˈʌn')]
done = 0
for k in todo:
    slow = k.startswith('slow|'); text = k[5:] if slow else k
    ph = tok.phonemize(text, 'en-us')
    for a, b in FIX: ph = ph.replace(a, b)
    samples, sr = kok.create(ph, voice='af_heart', speed=0.72 if slow else 0.92, is_phonemes=True)
    fn = hashlib.md5(k.encode()).hexdigest()[:12] + '.mp3'
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, samples, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af',
                        'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=40',
                        '-ar', '24000', '-ac', '1', '-b:a', '48k', os.path.join(AUD, fn)], check=True)
    idx[k] = fn; done += 1
    if done % 50 == 0:
        json.dump(idx, open(idx_path, 'w'), ensure_ascii=False, indent=0); print(done, flush=True)
# 쓰지 않는 녹음은 목록에서 빼요 (파일도 정리)
used = {k: idx[k] for k in keys if k in idx}
for f in set(idx.values()) - set(used.values()):
    try: os.remove(os.path.join(AUD, f))
    except OSError: pass
json.dump(used, open(idx_path, 'w'), ensure_ascii=False, indent=0)
print('완료', done, '/ index', len(used))
