// 한국어 녹음이 필요한 문장 목록 (공통 65번): node tools/ko_sentences.js > tools/ko_sentences.json
// key = app.js ko()가 받는 글을 koSentences()와 똑같이 문장(. ! ?)으로 나눈 것(공백 정리), say = 실제로 읽을 글
// app.js·content.js의 한국어 문장을 고치면 이 파일도 맞추고 tools/make_ko_audio.py로 녹음을 다시 만들어요
global.window = {}; require('../content.js'); const C = window.CONTENT;
const koKey = t => String(t).replace(/\s+/g, ' ').trim();
const koSentences = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
const sayOf = k => koKey(k.replace(/\p{Extended_Pictographic}|️|‍/gu, '').replace(/['"‘’“”\[\]()]/g, '').replace(/·/g, ', ').replace(/:/g, ','));
const out = new Map();
const add = t => { if (!t) return; const all = koSentences(t).map(koKey); for (const k of all) if (k && !out.has(k) && /[가-힣]/.test(k)) out.set(k, sayOf(k)); };
// 1) app.js 고정 문장
['오늘 영어는 여기까지! 정말 잘했어요.', '목표 달성! 아빠에게 보여줘요!', '인사해 볼까?', '새 단어를 배워요!', '다시 해볼까?',
  '잘 듣고 그림을 골라요', '잘 듣고 뜻을 골라요', '정답을 따라 말해 봐', '한 번 더 따라 해봐', '잘 듣고 따라 말해요', '첫 글자 힌트!',
  '이렇게 시작해 봐', '가족이 물어봐요. 영어로 대답해요!', '오늘의 단어 노래! 따라 불러봐요!',
  // 파닉스 (v1.11.0)
  '파닉스! 글자 소리를 배워요', '글자를 누르면 소리가 나요', '어떤 글자 소리일까? 잘 듣고 골라요', '소리를 합쳐 볼까? 글자를 하나씩 누른 다음, 합치기!', '무슨 단어일까? 잘 듣고 골라요', '파닉스 끝! 정말 잘했어요',
  '딱정벌레! 딱딱한 날개를 가진 곤충이야. 오늘 영어 끝! 정말 잘했어, 윤이야.'].forEach(add);
// actMsg: 이모지를 뺀 글
add('복습할 단어가 아직 없어요! 바로 새 단어로 가요 🚀'.replace(/[^\p{L}\p{N}\s!?.]/gu, ''));
// 2) 틀이 있는 문장
['인사', '복습', '새 단어', '말하기', '대화'].forEach(n => add(`다음은 ${n}!`));
for (const s of ['스티커도 받았어!', '내일 또 만나!']) add(`오늘 영어 끝! 정말 잘했어, 윤이야. ${s}`);
for (const tp of C.topics) add(`${tp.title} 주제를 끝내면 받을 수 있어요`);
const fam = Object.values(C.family).map(f => f.name); // 가족 (v1.11.0)
for (const n of fam) { add(`${n}: 고마워!`); add(`${n}한테 알려줄래?`); }
// 3) 단어 뜻·설명
for (const tp of C.topics) for (const w of tp.words) {
  add(w.ko); add(`${w.ko}!`);
  const d = w.d || (C.wordDesc || {})[w.en]; if (d) add(d);
  add(`'${w.ko}'는 영어로 뭐야?`);
}
// 파닉스 (v1.11.0): 글자 소리 설명, 보기 단어·합치기 단어의 뜻
const P = C.phonics || { letters: [], families: [] };
for (const lt of P.letters) { add(`이 글자는 '${lt.snd}' 소리가 나요`); add(lt.ko); add(`${lt.ko}!`); add(`'${lt.ko}'는 영어로 뭐야?`); }
for (const f of P.families) for (const w of f.words) { add(w.ko); add(`${w.ko}!`); add(`'${w.ko}'는 영어로 뭐야?`); }
process.stdout.write(JSON.stringify([...out].map(([key, say]) => (say === key ? { key } : { key, say })), null, 0));
