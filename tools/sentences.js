// 원어민 녹음이 필요한 영어 문장 목록을 뽑아요: node tools/sentences.js > sentences.json
// 키 규칙은 app.js en() 과 같아요 (천천히는 'slow|' 접두사)
global.window = {}; require('../content.js'); const C = window.CONTENT;
const keys = new Set(); const add = (t, slow) => { t = String(t).trim(); if (!t) return; keys.add(t); if (slow) keys.add('slow|' + t); };
const fills = [];
for (const age of ['six', 'seven', 'eight']) for (const rel of ['brother', 'sister']) fills.push(s => s.replace(/\{NAME\}/g, 'Yuni').replace('{AGE}', age).replace('{HYUN_REL}', rel));
for (const t of C.topics) {
  for (const w of t.words) add(w.en, true);
  for (const q of t.questions) {
    add(q.q, true);
    for (const f of fills) {
      const a = f(q.answer); add(a);
      const ws = a.split(' '); add(ws.slice(0, Math.max(1, Math.ceil(ws.length / 2))).join(' '));
    }
  }
}
const L = C.lines; const f0 = fills[0];
add(f0(L.hi)); add(f0(L.greet), true); add(f0(L.greetOk)); add("I'm happy!");
Object.values(L.feelings).forEach(p => p.forEach(x => add(x)));
L.praise.forEach(x => add(f0(x)));
process.stdout.write(JSON.stringify([...keys], null, 0));
