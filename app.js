/* 윤이 영어 — 앱 로직 (의존성 없음) */
(() => {
  'use strict';
  const APP_VERSION = '1.7.0';
  const C = window.CONTENT;
  const T = C.topics;
  const DAYS = 10;
  const STEPS = [
    { id: 'greet', name: '인사', icon: '👋' },
    { id: 'review', name: '복습', icon: '🔁' },
    { id: 'new', name: '새 단어', icon: '✨' },
    { id: 'speak', name: '말하기', icon: '🗣️' },
    { id: 'talk', name: '대화', icon: '💬' },
  ];
  const KEY = 'yuni-english-v1';
  const $app = document.getElementById('app');

  /* ================= 저장소 ================= */
  function defaults() {
    return {
      settings: { parentPin: '1234', robotName: '로보', childName: 'Yuni', age: 'seven', hyunRel: 'brother', dailyLimit: 20, voice: 'native', koVoice: '', koVoiceMode: 'rec', koRate: 0.9, goalStars: 50, goalText: '아빠와 약속한 선물' },
      pos: { t: 0, d: 1, s: 0 }, done: {}, stars: 0, goalBase: 0,
      srs: {}, days: [], log: {}, stickers: {}, override: '', rewards: [],
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = defaults(); const o = JSON.parse(raw); return Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) }); }
    } catch (e) { /* 저장소 사용 불가 */ }
    return defaults();
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  /* ================= 날짜 ================= */
  const pad = n => String(n).padStart(2, '0');
  const ymd = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const today = () => ymd(new Date());
  const addDays = (n, from) => { const d = from ? new Date(from + 'T12:00:00') : new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  function todayLog() { const k = today(); S.log[k] = S.log[k] || { sec: 0, stars: 0 }; return S.log[k]; }
  function streak() {
    const set = new Set(S.days); let n = 0; let d = today();
    if (!set.has(d)) d = addDays(-1);
    while (set.has(d)) { n++; d = addDays(-1, d); }
    return n;
  }

  /* ================= 유틸 ================= */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fill = s => String(s).replace(/\{NAME\}/g, S.settings.childName).replace('{AGE}', S.settings.age).replace('{HYUN_REL}', S.settings.hyunRel);
  const wkey = (t, w) => `${t}:${w.en}`;
  function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }
  // 이모지가 여러 개(예: 🐜🐞)면 칸에 들어가게 조금 작게
  const emojiCount = t => { try { return [...new Intl.Segmenter().segment(t)].length; } catch (e) { return 1; } };
  const picHtml = w => w.photo ? `<img src="${esc(w.photo)}" alt="${esc(w.en)}">` : emojiCount(w.img) > 1 ? `<span class="multi">${esc(w.img)}</span>` : esc(w.img);
  const friendHtml = (id, lg) => { const f = C.friends[id]; return `<div class="friend${lg ? ' lg' : ''}" style="background:${f.color}">${esc(f.name)}</div>`; };
  const robotName = () => S.settings.robotName || '로보';

  /* ================= 소리 ================= */
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const koVoices = () => voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  function voiceFor(lang) {
    if (lang === 'ko-KR') {
      const ks = koVoices();
      const chosen = S.settings.koVoice && ks.find(v => v.voiceURI === S.settings.koVoice || v.name === S.settings.koVoice);
      // 아빠가 고른 목소리 → 구글(자연스러움) → 삼성 → 아무 한국어 목소리
      return chosen || ks.find(v => /google/i.test(v.name)) || ks.find(v => /samsung/i.test(v.name)) || ks[0] || null;
    }
    const cands = voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase()));
    return cands.find(v => /google/i.test(v.name)) || cands.find(v => /samsung/i.test(v.name)) || cands[0] || null;
  }
  let sayToken = 0;
  function speak(text, lang, rate) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || !text) return resolve();
      const my = sayToken;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate; u.pitch = 1.0;
      const v = voiceFor(lang); if (v) u.voice = v;
      let done = false; const fin = () => { if (!done) { done = true; resolve(my === sayToken); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1500 + text.length * (lang === 'ko-KR' ? 180 : 110) / rate);
      try { speechSynthesis.speak(u); } catch (e) { fin(); }
    });
  }
  /* 원어민 녹음 (audio 폴더). 녹음이 없는 문장은 기기 음성으로 읽어요 */
  let AUD = window.__AUDIO_INLINE || {};
  if (!window.__AUDIO_INLINE) fetch('audio/index.json').then(r => r.json()).then(j => { AUD = j; }).catch(() => {});
  let curAudio = null;
  function playClip(src) {
    return new Promise(resolve => {
      let done = false; const fin = ok => { if (!done) { done = true; resolve(ok); } };
      try {
        const a = new Audio(src); curAudio = a;
        a.onended = () => fin(true); a.onerror = () => fin(false);
        a.play().catch(() => fin(false));
        setTimeout(() => fin(true), 15000);
      } catch (e) { fin(false); }
    });
  }
  async function en(t, slow) {
    const k = (slow ? 'slow|' : '') + String(t).trim();
    if (S.settings.voice !== 'device' && AUD[k]) {
      const my = sayToken;
      const src = AUD[k].startsWith('data:') ? AUD[k] : 'audio/' + AUD[k];
      if (await playClip(src)) return;
      if (my !== sayToken) return;
    }
    return speak(t, 'en-US', slow ? 0.7 : 0.95);
  }
  // 기기 음성(녹음이 없을 때): 문장부호마다 짧게 끊어서, 조금 천천히 읽어요 (긴 문장이 뭉개지지 않게)
  async function speakDevice(t, rate) {
    const parts = String(t).split(/(?<=[.!?,])\s+/).map(x => x.trim()).filter(Boolean);
    const my = sayToken;
    for (let i = 0; i < parts.length; i++) {
      if (my !== sayToken) return;
      await speak(parts[i], 'ko-KR', rate);
      if (i < parts.length - 1) await sleep(120);
    }
  }
  /* ================= 한국어 녹음 재생 (공통 65번) — 세 앱 같은 코드 (plan/0_COMMON_spec.md 5-2) =================
     audio-ko/index.json = { "문장": "파일.mp3" } (tools/make_ko_audio.py로 만든 Supertonic 3 목소리 6, 속도 보통).
     ko(t): ① 전체 문장 녹음이 있으면 재생 ② 없으면 문장(. ! ?) 단위로 나눠 녹음이 있는 문장은 재생, 없는 문장만 기기 음성
     아빠 화면 설정 koVoiceMode: 'rec'(녹음 목소리, 기본) | 'device'(기기 음성). 속도 설정 koRate는 녹음에도 적용(0.9 = 보통) */
  let KO_IDX = null; let koAudio = null; let koDone = null; let koChain = Promise.resolve();
  const koKey = t => String(t).replace(/\s+/g, ' ').trim();
  fetch('audio-ko/index.json').then(r => (r.ok ? r.json() : {})).then(j => { KO_IDX = j || {}; }).catch(() => { KO_IDX = {}; });
  const koRec = t => (S.settings.koVoiceMode !== 'device' && KO_IDX && KO_IDX[koKey(t)]) || null;
  const koSentences = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
  function koStop() { const d = koDone; if (koAudio) { try { koAudio.pause(); } catch (e) { /* */ } koAudio = null; } if (d) d(false); }
  // 국어 앱: 녹음도 기기 음성처럼 차례로 재생해요(재생 중에 새 말이 오면 끝난 뒤에). hush()가 sayToken을 올리고 koStop()으로 모두 멈춰요.
  // (받아쓰기 정답 뒤 낱말 읽기 + "은후: 고마워!"처럼 겹칠 때 앞 재생이 끊겨 다음 문제로 안 넘어가던 문제 방지)
  function playKo(file, rate) {
    const my = sayToken;
    const p = koChain.then(() => (my !== sayToken ? false : new Promise(resolve => {
      const a = new Audio('audio-ko/' + file); koAudio = a;
      a.playbackRate = Math.max(0.7, Math.min(1.3, (Number(rate) || 0.9) / 0.9));
      let fin = false;
      const done = ok => { if (fin) return; fin = true; if (koAudio === a) koAudio = null; if (koDone === done) koDone = null; resolve(ok); };
      koDone = done;
      a.onended = () => done(true); a.onerror = () => done(false);
      a.play().catch(() => done(false));
      setTimeout(() => done(true), 20000); // 끝 신호가 안 와도 다음 말이 막히지 않게
    })));
    koChain = p.catch(() => false); return p;
  }
  async function ko(t) {
    if (window.__KO_LOG) window.__KO_LOG.push(String(t)); // 테스트·문장 수집용
    const my = sayToken; const rate = Number(S.settings.koRate) || 0.9;
    const whole = koRec(t);
    if (whole) { if (await playKo(whole, rate)) return; if (my !== sayToken) return; }
    const parts = koSentences(t);
    for (let i = 0; i < parts.length; i++) {
      if (my !== sayToken) return;
      const f = koRec(parts[i]);
      if (!(f && await playKo(f, rate))) { if (my !== sayToken) return; await speakDevice(parts[i], rate); }
      if (i < parts.length - 1) await sleep(120);
    }
  }
  function hush() { sayToken++; koStop(); try { speechSynthesis.cancel(); } catch (e) { /* */ } if (curAudio) { try { curAudio.pause(); } catch (e) { /* */ } curAudio = null; } }
  const LINES = C.lines || {};
  const praise = () => fill(pick(LINES.praise || ['Great job!']));

  let actx = null;
  function tone(freqs, dur) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(); const g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        const t0 = actx.currentTime + i * dur;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      });
    } catch (e) { /* */ }
  }
  const ding = () => tone([880, 1320], 0.14);
  const boop = () => tone([300, 220], 0.16);

  /* ================= 음성 인식 ================= */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let micDenied = false;
  let rec = null;
  const canListen = () => !!SR && !micDenied;
  function recognize() {
    return new Promise(resolve => {
      const alts = [];
      let r;
      try { r = new SR(); } catch (e) { return resolve(alts); }
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
      r.onresult = e => { for (const res of e.results) for (let i = 0; i < res.length; i++) alts.push(res[i].transcript); };
      r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') micDenied = true; };
      let fin = false; const end = () => { if (fin) return; fin = true; clearTimeout(guard); if (rec === r) rec = null; resolve(alts); };
      r.onend = end;
      const guard = setTimeout(() => { try { r.abort(); } catch (e) { /* */ } end(); }, 9000); // 응답 없을 때 안전장치
      rec = r;
      try { r.start(); } catch (e) { end(); }
    });
  }
  function stopRec() { if (rec) { try { rec.stop(); } catch (e) { /* */ } } }
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function matches(alts, keywords) {
    const kws = keywords.map(norm).filter(Boolean);
    for (const alt of alts) {
      const n = norm(alt); if (!n) continue;
      const padded = ` ${n} `; const words = n.split(' ');
      for (const k of kws) {
        if (padded.includes(` ${k} `)) return true;
        if (k.length >= 4) {
          const tol = Math.floor(k.length / 4);
          if (!k.includes(' ') && words.some(w => lev(w, k) <= tol)) return true;
          if (k.includes(' ') && lev(n, k) <= tol) return true;
        }
      }
    }
    return false;
  }
  const wordKeywords = w => [w.en, w.en + 's', ...(w.alt || [])];

  /* ================= 화면 관리 ================= */
  let H = {}; // 현재 화면의 버튼 핸들러
  let screen = '';
  let actToken = 0;
  function render(name, html, handlers) {
    screen = name; hush(); stopRec(); actToken++; clearTimeout(talkTimer); if (typeof beat === 'function' && name !== 'reward') beat(false);
    document.querySelectorAll('.confetti,.feedback').forEach(x => x.remove());
    $app.innerHTML = html; H = handlers || {}; window.scrollTo(0, 0);
  }
  $app.addEventListener('click', e => {
    const say = e.target.closest('[data-say]');
    if (say) { e.stopPropagation(); hush(); ko(say.dataset.say); return; }
    const b = e.target.closest('[data-act]');
    if (b && H[b.dataset.act]) H[b.dataset.act](b.dataset.arg, b, e);
  });

  /* ================= 잠금 (시간 제한) ================= */
  function lockReason() {
    if (S.override === today()) return '';
    if (todayLog().sec >= Number(S.settings.dailyLimit) * 60) return 'time';
    return '';
  }
  function lockedScreen(reason) {
    render('locked', `<div class="screen"><div class="reward">
      <div class="robot">😴</div>
      <div class="bubble">오늘 영어는 여기까지! 정말 잘했어요.
      <small>${esc(robotName())}도 이제 쉬러 가요</small></div>
      <div class="home-links"><button class="btn" data-act="home">처음으로</button><button class="btn small" data-act="parent">아빠 화면</button></div>
    </div></div>`, { home: homeScreen, parent: () => gateScreen(parentScreen) });
    ko('오늘 영어는 여기까지! 정말 잘했어요.');
  }
  setInterval(() => {
    if (screen === 'lesson' && !document.hidden) { todayLog().sec += 10; save(); }
  }, 10000);

  /* ================= 홈 ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (screen === 'home') homeScreen(); });

  function posLabel() {
    const { t, d, s } = S.pos; const tp = T[t];
    return `${tp.icon} ${tp.title} ${d}일차 · ${STEPS[s].name}${s > 0 ? '부터 이어하기' : ''}`;
  }
  function homeScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const pct = Math.min(100, Math.round(g / goal * 100));
    const st = streak();
    render('home', `<div class="screen">
      <div class="topbar">
        <div class="stars">⭐ ${S.stars}</div>
        ${st ? `<div class="stars">🔥 ${st}일 연속</div>` : ''}
        <div class="spacer"></div>
        ${installEvt ? '<button class="btn small" data-act="install">📲 앱 설치</button>' : ''}
        <button class="icon-btn" data-act="parent" aria-label="아빠 화면">⚙️</button>
      </div>
      <div class="home-main">
        <div class="bubble">안녕, ${esc(S.settings.childName)}!<small>나는 ${esc(robotName())}야. 오늘도 영어 놀이 하자!</small></div>
        <div class="robot" data-act="hello">🤖</div>
        <div class="friends">${Object.keys(C.friends).map(id => friendHtml(id)).join('')}</div>
        <button class="btn primary go-btn" data-act="go">오늘 영어<small>${esc(posLabel())}</small></button>
        <div class="home-links">
          <button class="btn" data-act="picker">🧭 단계 고르기</button>
          <button class="btn" data-act="stickers">📒 스티커북</button>
        </div>
        <button class="goal card" data-act="rewards" style="text-align:left"><div class="row"><b>🎁 ${esc(S.settings.goalText)}</b><div class="spacer"></div><span class="muted">${g >= goal ? '달성! 🎉' : `${g} / ${goal}`}</span></div>
          <div class="goal-bar"><i style="width:${pct}%"></i></div>
          <div class="row" style="margin-top:8px"><span class="muted">받은 보상 ${S.rewards.length}개${rwCount().left ? ` · 안 쓴 보상 ${rwCount().left}개` : ''}</span><div class="spacer"></div><span class="muted">보상 목록 보기 ›</span></div></button>
      </div>
    </div>`, {
      go: () => startLesson(S.pos.t, S.pos.d, S.pos.s),
      picker: () => pickerScreen('topics'),
      stickers: stickerScreen,
      rewards: rewardScreen,
      parent: () => gateScreen(parentScreen),
      hello: () => { hush(); en(fill(LINES.hi || 'Hi, {NAME}!')); },
      install: async () => { if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* */ } installEvt = null; homeScreen(); } },
    });
  }

  /* ================= 단계 고르기 ================= */
  const doneCount = t => { let n = 0; for (let d = 1; d <= DAYS; d++) if (S.done[`${t}-${d}`]) n++; return n; };
  function parseCode(code) {
    const m = String(code).trim().match(/^(\d{1,2})\s*-\s*(\d{1,2})(?:\s*-\s*(\d))?$/);
    if (!m) return null;
    const t = +m[1] - 1, d = +m[2], s = m[3] ? +m[3] - 1 : 0;
    if (t < 0 || t >= T.length || d < 1 || d > DAYS || s < 0 || s >= STEPS.length) return null;
    return { t, d, s };
  }
  function pickerScreen(level, t, d) {
    let body = '';
    if (level === 'topics') {
      body = `<h2 class="title">어떤 주제를 할까?</h2>
        <div class="grid">${T.map((tp, i) => `<button class="tile${tp.fav ? ' fav' : ''}${S.pos.t === i ? ' now' : ''}" data-act="topic" data-arg="${i}">
          <span class="em">${tp.icon}</span><b>${i + 1}. ${esc(tp.title)}</b><small>${doneCount(i)} / ${DAYS}일</small></button>`).join('')}</div>
        <div class="card code-row"><b>진도 코드</b><input id="code" inputmode="numeric" placeholder="예: 4-3"><button class="btn small primary" data-act="code">바로 가기</button>
          <span class="muted">주제-일차(-단계). 다른 기기에서 하던 곳부터 시작해요.</span></div>`;
    } else if (level === 'days') {
      const tp = T[t];
      body = `<h2 class="title">${tp.icon} ${esc(tp.title)} — 며칠째 할까?</h2>
        <div class="days">${Array.from({ length: DAYS }, (_, i) => i + 1).map(dd => `<button class="day${S.done[`${t}-${dd}`] ? ' done' : ''}${S.pos.t === t && S.pos.d === dd ? ' now' : ''}" data-act="day" data-arg="${dd}">${dd}</button>`).join('')}</div>`;
    } else {
      const tp = T[t];
      body = `<h2 class="title">${tp.icon} ${esc(tp.title)} ${d}일차 — 어디부터 할까?</h2>
        <div class="steps">${STEPS.map((st, i) => `<button class="tile" data-act="step" data-arg="${i}"><span class="em">${st.icon}</span><b>${i + 1}. ${st.name}</b></button>`).join('')}</div>`;
    }
    render('picker', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="뒤로">⬅️</button><div class="spacer"></div><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button></div>
      ${body}</div>`, {
      back: () => level === 'topics' ? homeScreen() : level === 'days' ? pickerScreen('topics') : pickerScreen('days', t),
      home: homeScreen,
      topic: a => pickerScreen('days', +a),
      day: a => pickerScreen('steps', t, +a),
      step: a => startLesson(t, d, +a),
      code: () => { const p = parseCode(document.getElementById('code').value); if (!p) return toast('예: 4-3 처럼 적어주세요'); startLesson(p.t, p.d, p.s); },
    });
  }

  /* ================= 받은 보상 ================= */
  // 보상마다 used: 사용한 날짜(YYYY-MM-DD) 또는 없음. 아빠 화면에서 체크하면 윤이 보상 목록에도 사용완료로 보여요 (공통 v2026-09)
  function rwCount() { const n = S.rewards.length, u = S.rewards.filter(r => r.used).length; return { n, u, left: n - u }; }
  function rwHeadText() { const c = rwCount(); return `받은 보상 ${c.n}개 · 안 쓴 보상 ${c.left}개 · 사용완료 ${c.u}개`; }
  function rwSummary() { const c = rwCount(); return `아직 안 쓴 보상 ${c.left}개 · 사용완료 ${c.u}개`; }
  function rewardScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const list = S.rewards.slice().reverse();
    render('rewards', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">🎁 받은 보상</h2></div>
      <div class="card goal" style="width:100%"><div class="row"><b>지금 목표: ${esc(S.settings.goalText)}</b><div class="spacer"></div><span class="muted">${Math.min(g, goal)} / ${goal}</span></div>
        <div class="goal-bar"><i style="width:${Math.min(100, Math.round(g / goal * 100))}%"></i></div>
        ${g >= goal ? '<p style="margin:10px 0 0;font-weight:800">목표 달성! 아빠에게 보여줘요 🎉</p>' : `<p class="muted" style="margin:10px 0 0">별 ${goal - g}개만 더 모으면 돼요!</p>`}</div>
      ${list.length ? `<p class="muted" style="margin:0;font-weight:800">${rwSummary()}</p>` : ''}
      ${list.length ? `<div class="grid">${list.map((r, i) => `<div class="tile${r.used ? ' used' : ''}"><span class="em">${r.used ? '✅' : '🎁'}</span><b>${esc(r.text)}</b><small>${esc(r.date)} · 별 ${r.stars}개</small><small>${list.length - i}번째 보상</small><span class="rw-tag${r.used ? ' done' : ''}">${r.used ? `사용완료 · ${esc(r.used)}` : '아직 안 썼어요'}</span></div>`).join('')}</div>`
        : '<p class="muted">아직 받은 보상이 없어요. 별을 모아서 첫 보상을 받아봐요!</p>'}
    </div>`, { home: homeScreen });
    if (g >= goal) ko('목표 달성! 아빠에게 보여줘요!');
  }

  /* ================= 스티커북 ================= */
  function stickerScreen() {
    render('stickers', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">📒 스티커북</h2></div>
      <div class="grid">${T.map((tp, i) => `<button class="tile${S.stickers[i] ? '' : ' locked'}" data-act="st" data-arg="${i}">
        <span class="em">${S.stickers[i] ? tp.sticker : '❔'}</span><b>${esc(tp.title)}</b><small>${doneCount(i)} / ${DAYS}일</small></button>`).join('')}</div>
      <p class="muted">주제 하나를 10일 모두 끝내면 스티커를 받아요. 스티커를 누르면 단어를 다시 들을 수 있어요.</p>
    </div>`, {
      home: homeScreen,
      st: async a => {
        const tp = T[+a];
        if (!S.stickers[+a]) { hush(); ko(`${tp.title} 주제를 끝내면 받을 수 있어요`); return; }
        hush(); const my = sayToken;
        for (const w of tp.words) { if (my !== sayToken) break; await en(w.en); }
      },
    });
  }

  /* ================= 수업 만들기 ================= */
  /* 하루 = 새 단어 5개(목록 순서대로) + 앞 일차 단어 복습 3개, 새 질문 2개 + 앞 질문 복습 1개 */
  const NEW_PER_DAY = 5, OLD_PER_DAY = 3, Q_PER_DAY = 2;
  // 약한 단어가 먼저 (틀린 적 많음·아직 안 봄 → 높은 점수, "알아요" → 낮은 점수)
  const weakScore = (t, w) => { const r = S.srs[wkey(t, w)]; return r ? (r.mastered ? -5 : 0) + r.wrong * 2 - r.streak - (r.seen > 3 ? 1 : 0) : 1; };
  function newWords(t, d) {
    const ws = T[t].words;
    const part = ws.slice((d - 1) * NEW_PER_DAY, d * NEW_PER_DAY);
    if (part.length) return part;
    // 단어가 모자라면(아빠가 줄였을 때): 약한 단어 먼저, 나머지는 섞어서
    return shuffle(ws).sort((a, b) => weakScore(t, b) - weakScore(t, a)).slice(0, NEW_PER_DAY);
  }
  // 앞 일차에 배운 단어 중 복습할 것 (같은 주제 우선, 1일차면 앞 주제에서)
  function oldWords(t, d, today5) {
    const skip = new Set(today5.map(w => w.en));
    let pool = T[t].words.slice(0, (d - 1) * NEW_PER_DAY).filter(w => !skip.has(w.en)).map(w => ({ t, w }));
    if (!pool.length) pool = learnedWords().filter(x => x.t !== t);
    return shuffle(pool).sort((a, b) => weakScore(b.t, b.w) - weakScore(a.t, a.w)).slice(0, OLD_PER_DAY);
  }
  function dayQuestions(t, d) {
    const qs = T[t].questions; const out = [];
    for (let i = 0; i < Q_PER_DAY; i++) { const k = (d - 1) * Q_PER_DAY + i; out.push({ t, q: qs[k] || qs[k % qs.length] }); }
    // 복습 질문 1개: 같은 주제 앞 일차 → 없으면 앞 주제
    const earlier = qs.slice(0, Math.min(qs.length, (d - 1) * Q_PER_DAY)).filter(q => !out.some(o => o.q === q));
    if (earlier.length) out.push({ t, q: pick(earlier) });
    else if (t > 0) { const pt = Math.floor(Math.random() * t); out.push({ t: pt, q: pick(T[pt].questions) }); }
    return out;
  }
  function dueReviews() {
    const td = today();
    return Object.entries(S.srs).filter(([, r]) => r.due && r.due <= td).sort((a, b) => a[1].due.localeCompare(b[1].due)).slice(0, 3)
      .map(([k]) => { const i = k.indexOf(':'); const t = +k.slice(0, i); const w = T[t] && T[t].words.find(x => x.en === k.slice(i + 1)); return w ? { t, w } : null; }).filter(Boolean);
  }
  function learnedWords() {
    return Object.entries(S.srs).filter(([, r]) => r.learned).map(([k]) => { const i = k.indexOf(':'); const t = +k.slice(0, i); const w = T[t] && T[t].words.find(x => x.en === k.slice(i + 1)); return w ? { t, w } : null; }).filter(Boolean);
  }
  // 같은 날 같은 단계는 한 번 만든 문제를 그대로 써요 (◀ 이전 버튼으로 돌아가도 같은 문제)
  function buildStep(t, d, s) {
    if (L && L.t === t && L.d === d && L.built) { if (!L.built[s]) L.built[s] = makeStep(t, d, s); return L.built[s]; }
    return makeStep(t, d, s);
  }
  function makeStep(t, d, s) {
    const id = STEPS[s].id;
    if (id === 'greet') return [{ type: 'greet' }];
    if (id === 'review') {
      let items = dueReviews();
      if (!items.length) items = shuffle(learnedWords()).slice(0, 2);
      if (!items.length) return [{ type: 'msg', text: '복습할 단어가 아직 없어요! 바로 새 단어로 가요 🚀' }];
      return items.map(x => ({ type: 'pick-pic', t: x.t, w: x.w, review: true }));
    }
    if (id === 'new') {
      // 새 단어 소개 → 새 단어 + 앞 일차 단어 섞어서 퀴즈
      const intros = L.words.map(w => ({ type: 'intro', t, w }));
      const items = L.words.map(w => ({ t, w })).concat(L.old.map(x => ({ t: x.t, w: x.w, old: true })));
      const quiz = shuffle(items).map((x, i) => ({ type: i % 2 ? 'pick-ko' : 'pick-pic', t: x.t, w: x.w, old: x.old }));
      return intros.concat(quiz);
    }
    if (id === 'speak') {
      // 새 단어 5개 + 앞 일차 단어 2개. 처음 두 개는 따라 말하기
      const items = shuffle(L.words.map(w => ({ t, w }))).concat(L.old.slice(0, 2).map(x => ({ t: x.t, w: x.w, old: true })));
      const ordered = items.slice(0, 2).concat(shuffle(items.slice(2)));
      return ordered.map((x, i) => ({ type: i < 2 ? 'repeat' : 'say-en', t: x.t, w: x.w, old: x.old, friend: i >= 2 && Math.random() < 0.5 ? pick(['hyun', 'chorok']) : null }));
    }
    // talk: 오늘의 새 질문 2개 + 복습 질문 1개
    return dayQuestions(t, d).map(x => ({ type: 'talk', t: x.t, q: x.q }));
  }

  /* ================= 수업 진행 ================= */
  let L = null;
  function startLesson(t, d, s) {
    const lr = lockReason(); if (lr) return lockedScreen(lr);
    if (!(t >= 0 && t < T.length)) t = 0;
    S.pos = { t, d, s }; if (!S.days.includes(today())) S.days.push(today()); save();
    L = { t, d, s, acts: [], i: 0, earned: 0, heardKo: {}, awarded: {}, words: newWords(t, d), built: {} };
    L.old = oldWords(t, d, L.words);
    L.acts = buildStep(t, d, s);
    showAct();
  }
  function stepIntro() {
    const st = STEPS[L.s];
    render('lesson', `<div class="screen"><div class="reward"><div class="robot">${st.icon}</div><div class="bubble">다음은 ${st.name}!</div></div></div>`);
    const my = actToken;
    ko(`다음은 ${st.name}!`).then(() => sleep(300)).then(() => { if (my === actToken) showAct(); });
  }
  function nextAct() {
    L.i++;
    if (L.i < L.acts.length) return showAct();
    // 단계 끝
    L.s++; S.pos.s = L.s; save();
    if (L.s >= STEPS.length) return finishDay();
    const lr = lockReason(); if (lr) return lockedScreen(lr);
    L.acts = buildStep(L.t, L.d, L.s); L.i = 0;
    stepIntro();
  }
  // 별: 몇 번 만에 맞히든 윤이가 스스로 정답을 넣으면 1개, 못 맞히고 넘어가면 0개 (v1.6.1 공통 64번)
  // 문제당 한 번만, 하루 끝 보너스 3개, 하루치(날짜 기준) 합계 50개 이하 (v1.4.0: 20 → 50, 세 앱 공통)
  const DAY_STAR_MAX = 50, DAY_BONUS = 3;
  function award(solved) {
    const key = `${L.s}:${L.i}`;
    let n = solved ? 1 : 0;
    if (L.awarded[key] || todayLog().stars >= DAY_STAR_MAX - DAY_BONUS) n = 0; // 이전 버튼으로 다시 풀어도 별은 한 번만
    L.awarded[key] = 1;
    if (n) {
      S.stars += n; L.earned += n; todayLog().stars += n; save();
      const el = document.querySelector('.stars'); if (el) el.textContent = `⭐ ${S.stars}`;
    }
    return n;
  }
  function mark(t, w, correct, isReview) {
    const k = wkey(t, w); const r = S.srs[k] || (S.srs[k] = { streak: 0, due: null, wrong: 0, seen: 0, learned: null, mastered: false });
    r.seen++;
    if (!correct) { r.wrong++; r.streak = 0; r.mastered = false; r.due = addDays(1); }
    else {
      if (!r.learned) r.learned = today();
      if (isReview && r.due && r.due <= today()) {
        r.streak++;
        if (r.streak >= 3) { r.mastered = true; r.due = null; } else r.due = addDays(r.streak === 1 ? 3 : 7);
      }
    }
    save();
  }
  function flash(emoji) { const f = document.createElement('div'); f.className = 'feedback'; f.innerHTML = `<span>${emoji}</span>`; document.body.appendChild(f); setTimeout(() => f.remove(), 950); }

  function lessonFrame(inner, opts = {}) {
    const total = L.acts.length; const p = Math.round(L.i / total * 100);
    return `<div class="screen">
      <div class="topbar">
        <button class="icon-btn" data-act="quit" aria-label="처음으로">🏠</button>
        <button class="icon-btn" data-act="prev" aria-label="이전 문제"${L.s === 0 && L.i === 0 ? ' disabled style="opacity:.35"' : ''}>◀</button>
        <div class="train">${STEPS.map((st, i) => `<div class="car${i < L.s ? ' done' : i === L.s ? ' now' : ''}" style="--p:${p}%">${i === L.s ? '<i></i>' : ''}</div>`).join('')}</div>
        <div class="stars">⭐ ${S.stars}</div>
      </div>
      <div class="step-name">${T[L.t].icon} ${esc(T[L.t].title)} ${L.d}일차 · ${STEPS[L.s].name}</div>
      <div class="stage${opts.split ? ' split' : ''}">${inner}</div>
    </div>`;
  }
  const baseHandlers = () => ({ quit: homeScreen, prev: prevAct });
  // 이전 문제로 (단계 첫 문제면 앞 단계의 마지막 문제로)
  function prevAct() {
    hush();
    let s = L.s, i = L.i, acts = L.acts;
    do {
      if (i > 0) i--;
      else if (s > 0) { s--; acts = buildStep(L.t, L.d, s); i = acts.length - 1; }
      else return;
    } while (acts[i].type === 'msg' && (i > 0 || s > 0));
    if (acts[i].type === 'msg') return;
    L.s = s; L.i = i; L.acts = acts; S.pos.s = s; save();
    showAct();
  }

  function showAct() {
    const a = L.acts[L.i];
    ({ greet: actGreet, msg: actMsg, intro: actIntro, 'pick-pic': actPickPic, 'pick-ko': actPickKo, repeat: actRepeat, 'say-en': actSayEn, talk: actTalk })[a.type](a);
  }

  function actMsg(a) {
    render('lesson', lessonFrame(`<div class="prompt"><div class="robot">🤖</div><div class="bubble">${esc(a.text)}</div></div>
      <div class="next-row"><button class="btn primary" data-act="next">좋아요 ▶</button></div>`), { ...baseHandlers(), next: nextAct });
    const my = actToken; ko(a.text.replace(/[^\p{L}\p{N}\s!?.]/gu, '')).then(() => sleep(600)).then(() => { if (my === actToken) nextAct(); });
  }

  function actGreet() {
    const q = fill(LINES.greet || 'Hi, {NAME}! How are you today?'); const FL = LINES.feelings || {}; let greeted = false;
    const feels = [['😊', 'happy'], ['🤩', 'great'], ['😴', 'sleepy'], ['😋', 'hungry'], ['😢', 'sad']];
    render('lesson', lessonFrame(`<div class="prompt">
        <div class="say"><span class="who">🤖</span><span class="text">${esc(q)}</span></div>
        <div class="listen-row"><button class="listen" data-act="play" aria-label="다시 듣기">🔊</button></div>
      </div>
      <div class="prompt">
        ${micBlock()}
        <div class="feelings">${feels.map(([e, w]) => `<button class="choice" data-act="feel" data-arg="${w}">${e}</button>`).join('')}</div>
        <div class="muted">말하기 어려우면 기분을 눌러도 돼요</div>
      </div>`, { split: true }), {
      ...baseHandlers(),
      play: () => { hush(); en(q); },
      feel: async w => { if (greeted) return; greeted = true; hush(); const my = actToken; const fl = FL[w] || [`I'm ${w}!`, "Let's get started!"]; await en(fl[0]); if (my !== actToken) return; ding(); flash(award(true) ? '⭐' : '👍'); await en(fl[1]); if (my === actToken) nextAct(); },
      ...micHandlers(['happy', 'good', 'fine', 'great', 'sleepy', 'hungry', 'sad', 'okay', 'ok', 'tired', 'angry', 'excited'], async (ok, alts) => {
        const my = actToken;
        if (greeted) return;
        if (ok) {
          greeted = true; ding(); flash(award(true) ? '⭐' : '👍');
          const said = (alts || []).join(' ').toLowerCase(); const key = Object.keys(FL).find(k => said.includes(k));
          await en(key ? FL[key][1] : fill(LINES.greetOk || "Great! Let's get started!")); if (my === actToken) nextAct();
        }
        else { setHint('“I\'m happy!” 처럼 말해봐요'); await en("I'm happy!"); }
      }),
    });
    const my = actToken; ko('인사해 볼까?').then(() => my === actToken && en(q));
  }

  function actIntro(a) {
    const w = a.w; const idx = L.acts.filter(x => x.type === 'intro').indexOf(a) + 1; const n = L.acts.filter(x => x.type === 'intro').length;
    render('lesson', lessonFrame(`<div class="prompt">
        <div class="pic">${picHtml(w)}</div>
        <div class="word">${esc(w.en)}</div>
        <div class="ko">${esc(w.ko)}</div>
        <div class="listen-row"><button class="listen" data-act="play" aria-label="듣기">🔊</button><button class="listen slow" data-act="slow" aria-label="천천히 듣기">🐢</button></div>
      </div>
      <div class="next-row"><span class="muted">새 단어 ${idx} / ${n}</span><button class="btn primary" data-act="next">다음 ▶</button></div>`), {
      ...baseHandlers(),
      play: () => { hush(); en(w.en); },
      slow: () => { hush(); en(w.en, true); },
      next: nextAct,
    });
    const my = actToken;
    (async () => {
      if (idx === 1) { await ko('새 단어를 배워요!'); }
      if (my !== actToken) return; await en(w.en);
      if (my !== actToken) return; await ko(w.ko);
      if (my !== actToken) return; await en(w.en);
    })();
  }

  function choiceSet(t, w, n) {
    const others = shuffle(T[t].words.filter(x => x.en !== w.en && x.img !== w.img && x.ko !== w.ko)).slice(0, n - 1);
    return shuffle([w, ...others]);
  }
  function pickHandlers(a, attemptsRef) {
    const w = a.w;
    return async (arg, btn) => {
      if (btn.classList.contains('wrong') || document.querySelector('.choice.right')) return;
      hush(); const my = actToken;
      if (arg === w.en) {
        btn.classList.add('right'); ding();
        const n = award(true); flash(n ? '⭐' : '👍'); // 다시 골라 맞혀도 별 1개 (공통 64)
        mark(a.t, w, attemptsRef.n === 0, a.review);
        await en(w.en); if (my === actToken && n && Math.random() < 0.5) await en(praise()); await sleep(300); if (my === actToken) nextAct();
      } else {
        attemptsRef.n++; boop(); btn.classList.add('wrong');
        document.querySelectorAll('.choice').forEach(c => { if (c.dataset.arg === w.en) c.classList.add('glow'); });
        await ko('다시 해볼까?'); if (my === actToken) await en(w.en);
      }
    };
  }
  function actPickPic(a) {
    const w = a.w; const att = { n: 0 };
    const friend = !a.review && Math.random() < 0.25 ? 'eunhoo' : null;
    render('lesson', lessonFrame(`<div class="prompt">
        ${friend ? `<div class="say">${friendHtml(friend)}<span class="text">같이 찾아보자!</span></div>` : ''}
        <div class="bubble">${a.review || a.old ? '🔁 기억나요?' : '잘 듣고 그림을 골라요'}</div>
        <div class="listen-row"><button class="listen" data-act="play" aria-label="다시 듣기">🔊</button><button class="listen slow" data-act="slow" aria-label="천천히">🐢</button></div>
      </div>
      <div class="choices">${choiceSet(a.t, w, 4).map(x => `<button class="choice" data-act="pick" data-arg="${esc(x.en)}">${picHtml(x)}</button>`).join('')}</div>`, { split: true }), {
      ...baseHandlers(),
      play: () => { hush(); en(w.en); }, slow: () => { hush(); en(w.en, true); },
      pick: pickHandlers(a, att),
    });
    const my = actToken;
    (async () => { if (!L.heardKo.pic) { L.heardKo.pic = 1; await ko('잘 듣고 그림을 골라요'); } if (my === actToken) en(w.en); })();
  }
  function actPickKo(a) {
    const w = a.w; const att = { n: 0 };
    render('lesson', lessonFrame(`<div class="prompt">
        <div class="bubble">${a.old ? '🔁 ' : ''}무슨 뜻일까?</div>
        <div class="listen-row"><button class="listen" data-act="play" aria-label="다시 듣기">🔊</button><button class="listen slow" data-act="slow" aria-label="천천히">🐢</button></div>
      </div>
      <div class="choices" style="grid-template-columns:1fr">${choiceSet(a.t, w, 3).map(x => `<button class="choice text" data-act="pick" data-arg="${esc(x.en)}" style="min-height:84px;position:relative">${esc(x.ko)}<span data-say="${esc(x.ko)}" style="position:absolute;right:14px;font-size:26px">🔈</span></button>`).join('')}</div>`, { split: true }), {
      ...baseHandlers(),
      play: () => { hush(); en(w.en); }, slow: () => { hush(); en(w.en, true); },
      pick: pickHandlers(a, att),
    });
    const my = actToken;
    (async () => { if (!L.heardKo.ko) { L.heardKo.ko = 1; await ko('잘 듣고 뜻을 골라요'); } if (my === actToken) en(w.en); })();
  }

  /* --- 말하기 공통 --- */
  function micBlock() {
    if (canListen()) return `<div class="mic-area"><button class="mic" data-mic="1" aria-label="누르고 말하기">🎤</button><div class="heard" id="heard">버튼을 누르고 말해요</div><div class="hint" id="hint"></div></div>`;
    return `<div class="mic-area"><button class="btn good" data-act="selfok">🗣️ 말했어요!</button>
      <div class="heard" id="heard">소리 내어 말한 뒤 눌러요 (이 기기는 음성인식이 안 돼요)</div><div class="hint" id="hint"></div></div>`;
  }
  function setHint(t) { const h = document.getElementById('hint'); if (h) h.textContent = t; }
  function setHeard(t) { const h = document.getElementById('heard'); if (h) h.textContent = t; }
  let micBusy = false;
  function micHandlers(keywords, onResult) {
    // 마이크 버튼: 누르고 있는 동안 듣기 (짧게 톡 눌러도 됨)
    const mic = () => document.querySelector('[data-mic]');
    setTimeout(() => {
      const b = mic(); if (!b) return;
      let downAt = 0;
      b.addEventListener('pointerdown', async e => {
        e.preventDefault(); if (micBusy) return; micBusy = true; downAt = Date.now();
        hush(); b.classList.add('on'); setHeard('듣고 있어요…'); clearTimeout(talkTimer);
        const my = actToken;
        const alts = await recognize();
        micBusy = false; b.classList.remove('on');
        if (my !== actToken) return;
        if (micDenied) { toast('마이크 권한이 없어서 "말했어요" 버튼으로 바꿀게요'); showAct(); return; }
        setHeard(alts.length ? `들린 말: “${alts[0]}”` : '잘 안 들렸어요. 한 번 더!');
        onResult(matches(alts, keywords), alts);
      });
      const up = () => { if (rec && Date.now() - downAt > 450) setTimeout(stopRec, 250); };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    }, 0);
    return { selfok: () => { hush(); onResult(true, [], true); } };
  }
  let talkTimer = null;

  function speakAct(a, cfg) {
    // cfg: {answer, keywords, first(), hint1(), hint2(), success()}
    // 공통 64: 3번째 실패 뒤 정답을 들려주고 마이크는 그대로 둠. 따라 말하면 별 1개, "다음 ▶"으로 넘어가면 0개
    let fails = 0; let closed = false; let marked = false;
    const reveal = async () => {
      const tok = actToken;
      if (!marked && a.w) { marked = true; mark(a.t, a.w, false, false); }
      setHint(`정답은 “${cfg.answer}” · 정답을 따라 말하면 별을 받아요`);
      const area = document.querySelector('.mic-area');
      if (area && !area.querySelector('[data-act=skipnext]')) area.insertAdjacentHTML('beforeend', '<div class="next-row reveal-next"><button class="btn primary" data-act="skipnext">다음 ▶</button></div>');
      H.skipnext = () => { if (closed || tok !== actToken) return; closed = true; hush(); award(false); nextAct(); };
      await ko('정답을 따라 말해 봐'); if (tok === actToken && !closed) await en(cfg.answer);
    };
    return async (ok, alts, self) => {
      const my = actToken;
      if (closed) return;
      if (ok) {
        closed = true; ding(); const n = award(true); flash(n ? '⭐' : '👍');
        if (a.w && !marked) mark(a.t, a.w, fails === 0, false);
        await cfg.success(); await sleep(300); if (my === actToken) nextAct();
        return;
      }
      fails++; boop();
      if (fails === 1) await cfg.hint1();
      else if (fails === 2) await cfg.hint2();
      else await reveal();
    };
  }

  function actRepeat(a) {
    const w = a.w;
    const onRes = speakAct(a, {
      answer: w.en,
      success: async () => { await en(w.en); await en(praise()); },
      hint1: async () => { setHint('천천히 들어봐요 🐢'); await en(w.en, true); },
      hint2: async () => { setHint(`${w.en} — 한 번 더!`); await ko('한 번 더 따라 해봐'); await en(w.en); },
    });
    render('lesson', lessonFrame(`<div class="prompt">
        <div class="bubble">따라 말해요</div>
        <div class="pic">${picHtml(w)}</div><div class="word">${esc(w.en)}</div>
        <div class="listen-row"><button class="listen" data-act="play">🔊</button><button class="listen slow" data-act="slow">🐢</button></div>
      </div><div class="prompt">${micBlock()}</div>`, { split: true }), {
      ...baseHandlers(), play: () => { hush(); en(w.en); }, slow: () => { hush(); en(w.en, true); },
      ...micHandlers(wordKeywords(w), onRes),
    });
    const my = actToken;
    (async () => { if (!L.heardKo.rep) { L.heardKo.rep = 1; await ko('잘 듣고 따라 말해요'); } if (my === actToken) en(w.en); })();
  }

  function actSayEn(a) {
    const w = a.w; const f = a.friend && C.friends[a.friend];
    const ask = f ? `${f.name}한테 알려줄래? '${w.ko}'는 영어로 뭐야?` : `'${w.ko}'는 영어로 뭐야?`;
    const masked = w.en.split(' ').map(p => p[0] + ' _'.repeat(p.length - 1)).join('   ');
    const onRes = speakAct(a, {
      answer: w.en,
      success: async () => { if (f) { setHint(`${f.name}: 고마워! ${w.en}!`); } await en(w.en); await en(praise()); if (f) await ko(`${f.name}: 고마워!`); },
      hint1: async () => { setHint(`힌트: ${masked}`); await ko('첫 글자 힌트!'); },
      hint2: async () => { setHint(`정답은 ${w.en}! 따라 말해요`); await en(w.en); },
    });
    render('lesson', lessonFrame(`<div class="prompt">
        <div class="say">${f ? friendHtml(a.friend, true) : '<span class="who">🤖</span>'}<span class="text">${esc(ask)}</span></div>
        <div class="pic">${picHtml(w)}</div><div class="ko">${esc(w.ko)}</div>
      </div><div class="prompt">${micBlock()}</div>`, { split: true }), { ...baseHandlers(), ...micHandlers(wordKeywords(w), onRes) });
    ko(ask);
  }

  function actTalk(a) {
    const q = a.q; const answer = fill(q.answer);
    const asker = q.friend ? null : (Math.random() < 0.5 ? 'eunhoo' : null);
    const words = answer.split(' '); const half = words.slice(0, Math.max(1, Math.ceil(words.length / 2))).join(' ') + ' …';
    const onRes = speakAct(a, {
      answer,
      success: async () => { setHint(answer); await en(praise()); await en(answer); },
      hint1: async () => { setHint(`힌트: ${half}`); await ko('이렇게 시작해 봐'); await en(half.replace(' …', '')); },
      hint2: async () => { setHint(`${answer} — 따라 말해요`); await en(answer); },
    });
    const who = q.friend ? friendHtml(q.friend, true) : asker ? friendHtml(asker, true) : '<span class="who">🤖</span>';
    render('lesson', lessonFrame(`<div class="prompt">
        <div class="say">${who}<span class="text">${esc(q.q)}</span></div>
        ${q.img ? `<div class="pic">${esc(q.img)}</div>` : ''}
        <div class="ko">${esc(q.ko)}</div>
        <div class="listen-row"><button class="listen" data-act="play">🔊</button><button class="listen slow" data-act="slow">🐢</button></div>
      </div><div class="prompt">${micBlock()}</div>`, { split: true }), {
      ...baseHandlers(), play: () => { hush(); en(q.q); }, slow: () => { hush(); en(q.q, true); },
      ...micHandlers(q.keywords, onRes),
    });
    const my = actToken;
    (async () => {
      if (!L.heardKo.talk) { L.heardKo.talk = 1; await ko('친구가 물어봐요. 영어로 대답해요!'); }
      if (my !== actToken) return; await en(q.q);
      if (my !== actToken) return;
      clearTimeout(talkTimer);
      talkTimer = setTimeout(async () => { if (my === actToken && !micBusy && !document.getElementById('hint').textContent) { setHint(`힌트: ${half}`); await en(half.replace(' …', '')); } }, 6000);
    })();
  }

  /* ================= 하루 끝 ================= */
  function confetti() {
    const em = ['⭐', '🌟', '🎉', '✨'];
    for (let i = 0; i < 24; i++) {
      const c = document.createElement('div'); c.className = 'confetti'; c.textContent = pick(em);
      c.style.left = Math.random() * 100 + 'vw'; c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * .6 + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
    }
  }
  /* 오늘의 단어 노래: 영어 단어 두 번 → 한국어 뜻과 설명, 뒤에 작은 박자 */
  let beatTimer = null;
  function beat(on) {
    clearInterval(beatTimer); beatTimer = null;
    if (!on) return;
    let n = 0;
    beatTimer = setInterval(() => {
      if (screen !== 'reward') return beat(false);
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain(); const t0 = actx.currentTime;
        const kick = n % 2 === 0;
        o.type = kick ? 'sine' : 'triangle'; o.frequency.setValueAtTime(kick ? 140 : 900, t0); if (kick) o.frequency.exponentialRampToValueAtTime(50, t0 + 0.15);
        g.gain.setValueAtTime(kick ? 0.12 : 0.03, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (kick ? 0.18 : 0.05));
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.2);
      } catch (e) { /* */ }
      n++;
    }, 320);
  }
  async function singWords(words) {
    hush(); const my = sayToken; const box = document.getElementById('chant'); if (!box) return;
    const D = C.wordDesc || {};
    box.hidden = false; beat(true);
    await ko('오늘의 단어 노래! 따라 불러봐요!');
    for (const w of words) {
      if (my !== sayToken) break;
      const desc = w.d || D[w.en] || '';
      box.innerHTML = `<div class="pic" style="font-size:90px">${picHtml(w)}</div><div class="word">${esc(w.en)}</div><div class="ko">${esc(w.ko)}</div>${desc ? `<div style="font-size:20px;font-weight:700;margin-top:6px">${esc(desc)}</div>` : ''}`;
      await en(w.en); if (my !== sayToken) break;
      await sleep(150); await en(w.en); if (my !== sayToken) break;
      await ko(`${w.ko}!`); if (my !== sayToken) break;
      if (desc) { await sleep(200); await ko(desc); if (my !== sayToken) break; }
      await sleep(250);
    }
    beat(false);
    if (my === sayToken) { box.innerHTML = '<div class="word">🎵 Yay! 🎵</div><div class="ko">노래 끝! 잘 따라 불렀어요</div>'; await en(praise()); }
  }

  function finishDay() {
    const { t, d } = L; const tp = T[t];
    S.done[`${t}-${d}`] = today();
    let newSticker = false;
    if (doneCount(t) >= DAYS && !S.stickers[t]) { S.stickers[t] = today(); newSticker = true; }
    // 다음 진도
    let nt = t, nd = d + 1; if (nd > DAYS) { nd = 1; nt = (t + 1) % T.length; }
    S.pos = { t: nt, d: nd, s: 0 };
    const bonus = Math.max(0, Math.min(DAY_BONUS, DAY_STAR_MAX - todayLog().stars));
    S.stars += bonus; L.earned += bonus; todayLog().stars += bonus; save();
    const todayWords = L.words;
    render('reward', `<div class="screen"><div class="reward">
      <div class="friends">${Object.keys(C.friends).map(id => friendHtml(id, true)).join('')}</div>
      <div class="bubble">오늘 영어 끝! 정말 잘했어, ${esc(S.settings.childName)}!<small>내일 또 만나요 👋</small></div>
      <div class="big-stars">⭐ +${L.earned}</div>
      ${bonus ? `<div class="muted" style="font-weight:800;margin-top:-10px">끝까지 한 보너스 ⭐${bonus} 포함</div>` : ''}
      <div class="card chant-card" id="chant" hidden></div>
      ${newSticker ? `<div class="sticker-new">${tp.sticker}</div><div class="bubble">${esc(tp.title)} 스티커를 받았어요!</div>` : ''}
      ${tp.mission ? `<div class="card mission">🧪 ${esc(tp.mission)}</div>` : ''}
      <div class="home-links">
        <button class="btn" data-act="chant">🎵 오늘 단어 노래</button>
        <button class="btn" data-act="stickers">📒 스티커북</button>
        <button class="btn primary" data-act="home">끝!</button>
      </div>
    </div></div>`, {
      home: homeScreen, stickers: stickerScreen,
      chant: () => singWords(todayWords),
    });
    confetti(); tone([523, 659, 784, 1046], 0.16);
    ko(`오늘 영어 끝! 정말 잘했어, 윤이야. ${newSticker ? '스티커도 받았어!' : '내일 또 만나!'}`);
  }

  /* ================= 아빠 화면 ================= */
  /* ================= 아빠 화면 공통: 암호(61)·통계(62)·탭(63) — 세 앱 같은 코드 (plan/0_COMMON_spec.md 5-1) ================= */
  const DEFAULT_PIN = '1234';
  const parentPin = () => String(S.settings.parentPin || DEFAULT_PIN);
  const PARENT_SCREENS = ['gate', 'pinreset', 'parent', 'rewardadmin', 'spec'];
  // 앱을 켜 둔 시간(아빠 화면 제외) — 통계용. 하루 시간 제한은 계속 sec(학습 화면)만 써요
  setInterval(() => { if (!document.hidden && screen && !PARENT_SCREENS.includes(screen)) { const l = todayLog(); l.app = (l.app || 0) + 10; save(); } }, 10000);
  const gateFocus = () => setTimeout(() => { const i = document.getElementById('ans'); if (i) { i.focus(); i.addEventListener('keydown', e => { if (e.key === 'Enter') H.ok(); }); } }, 50);
  function gateScreen(next) {
    render('gate', `<div class="screen"><div class="topbar"><button class="icon-btn" data-act="home">🏠</button></div>
      <div class="gate"><div class="card"><b>🔒 아빠 화면 암호</b><p class="muted">암호를 입력하세요</p>
      <input id="ans" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" aria-label="암호">
      <button class="btn primary" data-act="ok">확인</button>
      <button class="btn small" data-act="forgot">암호를 잊었어요</button></div></div></div>`, {
      home: homeScreen,
      ok: () => {
        const i = document.getElementById('ans');
        if (i && i.value.trim() && i.value.trim() === parentPin()) { pTab = 'summary'; const t = document.getElementById('toast'); if (t) t.classList.remove('show'); next(); }
        else { toast('암호가 달라요'); if (i) { i.value = ''; i.focus(); } }
      },
      forgot: () => pinResetScreen(next),
    });
    gateFocus();
  }
  function pinResetScreen(next) {
    const a = 12 + Math.floor(Math.random() * 28), b = 12 + Math.floor(Math.random() * 18);
    render('pinreset', `<div class="screen"><div class="topbar"><button class="icon-btn" data-act="home">🏠</button></div>
      <div class="gate"><div class="card"><b>암호 되돌리기 (어른 확인)</b><p class="muted">맞히면 암호가 ${DEFAULT_PIN}로 돌아가요</p>
      <div style="font-size:40px;font-weight:900">${a} × ${b} = ?</div>
      <input id="ans" inputmode="numeric" autocomplete="off"><button class="btn primary" data-act="ok">확인</button>
      <button class="btn small" data-act="back">암호 입력으로</button></div></div></div>`, {
      home: homeScreen,
      back: () => gateScreen(next),
      ok: () => {
        if (+document.getElementById('ans').value === a * b) { S.settings.parentPin = DEFAULT_PIN; save(); pTab = 'settings'; next(); toast(`암호를 ${DEFAULT_PIN}로 되돌렸어요. 새 암호로 바꿔 주세요`); }
        else { toast('다시 계산해 보세요'); pinResetScreen(next); }
      },
    });
    gateFocus();
  }
  const PTABS = [['summary', '📊', '요약'], ['stats', '📈', '통계'], ['reward', '🎁', '보상·별'], ['progress', '📚', '학습·진도'], ['settings', '⚙️', '설정'], ['manage', '🛠️', '백업·업데이트']];
  let pTab = 'summary';
  const ptabBar = () => `<nav class="ptabs" role="tablist" aria-label="아빠 화면 메뉴">${PTABS.map(([k, i, n]) => `<button class="ptab${pTab === k ? ' on' : ''}" role="tab" aria-selected="${pTab === k}" data-act="ptab" data-arg="${k}"><span aria-hidden="true">${i}</span>${n}</button>`).join('')}</nav>`;
  const ptabPanel = (k, html) => `<section class="ppanel" role="tabpanel" data-panel="${k}"${pTab === k ? '' : ' hidden'}>${html}</section>`;
  function ptabSwitch(k) {
    if (!PTABS.some(t => t[0] === k)) return; pTab = k;
    document.querySelectorAll('.ptab').forEach(b => { const on = b.dataset.arg === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    document.querySelectorAll('.ppanel').forEach(p => { p.hidden = p.dataset.panel !== k; });
    window.scrollTo(0, 0); ptabReveal(true);
  }
  // 폰에서 켜진 탭이 탭 바 밖으로 밀리지 않게
  function ptabReveal(smooth) { const on = document.querySelector('.ptab.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' }); }
  let statDays = 7;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function statRows(n) {
    const out = [];
    for (let i = 0; i < n; i++) { const d = addDays(-i); const l = S.log[d] || {}; out.push({ d, min: Math.round((l.sec || 0) / 60), app: l.app != null ? Math.round(l.app / 60) : null, stars: l.stars || 0 }); }
    return out;
  }
  function statsCard() {
    const rows = statRows(statDays); const act = rows.filter(r => r.min > 0 || r.stars > 0); const td = today();
    const totMin = rows.reduce((s, r) => s + r.min, 0), totStar = rows.reduce((s, r) => s + r.stars, 0), maxStar = Math.max(0, ...rows.map(r => r.stars));
    const avg = act.length ? Math.round(totMin / act.length) : 0;
    const maxMin = Math.max(Number(S.settings.dailyLimit) || 20, ...rows.map(r => r.min), 1);
    const dl = d => { const x = new Date(d + 'T12:00:00'); return `${x.getMonth() + 1}/${x.getDate()} (${WD[x.getDay()]})`; };
    return `<div class="card" id="statsCard"><h3>📈 날짜별 학습 시간·얻은 별</h3>
      <div class="row stat-range">${[7, 14, 30].map(n => `<button class="btn small${statDays === n ? ' primary' : ''}" data-act="statdays" data-arg="${n}">최근 ${n}일</button>`).join('')}</div>
      <div class="kv" style="margin-top:12px"><div>학습한 날<b>${act.length}일</b></div><div>총 학습 시간<b>${totMin}분</b></div><div>하루 평균<b>${avg}분</b></div><div>얻은 별<b>${totStar}개</b></div><div>하루 최고 별<b>${maxStar}개</b></div></div>
      <ul class="stat-list">${rows.map(r => `<li class="stat-row${r.d === td ? ' today' : ''}${r.min || r.stars ? '' : ' empty'}" data-date="${r.d}"><span class="stat-date">${dl(r.d)}${r.d === td ? ' · 오늘' : ''}</span>
        <div class="stat-bars"><div class="stat-bar min"><i style="width:${Math.min(100, Math.round(r.min / maxMin * 100))}%"></i><b>⏱️ ${r.min}분</b>${r.app != null && r.app > r.min ? `<small>앱 켠 시간 ${r.app}분</small>` : ''}</div>
        <div class="stat-bar star"><i style="width:${Math.min(100, Math.round(r.stars / DAY_STAR_MAX * 100))}%"></i><b>⭐ ${r.stars}개</b></div></div></li>`).join('')}</ul>
      <p class="muted">학습 시간은 문제 푸는 화면에 있던 시간이에요 (하루 시간 제한 ${esc(S.settings.dailyLimit)}분과 같은 기준). “앱 켠 시간”은 아빠 화면을 뺀 전체 시간이에요 (이 버전부터 기록). 별은 그날 문제와 하루 끝 보너스로 얻은 별이에요 (하루 최대 ${DAY_STAR_MAX}개, 아빠가 조정한 별은 빼요).</p></div>`;
  }
  function pinCard() {
    const isDef = parentPin() === DEFAULT_PIN;
    return `<div class="card" id="pinCard"><h3>🔒 아빠 화면 암호</h3>
      <p>${isDef ? `⚠️ 지금은 기본 암호(<b>${DEFAULT_PIN}</b>)예요. 윤이가 모르는 암호로 바꿔 주세요.` : '✅ 새 암호가 설정되어 있어요.'}</p>
      <div class="form"><label>새 암호 (숫자 4~8자리)<input id="pinNew" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label>
        <label>새 암호 한 번 더<input id="pinNew2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label></div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn small primary" data-act="setpin">암호 바꾸기</button></div>
      <p class="muted">암호를 잊으면 암호 화면의 “암호를 잊었어요”에서 어른용 곱셈 문제를 풀어 ${DEFAULT_PIN}로 되돌릴 수 있어요. 전체 초기화를 해도 ${DEFAULT_PIN}로 돌아가요.</p></div>`;
  }
  function setPin() {
    const a = ((document.getElementById('pinNew') || {}).value || '').trim(), b = ((document.getElementById('pinNew2') || {}).value || '').trim();
    if (!/^\d{4,8}$/.test(a)) return toast('숫자 4~8자리로 적어주세요');
    if (a !== b) return toast('두 번 적은 암호가 달라요');
    S.settings.parentPin = a; save(); parentScreen(); toast('암호를 바꿨어요');
  }
  const parentCommonHandlers = () => ({ ptab: k => ptabSwitch(k), statdays: n => { statDays = +n || 7; parentScreen(); }, setpin: setPin });
  function restore(txt) {
    txt = String(txt || '').trim(); let o = null;
    try { o = JSON.parse(txt); } catch (e) { try { o = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e2) { o = null; } }
    if (!o || !o.pos) return false;
    const d = defaults(); S = Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) }); save(); return true;
  }
  /* 새 버전 확인·적용 (진도·별·설정은 localStorage에 그대로 남아요) */
  const verNum = v => String(v || '0').split('.').map(Number);
  const isNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  let latestVer = null;
  async function checkUpdate() {
    const r = await fetch('app.js?check=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('fetch');
    const m = (await r.text()).match(/APP_VERSION = '([\d.]+)'/);
    latestVer = m ? m[1] : null; return latestVer;
  }
  async function applyUpdate() {
    toast('새 버전을 받는 중이에요…');
    const files = ['./', 'index.html', 'app.js', 'content.js', 'style.css', 'sw.js', 'manifest.webmanifest', 'audio/index.json', 'audio-ko/index.json', '기획서.md'];
    try { await Promise.all(files.map(u => fetch(encodeURI(u), { cache: 'reload' }).catch(() => {}))); } catch (e) { /* */ }
    try { if (navigator.serviceWorker) for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister(); } catch (e) { /* */ }
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* */ }
    location.replace(location.pathname + '?v=' + Date.now());
  }

  /* 기획·변경 기록: 앱 안의 기획서.md를 읽어서 보여줘요 */
  function mdToHtml(md) {
    const inl = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
    const out = []; const lines = md.split('\n'); let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l.startsWith('```')) { const buf = []; i++; while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]); i++; out.push(`<pre class="spec-code">${esc(buf.join('\n'))}</pre>`); continue; }
      if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; out.push(`<h${n + 1}>${inl(l.replace(/^#+ /, ''))}</h${n + 1}>`); i++; continue; }
      if (l.startsWith('|')) {
        const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const body = rows.filter((r, k) => k !== 1);
        out.push(`<div class="spec-table"><table>${body.map((r, k) => `<tr>${cells(r).map(c => k === 0 ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</table></div>`); continue;
      }
      if (/^(- |\d+\. )/.test(l)) {
        const ol = /^\d+\. /.test(l); const items = [];
        while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, ''));
        out.push(`<${ol ? 'ol' : 'ul'} class="list">${items.map(x => `<li>${inl(x)}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`); continue;
      }
      if (l.trim()) out.push(`<p>${inl(l)}</p>`);
      i++;
    }
    return out.join('');
  }
  /* ================= 아빠: 받은 보상 관리 (사용완료 체크) — 세 앱 공통 60번 ================= */
  function rewardAdminScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const rows = S.rewards.map((r, i) => ({ r, i })).reverse(); // 최근 보상이 위로
    const row = ({ r, i }) => `<li class="rw-row${r.used ? ' rw-used' : ''}">
        <div class="rw-info"><b>${r.used ? '✅' : '🎁'} ${esc(r.text)}</b><small>${esc(r.date)} 받음 · 별 ${r.stars}개${r.used ? ` · ${esc(r.used)} 사용` : ''}</small></div>
        <button class="btn small rw-check${r.used ? ' on' : ''}" data-act="usedrw" data-arg="${i}" aria-pressed="${r.used ? 'true' : 'false'}">${r.used ? '✅ 사용완료 (취소하려면 누르기)' : '☐ 사용완료 체크'}</button>
        <button class="btn small" data-act="delrw" data-arg="${i}">삭제</button></li>`;
    render('rewardadmin', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="아빠 화면으로">⬅️</button><h2 class="title">🎁 받은 보상 관리</h2></div>
      <div class="card"><h3>지금 목표: ${esc(S.settings.goalText)}</h3>
        <div class="goal-bar"><i style="width:${Math.min(100, Math.round(g / goal * 100))}%"></i></div>
        <p class="muted">모은 별 ${Math.min(g, goal)} / ${goal}${g >= goal ? ' · 목표 달성! 보상을 주고 아래 버튼으로 기록해요' : ''}</p>
        <button class="btn small${g >= goal ? ' primary' : ''}" data-act="gave">🎁 보상 줬어요 (기록하고 목표 새로 시작)</button></div>
      <div class="card"><h3 id="rwHead">${rwHeadText()}</h3>
        ${rows.length ? `<ul class="rw-rows">${rows.map(row).join('')}</ul><p class="muted">보상을 실제로 쓰면 “사용완료 체크”를 눌러 주세요. 윤이의 보상 목록에도 사용완료로 보여요. 다시 누르면 취소돼요.</p>`
          : '<p class="muted">아직 기록된 보상이 없어요. 윤이에게 보상을 주면 위의 “🎁 보상 줬어요”를 눌러 기록하세요. 기록한 보상이 여기에 나오고, 사용완료를 체크할 수 있어요.</p>'}
      </div></div></div>`, {
      back: parentScreen,
      usedrw: i => {
        const r = S.rewards[+i]; if (!r) return;
        r.used = r.used ? null : today(); save();
        const y = window.scrollY; rewardAdminScreen(); window.scrollTo(0, y); // 스크롤 위치 유지
        toast(r.used ? '사용완료로 표시했어요' : '사용 전으로 되돌렸어요');
      },
      delrw: (i, btn) => { if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '한 번 더 누르면 삭제'; return; } S.rewards.splice(+i, 1); save(); const y = window.scrollY; rewardAdminScreen(); window.scrollTo(0, y); },
      gave: () => { S.rewards.push({ date: today(), text: S.settings.goalText, stars: Number(S.settings.goalStars) }); S.goalBase = S.stars; save(); toast('보상을 기록했어요. 새 목표를 시작해요!'); rewardAdminScreen(); },
    });
  }
  function specScreen() {
    render('spec', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="아빠 화면으로">⬅️</button><h2 class="title">📋 기획·변경 기록</h2><div class="spacer"></div><span class="muted">v${APP_VERSION}</span></div>
      <div class="card spec" id="spec">불러오는 중…</div></div></div>`, { back: parentScreen });
    const show = md => { const el = document.getElementById('spec'); if (el) el.innerHTML = mdToHtml(md); };
    if (window.__SPEC_INLINE) return show(window.__SPEC_INLINE);
    fetch(encodeURI('기획서.md')).then(r => { if (!r.ok) throw 0; return r.text(); }).then(show)
      .catch(() => { const el = document.getElementById('spec'); if (el) el.textContent = '기획서.md 파일을 찾지 못했어요. 앱 폴더에 기획서.md가 있는지 확인해 주세요.'; });
  }
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function parentScreen() {
    const td = today(); const weekAgo = addDays(-6);
    const days7 = S.days.filter(d => d >= weekAgo).length;
    const learned7 = Object.values(S.srs).filter(r => r.learned && r.learned >= weekAgo).length;
    const learnedAll = Object.values(S.srs).filter(r => r.learned).length;
    const mastered = Object.values(S.srs).filter(r => r.mastered).length;
    const hard = Object.entries(S.srs).filter(([, r]) => r.wrong > 0).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 5)
      .map(([k, r]) => { const i = k.indexOf(':'); const t = +k.slice(0, i); const w = T[t] && T[t].words.find(x => x.en === k.slice(i + 1)); return w ? `<li>${esc(w.img)} ${esc(w.en)} (${esc(w.ko)}) — ${r.wrong}번 틀림</li>` : ''; }).join('');
    const min = Math.round(todayLog().sec / 60);
    const st = S.settings; const code = `${S.pos.t + 1}-${S.pos.d}-${S.pos.s + 1}`;
    render('parent', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="home">🏠</button><h2 class="title">아빠 화면</h2><div class="spacer"></div><button class="btn small" data-act="rewardadmin">🎁 보상</button><button class="btn small" data-act="spec">📋 기획·변경 기록</button><span class="muted">v${APP_VERSION}</span></div>
      ${ptabBar()}
      ${ptabPanel('summary', `
      <div class="card"><h3>이번 주 (최근 7일)</h3><div class="kv">
        <div>학습한 날<b>${days7}일</b></div><div>새로 익힌 단어<b>${learned7}개</b></div><div>오늘 사용<b>${min}분</b></div><div>연속<b>${streak()}일</b></div>
      </div>
      <h3 style="margin-top:14px">자주 틀리는 단어</h3>${hard ? `<ol class="list">${hard}</ol>` : '<p class="muted">아직 없어요</p>'}</div>
      <div class="card"><h3>전체</h3><div class="kv">
        <div>누적 학습일<b>${S.days.length}일</b></div><div>익힌 단어<b>${learnedAll}개</b></div><div>“알아요” 단어<b>${mastered}개</b></div><div>별<b>${S.stars}개</b></div><div>스티커<b>${Object.keys(S.stickers).length} / ${T.length}</b></div>
      </div></div>
      `)}
      ${ptabPanel('stats', `
      ${statsCard()}
      `)}
      ${ptabPanel('reward', `
      <div class="card"><h3>🎁 받은 보상 관리</h3>
        <p>받은 보상 <b>${rwCount().n}개</b> · 아직 안 쓴 보상 <b>${rwCount().left}개</b> · 사용완료 ${rwCount().u}개</p>
        <button class="btn primary" data-act="rewardadmin">🎁 보상 목록 · 사용완료 체크</button>
      </div>
      <div class="card"><h3>별 조정</h3>
        <p>지금 별: <b style="font-size:24px">${S.stars}개</b> <span class="muted">(현재 목표에 모은 별 ${Math.max(0, S.stars - S.goalBase)}개 · 오늘 ${todayLog().stars}개 / 하루 최대 ${DAY_STAR_MAX}개)</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="star" data-arg="-10">−10</button><button class="btn small" data-act="star" data-arg="-1">−1</button><button class="btn small" data-act="star" data-arg="1">+1</button><button class="btn small" data-act="star" data-arg="10">+10</button></div>
        <div class="code-row" style="margin-top:10px"><input id="starSet" type="number" min="0" placeholder="개수"><button class="btn small primary" data-act="starset">이 개수로 맞추기</button></div>
      </div>
      `)}
      ${ptabPanel('progress', `
      <div class="card"><h3>진도 조정</h3>
        <p>지금 진도: <b>${esc(T[S.pos.t].title)} ${S.pos.d}일차 · ${STEPS[S.pos.s].name}</b> <span class="muted">(코드 ${code})</span></p>
        <div class="form">
          <label>주제<select id="adjT">${T.map((tp, i) => `<option value="${i}"${S.pos.t === i ? ' selected' : ''}>${i + 1}. ${esc(tp.title)} (${doneCount(i)}/${DAYS}일)</option>`).join('')}</select></label>
          <label>일차<select id="adjD">${Array.from({ length: DAYS }, (_, i) => `<option value="${i + 1}"${S.pos.d === i + 1 ? ' selected' : ''}>${i + 1}일차</option>`).join('')}</select></label>
          <label>단계<select id="adjS">${STEPS.map((x, i) => `<option value="${i}"${S.pos.s === i ? ' selected' : ''}>${i + 1}. ${x.name}</option>`).join('')}</select></label>
          <label style="grid-template-columns:auto 1fr"><input type="checkbox" id="adjMark" style="width:24px;min-height:24px">앞 일차는 완료, 뒤 일차는 미완료로 맞추기 (스티커도 함께)</label>
        </div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn small primary" data-act="adjpos">이 진도로 바꾸기</button>
          <button class="btn small" data-act="resetprog" id="resetProgBtn">진도 초기화</button></div>
        <p class="muted">진도 초기화: 진도·완료한 날·스티커·복습 기록을 처음으로 돌려요. 별·받은 보상·설정은 그대로예요.</p>
      </div>
      `)}
      ${ptabPanel('settings', `
      <div class="card"><h3>설정</h3><div class="form">
        <label>영어 이름<input data-set="childName" value="${esc(st.childName)}"></label>
        <label>한국어 읽기<select data-set="koVoiceMode">${[['rec', '녹음 목소리 (추천)'], ['device', '기기 음성']].map(([v, n]) => `<option value="${v}"${(st.koVoiceMode || 'rec') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>한국어 목소리 (기기 음성)<select data-set="koVoice"><option value="">자동 (구글 음성 우선)</option>${koVoices().map(v => `<option value="${esc(v.voiceURI || v.name)}"${st.koVoice === (v.voiceURI || v.name) ? ' selected' : ''}>${esc(v.name)}${v.localService ? '' : ' (온라인)'}</option>`).join('')}</select></label>
        <label>한국어 말 속도<select data-set="koRate">${[['0.8', '천천히'], ['0.9', '보통 (추천)'], ['1', '빠르게']].map(([v, n]) => `<option value="${v}"${Number(st.koRate) === Number(v) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="kotest">🔈 한국어 들어보기</button>
          <span class="muted">${koVoices().length ? `이 기기의 한국어 목소리 ${koVoices().length}개` : '⚠️ 한국어 목소리를 못 찾았어요. 아래 안내를 보세요'}</span></div>
        <label>영어 목소리<select data-set="voice"><option value="native"${st.voice !== 'device' ? ' selected' : ''}>원어민 녹음 (추천)</option><option value="device"${st.voice === 'device' ? ' selected' : ''}>기기 음성</option></select></label>
        <label>로봇 친구 이름<input data-set="robotName" value="${esc(st.robotName)}"></label>
        <label>나이 (영어 대답)<select data-set="age">${['six', 'seven', 'eight'].map(v => `<option${st.age === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>현이는<select data-set="hyunRel"><option value="brother"${st.hyunRel === 'brother' ? ' selected' : ''}>brother (남동생)</option><option value="sister"${st.hyunRel === 'sister' ? ' selected' : ''}>sister (여동생)</option></select></label>
        <label>하루 최대 시간(분)<input data-set="dailyLimit" type="number" min="5" max="120" value="${st.dailyLimit}"></label>
        <label>별 목표(개)<input data-set="goalStars" type="number" min="5" max="999" value="${st.goalStars}"></label>
        <label>목표 보상<input data-set="goalText" value="${esc(st.goalText)}"></label>
      </div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn small" data-act="unlock">오늘 시간 잠금 풀기</button>
        <button class="btn small" data-act="gave">🎁 보상 줬어요 (목표 새로 시작)</button>
        <button class="btn small" data-act="reset" id="resetBtn">전체 초기화 (별·보상·설정까지)</button>
      </div></div>
      ${pinCard()}
      `)}
      ${ptabPanel('manage', `
      <div class="card"><h3>앱 업데이트</h3>
        <p>이 기기의 앱: <b>v${APP_VERSION}</b> <span id="verInfo" class="muted">${latestVer ? (isNewer(latestVer, APP_VERSION) ? `· 새 버전 v${latestVer}이 있어요!` : '· 최신 버전이에요') : ''}</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="checkver">🔄 새 버전 확인</button>
          <button class="btn small primary" data-act="doupdate" id="updBtn"${latestVer && isNewer(latestVer, APP_VERSION) ? '' : ' hidden'}>⬇️ 지금 업데이트</button></div>
        <p class="muted">업데이트해도 진도·별·보상·설정은 그대로 남아요. 인터넷이 연결돼 있어야 해요.</p>
      </div>
      <div class="card"><h3>진도 옮기기 (기기끼리 연동이 안 될 때)</h3>
        <p>이 기기의 현재 진도 코드: <b style="font-size:24px">${code}</b> <span class="muted">(주제-일차-단계)</span></p>
        <div class="code-row"><input id="pcode" placeholder="예: 4-3-1"><button class="btn small primary" data-act="setpos">이 진도로 맞추기</button></div>
        <p class="muted">별·스티커·복습 기록까지 모두 옮기려면 아래 백업 코드를 복사해 다른 기기의 같은 칸에 붙여넣고 “가져오기”를 누르세요.</p>
        <textarea id="backup" placeholder="백업 코드"></textarea>
        <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn small" data-act="export">내보내기(복사)</button><button class="btn small" data-act="import">가져오기</button>
          <button class="btn small" data-act="savefile">💾 백업 파일 저장</button><label class="btn small" style="cursor:pointer">📂 백업 파일 불러오기<input type="file" id="loadFile" accept=".json,application/json,text/plain" hidden></label></div>
        <p class="muted">앱을 지웠다 다시 설치하기 전에는 “백업 파일 저장”을 꼭 눌러두세요.</p>
      </div>
      <div class="card"><h3>안내</h3><ul class="list">
        <li>단어·질문 수정은 <b>content.js</b> 파일에서 해요. 고친 뒤 <b>sw.js</b>의 VERSION을 올리면 설치된 앱에 반영돼요.</li>
        <li>한국어가 잘 안 들리면: 태블릿 <b>설정 → 일반 → 글자 읽어주기(TTS) → 기본 엔진</b>을 <b>Google 음성 인식 및 합성</b>으로 바꾸고, 엔진 설정에서 <b>한국어 음성 데이터(고품질)</b>를 설치한 뒤 앱을 다시 켜세요. 그다음 위의 “한국어 목소리”에서 마음에 드는 목소리를 골라요.</li>
        <li>불편한 점·개선 아이디어는 기획서의 “개선 요청” 표에 적어주세요.</li>
        <li>음성인식: ${SR ? (micDenied ? '마이크 권한이 꺼져 있어요 (크롬 설정 → 사이트 설정 → 마이크)' : '사용 가능') : '이 브라우저는 지원하지 않아요 → 크롬에서 열어주세요'}</li>
      </ul></div>
      `)}
    </div></div>`, {
      ...parentCommonHandlers(),
      home: homeScreen,
      setpos: () => { const p = parseCode(document.getElementById('pcode').value); if (!p) return toast('예: 4-3-1 처럼 적어주세요'); S.pos = p; save(); toast(`진도를 ${p.t + 1}-${p.d}-${p.s + 1}로 맞췄어요`); parentScreen(); },
      export: async () => { const c = exportCode(); const ta = document.getElementById('backup'); ta.value = c; ta.select(); try { await navigator.clipboard.writeText(c); toast('복사했어요. 다른 기기에 붙여넣으세요'); } catch (e) { toast('코드를 길게 눌러 복사하세요'); } },
      import: () => { if (restore(document.getElementById('backup').value)) { toast('가져왔어요!'); parentScreen(); } else toast('백업 코드가 올바르지 않아요'); },
      savefile: () => {
        try {
          const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `yuni-english-backup-${today()}.json`;
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          toast('백업 파일을 저장했어요 (다운로드 폴더)');
        } catch (e) { toast('저장하지 못했어요. 내보내기(복사)를 이용하세요'); }
      },
      adjpos: () => {
        const t = +document.getElementById('adjT').value, d = +document.getElementById('adjD').value, sIdx = +document.getElementById('adjS').value;
        if (document.getElementById('adjMark').checked) {
          S.done = {}; S.stickers = {};
          for (let ti = 0; ti < T.length; ti++) for (let di = 1; di <= DAYS; di++) if (ti < t || (ti === t && di < d)) S.done[`${ti}-${di}`] = today();
          for (let ti = 0; ti < t; ti++) S.stickers[ti] = today();
        }
        S.pos = { t, d, s: sIdx }; save(); toast(`진도를 ${T[t].title} ${d}일차 · ${STEPS[sIdx].name}(으)로 바꿨어요`); parentScreen();
      },
      resetprog: (x, btn) => {
        if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '정말 진도 초기화? 한 번 더 누르기'; return; }
        S.pos = { t: 0, d: 1, s: 0 }; S.done = {}; S.stickers = {}; S.srs = {}; save(); toast('진도를 처음으로 돌렸어요'); parentScreen();
      },
      star: a => { S.stars = Math.max(0, S.stars + Number(a)); S.goalBase = Math.min(S.goalBase, S.stars); save(); parentScreen(); },
      starset: () => { const v = parseInt(document.getElementById('starSet').value, 10); if (!(v >= 0)) return toast('0 이상의 숫자를 적어주세요'); S.stars = v; S.goalBase = Math.min(S.goalBase, S.stars); save(); toast(`별을 ${v}개로 맞췄어요`); parentScreen(); },
      delrw: (i, btn) => { if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '한 번 더 누르면 삭제'; return; } S.rewards.splice(+i, 1); save(); parentScreen(); },
      spec: specScreen,
      rewardadmin: rewardAdminScreen,
      checkver: async () => {
        const info = document.getElementById('verInfo'); if (info) info.textContent = '· 확인 중…';
        try {
          const v = await checkUpdate();
          const nw = v && isNewer(v, APP_VERSION);
          if (info) info.textContent = nw ? `· 새 버전 v${v}이 있어요!` : `· 최신 버전이에요 (서버 v${v || '?'})`;
          const b = document.getElementById('updBtn'); if (b) b.hidden = !nw;
        } catch (e) { if (info) info.textContent = '· 확인하지 못했어요. 인터넷 연결을 확인해 주세요'; }
      },
      doupdate: applyUpdate,
      kotest: () => { hush(); ko('딱정벌레! 딱딱한 날개를 가진 곤충이야. 오늘 영어 끝! 정말 잘했어, 윤이야.'); },
      unlock: () => { S.override = today(); save(); toast('오늘은 시간 제한 없이 할 수 있어요'); },
      gave: () => { S.rewards.push({ date: today(), text: S.settings.goalText, stars: Number(S.settings.goalStars) }); S.goalBase = S.stars; save(); toast('보상을 기록했어요. 새 목표를 시작해요!'); parentScreen(); },
      reset: (x, btn) => { if (btn.dataset.sure) { S = defaults(); save(); toast('초기화했어요'); homeScreen(); } else { btn.dataset.sure = 1; btn.textContent = '정말 초기화? 한 번 더 누르기'; } },
    });
    ptabReveal();
    const lf = document.getElementById('loadFile');
    if (lf) lf.addEventListener('change', () => { const f = lf.files[0]; if (!f) return; f.text().then(txt => { if (restore(txt)) { toast('백업을 불러왔어요!'); parentScreen(); } else toast('백업 파일이 올바르지 않아요'); }); });
    document.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.set; S.settings[k] = el.type === 'number' ? Number(el.value) : el.value.trim(); save(); toast('저장했어요');
    }));
  }

  /* ================= 시작 ================= */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  // 저장된 진도가 브라우저 정리로 지워지지 않게 요청
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* */ }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { hush(); stopRec(); } });
  window.YUNI = { get state() { return S; }, get act() { return L && L.acts[L.i]; }, get lesson() { return L; }, buildStep: s => buildStep(L.t, L.d, s), matches, parseCode, fill }; // 테스트용
  homeScreen();
  // 시작하고 잠시 뒤 새 버전이 있는지 조용히 확인
  setTimeout(() => { if (!/^https?:/.test(location.protocol) || window.__SPEC_INLINE || navigator.onLine === false) return;
    checkUpdate().then(v => { if (v && isNewer(v, APP_VERSION) && screen === 'home') toast(`새 버전 v${v}이 있어요. 아빠 화면에서 업데이트하세요`); }).catch(() => {}); }, 3000);
})();
