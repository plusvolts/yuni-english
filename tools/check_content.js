// 콘텐츠 점검: node tools/check_content.js  (주제당 단어 50·질문 20, 주제 안 중복, 정답 인정 단어 충돌)
global.window = {}; require('../content.js'); const C = window.CONTENT;
const NEW14 = /[\u{1FAE0}-\u{1FAFF}\u{1FA70}\u{1FA7B}-\u{1FA7C}\u{1FAA9}-\u{1FAAC}\u{1FAB7}-\u{1FABA}\u{1FAC3}-\u{1FAC5}\u{1FAD7}-\u{1FAD9}\u{1F6DD}-\u{1F6DF}\u{1F7F0}\u{1FA75}-\u{1FA77}\u{1FA87}\u{1FA88}\u{1FAAD}-\u{1FAAF}\u{1FABB}-\u{1FABF}\u{1FACE}\u{1FACF}\u{1FADA}\u{1FADB}\u{1FAE8}\u{1F6DC}]/u;
let bad = 0; const err = m => { bad++; console.log('  !', m); };
for (const t of C.topics) {
  const w = t.words, q = t.questions;
  console.log(`${t.title}: 단어 ${w.length}, 질문 ${q.length}`);
  if (w.length !== 50) err(`${t.id} 단어 수 ${w.length}`);
  if (q.length !== 20) err(`${t.id} 질문 수 ${q.length}`);
  for (const f of ['en', 'ko', 'img']) { const seen = {}; w.forEach(x => { if (seen[x[f]]) err(`${t.id} ${f} 중복: ${x[f]} (${seen[x[f]]}, ${x.en})`); seen[x[f]] = x.en; }); }
  const ens = new Set(w.map(x => x.en.toLowerCase()));
  w.forEach(x => {
    if (!x.d) err(`${t.id} ${x.en} 설명 없음`);
    if (NEW14.test(x.img)) err(`${t.id} ${x.en} 새 이모지(구형 기기 안 보일 수 있음) ${x.img}`);
    (x.alt || []).forEach(a => { if (a.toLowerCase() !== x.en.toLowerCase() && ens.has(a.toLowerCase())) err(`${t.id} ${x.en} alt '${a}' 가 같은 주제 단어와 겹침`); });
  });
  q.forEach(x => { if (!x.q || !x.answer || !x.keywords || !x.keywords.length) err(`${t.id} 질문 형식: ${x.q}`); if (x.img && NEW14.test(x.img)) err(`${t.id} 질문 이모지 ${x.img}`); });
}
console.log(bad ? `문제 ${bad}개` : '콘텐츠 점검 OK');
process.exit(bad ? 1 : 0);
