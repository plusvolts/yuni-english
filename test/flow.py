# 윤이 영어 자동 테스트: 저장소 폴더에서 python3 -m http.server 8765 (다른 포트는 PORT=8781), test 폴더에서 python3 flow.py tab 1280 800 0 / phone 390 844 1
import asyncio, sys, json, os
from playwright.async_api import async_playwright
URL='http://localhost:%s/' % os.environ.get('PORT', '8765')
MOCK = r"""
// 빠른 TTS 목업
window.speechSynthesis.speak = function(u){ window.__said=(window.__said||[]); window.__said.push(u.text); setTimeout(()=>u.onend&&u.onend(), 5); };
window.speechSynthesis.cancel = function(){};
// 음성인식 목업: window.__reply 를 돌려줌
class FakeSR { start(){ setTimeout(()=>{ const t = (window.__reply||'hello'); this.onresult && this.onresult({results:[[{transcript:t}]]}); this.onend && this.onend(); }, 30);} stop(){} abort(){} }
Object.defineProperty(window,'webkitSpeechRecognition',{value:FakeSR,configurable:true,writable:true}); Object.defineProperty(window,'SpeechRecognition',{value:FakeSR,configurable:true,writable:true});
// 공통 65: ko()가 받은 글 모으기 + 한국어 녹음은 실제로 요청하되 빨리 끝내기 (테스트 시간 줄이기)
window.__KO_LOG = [];
const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function(){ const p = _play.call(this); if (/audio-ko\//.test(this.src)) { const a = this; const end = () => setTimeout(()=>{ try{ a.pause(); }catch(e){} a.dispatchEvent(new Event('ended')); }, 80); if (a.readyState >= 4) end(); else a.addEventListener('canplaythrough', end, {once:true}); } return p; };
if(!localStorage.getItem("yuni-english-v1")) localStorage.setItem("yuni-english-v1", JSON.stringify({settings:{}}));
"""
async def run(name, vw, vh, mobile):
    REQ = {}  # 요구사항 자동 점검 (기획서.md 2장 ID)
    src = open('../app.js', encoding='utf-8').read()
    REQ['REQ-11 밤 잠금 없음'] = 'nightHour' not in src
    REQ['REQ-16 저장 키 유지'] = "const KEY = 'yuni-english-v1'" in src
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width':vw,'height':vh}, device_scale_factor=1.5 if not mobile else 2, is_mobile=mobile, has_touch=True, locale='ko-KR')
        await ctx.add_init_script(MOCK)
        pg = await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
        KOREQ=[]; pg.on('request', lambda r: '/audio-ko/' in r.url and r.url.endswith('.mp3') and KOREQ.append(r.url))  # 공통 65: 한국어 녹음 요청
        await pg.goto(URL); await pg.wait_for_timeout(500)
        REQ['REQ-24 주제마다 단어 50·질문 20'] = await pg.evaluate("CONTENT.topics.length===12 && CONTENT.topics.every(t=>t.words.length===50 && t.questions.length===20 && t.words.every(w=>w.d))")
        await pg.screenshot(path=f'../shots/{name}-1-home.png')
        await pg.click('[data-act=go]')
        seen=set(); shots=0; wrong_done=False
        T64 = {}  # v1.6.1 공통 64: 별 주기
        stars = lambda: pg.evaluate("YUNI.state.stars")
        cur = lambda: pg.evaluate("JSON.stringify([YUNI.lesson.s, YUNI.lesson.i])")
        async def moved_from(k, timeout=20000):
            await pg.wait_for_function("JSON.stringify([YUNI.lesson.s, YUNI.lesson.i]) !== %s" % json.dumps(k), timeout=timeout)
            await pg.wait_for_timeout(300)
        async def say(txt):
            await pg.evaluate(f"window.__reply={json.dumps(txt)}"); await pg.dispatch_event('[data-mic]','pointerdown'); await pg.wait_for_timeout(700)
        for step in range(800):
            await pg.wait_for_timeout(250)
            scr = await pg.evaluate("document.querySelector('.reward .big-stars') ? 'reward' : ''")
            if scr=='reward':
                await pg.screenshot(path=f'../shots/{name}-9-reward.png')
                await pg.click('[data-act=chant]'); await pg.wait_for_timeout(2500); await pg.screenshot(path=f'../shots/{name}-9b-chant.png')
                ctext = await pg.inner_text('#chant'); print(' chant card:', ctext[:60].replace('\n',' / '))
                REQ['REQ-19 단어 노래 한국어 설명'] = len(ctext.split('\n')) >= 3
                day_stars = await pg.evaluate("YUNI.state.stars")
                REQ['REQ-18 하루 별 50개 이하'] = 0 < day_stars <= 50
                break
            act = await pg.evaluate("(()=>{const a=window.YUNI.act; if(!a) return null; return {type:a.type, en:a.w&&a.w.en, kw:a.q&&a.q.keywords, ans:a.q&&window.YUNI.fill(a.q.answer)}})()")
            if not act: continue
            t=act['type']
            if t in ('greet','repeat','say-en','talk') and not await pg.locator('[data-mic]').count() and not await pg.locator('[data-act=feel]').count(): continue
            if t in ('pick-pic','pick-ko') and not await pg.locator('.choice').count(): continue
            if await pg.locator('.choice.right').count() or await pg.locator('.mic.on').count(): continue
            if t not in seen:
                seen.add(t); await pg.wait_for_timeout(200); await pg.screenshot(path=f'../shots/{name}-2-{t}.png')
            if t=='greet':
                if await pg.locator('[data-mic]').count():
                    await pg.evaluate("window.__reply='I am happy'"); await pg.dispatch_event('[data-mic]','pointerdown')
                else: await pg.click('[data-act=feel]')
                await pg.wait_for_timeout(400)
            elif t=='msg':
                # 메시지는 저절로 넘어가기도 해서, 아직 메시지 화면일 때만 누름 (다음 화면 버튼을 잘못 누르지 않게)
                await pg.evaluate("YUNI.act && YUNI.act.type==='msg' && document.querySelector('[data-act=next]')?.click()")
            elif t=='intro':
                if not globals().get('_prev_tested'):
                    globals()['_prev_tested']=True
                    before = await pg.evaluate("JSON.stringify([YUNI.act.type, YUNI.act.w && YUNI.act.w.en])")
                    await pg.click('[data-act=prev]'); await pg.wait_for_timeout(300)
                    back = await pg.evaluate("JSON.stringify([YUNI.act.type, YUNI.state.pos.s])")
                    print(' prev from', before, '->', back)
                    REQ['REQ-17 이전 버튼'] = back.startswith('["greet"')
                    continue
                await pg.click('[data-act=next]')
            elif t in ('pick-pic','pick-ko'):
                if not wrong_done:
                    wrong_done=True
                    k = await cur(); s0 = await stars()
                    w = pg.locator(f'.choice:not([data-arg="{act["en"]}"])').first
                    await w.click(); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{name}-3-wrong.png')
                    await pg.locator(f'.choice[data-arg="{act["en"]}"]').click(); await pg.wait_for_timeout(300)
                    s1 = await stars()
                    # ◀ 이전으로 같은 문제에 돌아와 다시 맞혀도 별 없음
                    await moved_from(k); await pg.click('[data-act=prev]'); await pg.wait_for_timeout(400)
                    same = await cur() == k and await pg.evaluate("YUNI.act.w.en") == act['en']
                    await pg.locator(f'.choice[data-arg="{act["en"]}"]').click(); await moved_from(k)
                    s2 = await stars()
                    print(' 64 pick: 2nd try', s0, '->', s1, ' again after prev', s2, same)
                    T64['pick'] = s1 == s0 + 1 and same and s2 == s1
                    continue
                await pg.locator(f'.choice[data-arg="{act["en"]}"]').click(); await pg.wait_for_timeout(500)
            elif t in ('repeat','say-en') and (t == 'repeat' and 'rep' not in T64 or t == 'say-en' and 'say' not in T64):
                # 공통 64: 3번 틀리면 정답을 보여주고 "다음 ▶" (빨간 X·땡 없음, 자동으로 안 넘어감)
                k = await cur(); s0 = await stars()
                for _ in range(3): await say('zzz qqq')
                await pg.wait_for_timeout(800)
                btn = await pg.locator('[data-act=skipnext]').count(); hint = await pg.inner_text('#hint'); body = await pg.inner_text('body')
                stay = await cur() == k and await pg.locator('[data-mic]').count() == 1
                calm = await pg.locator('.wrong').count() == 0 and '땡' not in body
                s1 = await stars()
                await pg.screenshot(path=f'../shots/{name}-4b-reveal-{t}.png')
                ok0 = btn == 1 and '정답' in hint and act['en'] in hint and stay and calm and s1 == s0
                if t == 'repeat':
                    await say(act['en']); await moved_from(k); s2 = await stars()
                    print(' 64 repeat: reveal', ok0, repr(hint), ' stars', s0, s1, '-> correct after reveal', s2)
                    T64['rep'] = ok0 and s2 == s0 + 1
                else:
                    await pg.click('[data-act=skipnext]'); await moved_from(k); s2 = await stars()
                    await pg.click('[data-act=prev]'); await pg.wait_for_timeout(500)
                    back = await cur() == k
                    await say(act['en']); await moved_from(k); s3 = await stars()
                    print(' 64 say-en: reveal', ok0, ' stars', s0, s1, '-> skip', s2, '-> prev+correct', s3, back)
                    T64['say'] = ok0 and s2 == s0 and back and s3 == s0
                continue
            elif t in ('repeat','say-en'):
                await pg.evaluate(f"window.__reply={json.dumps(act['en'])}")
                await pg.dispatch_event('[data-mic]','pointerdown'); await pg.wait_for_timeout(500)
                await pg.wait_for_function("!window.YUNI.act || window.YUNI.act.w?.en !== %s || !document.querySelector('[data-mic]')" % json.dumps(act['en']), timeout=20000)
            elif t=='talk':
                # 한 번 틀리고 힌트 확인 후 정답
                await pg.evaluate("window.__reply='banana banana'"); await pg.dispatch_event('[data-mic]','pointerdown'); await pg.wait_for_timeout(400)
                await pg.screenshot(path=f'../shots/{name}-4-talk-hint.png')
                await pg.evaluate(f"window.__reply={json.dumps(act['ans'])}"); await pg.dispatch_event('[data-mic]','pointerdown'); await pg.wait_for_timeout(600)
                await pg.wait_for_timeout(5000)
        print(' 64', T64)
        # 공통 65: 하루 흐름에서 ko()가 읽은 문장이 녹음 목록(audio-ko/index.json)에 얼마나 있는지 (문장 . ! ? 단위, app.js ko()와 같은 규칙)
        cov = await pg.evaluate("""fetch('audio-ko/index.json').then(r=>r.json()).then(idx=>{ const key=t=>String(t).replace(/\\s+/g,' ').trim();
          const sen=t=>String(t).split(/(?<=[.!?])\\s+/).map(x=>x.trim()).filter(Boolean); const all=new Set(), miss=new Set();
          for (const t of window.__KO_LOG) { const parts = idx[key(t)] ? [t] : sen(t); for (const p of parts) { all.add(key(p)); if (!idx[key(p)]) miss.add(key(p)); } }
          return {n:all.size, miss:[...miss], files:Object.keys(idx).length}; })""")
        pct = 100 * (cov['n'] - len(cov['miss'])) / max(1, cov['n'])
        print(f" 65 한국어 녹음: 읽은 문장 {cov['n']}개 중 녹음 있음 {pct:.1f}% (녹음 목록 {cov['files']}개), 녹음 파일 요청 {len(KOREQ)}번, 빠진 문장:", cov['miss'])
        REQ['REQ-65 읽은 한국어 문장 95% 이상 녹음'] = cov['n'] > 0 and pct >= 95
        REQ['REQ-65 ko() 때 녹음 파일(audio-ko) 요청'] = len(KOREQ) > 0
        REQ['REQ-18·64 다시 골라 맞히면 별 1개, 같은 문제 별 한 번'] = T64.get('pick') is True
        REQ['REQ-64 말하기 3번 실패 → 정답·다음 ▶, 따라 말하면 별 1개'] = T64.get('rep') is True
        REQ['REQ-64 다음 ▶으로 넘어가면 별 0, 돌아와 맞혀도 0'] = T64.get('say') is True
        st = await pg.evaluate("JSON.stringify({pos:YUNI.state.pos, stars:YUNI.state.stars, done:YUNI.state.done, srs:Object.keys(YUNI.state.srs).length})")
        print(name, 'types', sorted(seen), 'state', st)
        # home again, picker, stickers, parent
        await pg.click('[data-act=home]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{name}-5-home2.png')
        await pg.click('[data-act=picker]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'../shots/{name}-6-picker.png')
        await pg.click('[data-act=topic][data-arg="3"]'); await pg.click('[data-act=day][data-arg="4"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'../shots/{name}-6b-steps.png')
        await pg.click('[data-act=step][data-arg="2"]'); await pg.wait_for_timeout(600); await pg.screenshot(path=f'../shots/{name}-6c-jump.png')
        a = await pg.evaluate("YUNI.act && YUNI.act.type"); print(' jumped to', a, await pg.evaluate("JSON.stringify(YUNI.state.pos)"))
        # v1.4.0: 곤충 4일차 = 새 단어 16~20번 + 1~15번 중 복습, 새 질문 7·8번 + 앞 질문 복습
        mix = await pg.evaluate("""(()=>{ const L=YUNI.lesson, T=CONTENT.topics[3];
          const nw=L.words.map(w=>w.en), exp=T.words.slice(15,20).map(w=>w.en), prev=T.words.slice(0,15).map(w=>w.en);
          const quiz=YUNI.buildStep(2).filter(a=>a.type!=='intro'), speak=YUNI.buildStep(3), talk=YUNI.buildStep(4);
          const again=YUNI.buildStep(2);
          return { nw, exp, old:L.old.map(x=>x.w.en), oldOk:L.old.length===3 && L.old.every(x=>x.t===3 && prev.includes(x.w.en)),
            quiz:quiz.length, quizOld:quiz.filter(a=>a.old).length, speak:speak.length, speakOld:speak.filter(a=>a.old).length,
            talk:talk.map(a=>a.q.q), talkNew: talk[0].q===T.questions[6] && talk[1].q===T.questions[7] && T.questions.slice(0,6).includes(talk[2].q),
            same: again===YUNI.buildStep(2) }; })()""")
        print(' mix', json.dumps(mix, ensure_ascii=False))
        REQ['REQ-25 새 단어·질문과 복습 섞기'] = mix['nw']==mix['exp'] and mix['oldOk'] and mix['quiz']==8 and mix['quizOld']==3 and mix['speak']==7 and mix['speakOld']==2 and mix['talkNew'] and mix['same']
        await pg.click('[data-act=quit]'); await pg.click('[data-act=parent]'); await pg.wait_for_timeout(200)
        # v1.6.0 공통 61: 아빠 화면 암호 (기본 1234)
        await pg.screenshot(path=f'../shots/{name}-7a-gate.png')
        async def gate(pin):
            await pg.fill('#ans', pin); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(250)
            return await pg.evaluate("!!document.querySelector('.ptabs')")
        async def open_parent(pin):
            await pg.click('[data-act=home]'); await pg.wait_for_timeout(150); await pg.click('[data-act=parent]'); await pg.wait_for_timeout(150)
            return await gate(pin)
        async def tab(k):
            await pg.click(f'.ptab[data-arg="{k}"]'); await pg.wait_for_timeout(150)
        # v1.6.0 공통 63: 탭 상태 (탭 6개, 보이는 패널 1개, 켜진 탭 = 보이는 패널)
        tabstate = "(()=>{const on=[...document.querySelectorAll('.ptab.on')].map(b=>b.dataset.arg); const vis=[...document.querySelectorAll('.ppanel')].filter(p=>!p.hidden && p.offsetParent!==null).map(p=>p.dataset.panel); return {tabs:document.querySelectorAll('.ptab').length, on, vis}})()"
        async def tab_ok(k):
            s = await pg.evaluate(tabstate); return s['tabs']==6 and s['on']==[k] and s['vis']==[k]
        pin_wrong = await gate('0000')
        pin_ok = await gate('1234')
        print(' pin wrong->', pin_wrong, ' 1234->', pin_ok)
        await pg.screenshot(path=f'../shots/{name}-7-parent.png', full_page=True)
        t63 = [await tab_ok('summary')]
        noscroll = "document.documentElement.scrollWidth <= innerWidth"  # 가로 스크롤 없음
        nx = [await pg.evaluate(noscroll)]
        for k in ['stats','reward','progress','settings','manage']:
            await tab(k); t63.append(await tab_ok(k)); nx.append(await pg.evaluate(noscroll))
        await tab('manage')
        await pg.fill('#pcode','11-4-2'); await pg.click('[data-act=setpos]'); print(' setpos', await pg.evaluate("JSON.stringify(YUNI.state.pos)"))
        t63.append(await tab_ok('manage'))  # 다시 그려도 같은 탭
        # 다시 그린 뒤에도 켜진 탭이 화면 안에 보임 (폰에서 탭 바 가로 스크롤)
        inview = await pg.evaluate("(()=>{const r=document.querySelector('.ptab.on').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()")
        print(' no h-scroll per tab', nx, ' active tab in view after re-render', inview)
        REQ['REQ-63 켜진 탭 보임·가로 스크롤 없음'] = inview and all(nx) and len(nx) == 6
        await pg.click('[data-act=export]'); code = await pg.input_value('#backup'); print(' backup len', len(code))
        # v1.2.0: 진도 조정·별 조정·보상 기록·진도 초기화
        await tab('progress')
        await pg.select_option('#adjT', '4'); await pg.select_option('#adjD', '3'); await pg.select_option('#adjS', '2'); await pg.check('#adjMark'); await pg.click('[data-act=adjpos]')
        adj = await pg.evaluate("JSON.stringify({pos:YUNI.state.pos, done:Object.keys(YUNI.state.done).length, stickers:Object.keys(YUNI.state.stickers)})"); print(' adjpos', adj)
        REQ['REQ-14 진도 조정'] = '"t":4,"d":3,"s":2' in adj and '"done":42' in adj
        t63.append(await tab_ok('progress'))
        await tab('settings')
        # 공통 65: 녹음 목소리(기본)면 audio-ko 요청·기기 음성 없음 → 기기 음성으로 바꾸면 audio-ko 요청 없이 끊어 읽기(REQ-20)
        await pg.evaluate("window.__said=[]"); KOREQ.clear(); await pg.click('[data-act=kotest]'); await pg.wait_for_timeout(1500)
        rec_req = len(KOREQ); rec_said = await pg.evaluate("window.__said.filter(t=>/[가-힣]/.test(t)).length")
        await pg.select_option('[data-set=koVoiceMode]', 'device'); await pg.wait_for_timeout(150)
        await pg.evaluate("window.__said=[]"); KOREQ.clear(); await pg.click('[data-act=kotest]'); await pg.wait_for_timeout(800)
        dev_req = len(KOREQ); dev_said = len(await pg.evaluate("window.__said"))
        await pg.select_option('[data-set=koVoiceMode]', 'rec'); await pg.wait_for_timeout(150)
        print(' 65 kotest: 녹음 요청', rec_req, '기기 음성', rec_said, '/ 기기 음성 설정: 녹음 요청', dev_req, '기기 음성', dev_said)
        REQ['REQ-65 녹음 목소리로 한국어 들어보기'] = rec_req >= 3 and rec_said == 0
        REQ['REQ-65 기기 음성 설정이면 녹음 안 씀'] = dev_req == 0
        REQ['REQ-20 한국어 끊어 읽기 (기기 음성)'] = dev_said >= 3
        await tab('manage')
        await pg.click('[data-act=checkver]'); await pg.wait_for_timeout(800)
        REQ['REQ-23 새 버전 확인'] = '최신 버전' in await pg.inner_text('#verInfo')
        await pg.click('[data-act=spec]'); await pg.wait_for_timeout(600)
        spec = await pg.inner_text('#spec'); await pg.screenshot(path=f'../shots/{name}-7d-spec.png')
        REQ['REQ-21 앱 안 기획서'] = 'REQ-01' in spec and 'REQ-65' in spec
        await pg.click('[data-act=back]'); await pg.wait_for_timeout(300)
        t63.append(await tab_ok('manage'))  # 기획서 보고 돌아와도 같은 탭
        await tab('reward')
        await pg.click('[data-act=star][data-arg="1"]'); await pg.wait_for_timeout(150)
        t63.append(await tab_ok('reward'))  # 별 +1 (화면 다시 그림) 뒤에도 보상·별 탭
        await pg.click('[data-act=star][data-arg="10"]'); await pg.click('[data-act=star][data-arg="-1"]'); await pg.fill('#starSet','60'); await pg.click('[data-act=starset]')
        t63.append(await tab_ok('reward'))
        await tab('settings')
        await pg.locator('[data-act=gave]').first.click(); print(' stars/rewards', await pg.evaluate("JSON.stringify({stars:YUNI.state.stars, base:YUNI.state.goalBase, rewards:YUNI.state.rewards})"))
        t63.append(await tab_ok('settings'))
        await pg.screenshot(path=f'../shots/{name}-7b-parent-new.png', full_page=True)
        await tab('progress')
        await pg.click('#resetProgBtn'); await pg.click('#resetProgBtn')
        rp = await pg.evaluate("JSON.stringify({pos:YUNI.state.pos, done:Object.keys(YUNI.state.done).length, stars:YUNI.state.stars, rewards:YUNI.state.rewards.length})"); print(' resetprog', rp)
        REQ['REQ-14 진도 초기화(별·보상 유지)'] = '"done":0' in rp and '"stars":60' in rp and '"rewards":1' in rp
        REQ['REQ-15 보상 기록'] = '"rewards":1' in rp
        t63.append(await tab_ok('progress'))
        print(' tabs', t63)
        REQ['REQ-63 아빠 화면 탭 메뉴 (6개·한 패널·다시 그려도 같은 탭)'] = all(t63) and len(t63) == 13
        # v1.6.0 공통 62: 날짜별 학습 시간·별 통계 (지난 날 기록을 넣고 확인)
        seed = await pg.evaluate("""(()=>{ const p=n=>String(n).padStart(2,'0'); const ag=n=>{const d=new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;};
          const L=YUNI.state.log; L[ag(1)]={sec:600,stars:12}; L[ag(3)]={sec:900,stars:20,app:1500}; L[ag(10)]={sec:300,stars:5}; L[ag(20)]={sec:1200,stars:31};
          return {d1:ag(1), d3:ag(3), d10:ag(10), d20:ag(20)}; })()""")
        await tab('stats'); await pg.click('[data-act=statdays][data-arg="7"]'); await pg.wait_for_timeout(150)
        row = lambda d: pg.inner_text(f'.stat-row[data-date="{d}"]')
        n7 = await pg.locator('.stat-row').count(); r1 = await row(seed['d1']); r3 = await row(seed['d3']); head = await pg.inner_text('#statsCard .kv')
        await pg.screenshot(path=f'../shots/{name}-7e-stats.png', full_page=True)
        t62 = [n7 == 7, '10분' in r1 and '12개' in r1, '15분' in r3 and '20개' in r3 and '앱 켠 시간 25분' in r3,
               await pg.locator('.stat-row[data-date="%s"]' % seed['d10']).count() == 0, await tab_ok('stats')]
        await pg.click('[data-act=statdays][data-arg="14"]'); await pg.wait_for_timeout(150)
        t62 += [await pg.locator('.stat-row').count() == 14, '5분' in await row(seed['d10']), await tab_ok('stats')]
        await pg.click('[data-act=statdays][data-arg="30"]'); await pg.wait_for_timeout(150)
        t62 += [await pg.locator('.stat-row').count() == 30, '31개' in await row(seed['d20']) and '20분' in await row(seed['d20'])]
        await pg.click('[data-act=statdays][data-arg="7"]'); await pg.wait_for_timeout(150)
        t62.append(await pg.locator('.stat-row').count() == 7)
        print(' stats', t62, head.replace('\n', ' '))
        REQ['REQ-62 날짜별 학습 시간·별 통계 (7·14·30일)'] = all(t62)
        # v1.6.0 공통 61: 암호 바꾸기 → 새 암호로만 열림, "암호를 잊었어요" → 곱셈 맞히면 1234
        await tab('settings')
        await pg.fill('#pinNew','5678'); await pg.fill('#pinNew2','5679'); await pg.click('[data-act=setpin]'); await pg.wait_for_timeout(150)
        mism = await pg.evaluate("YUNI.state.settings.parentPin") == '1234'
        await pg.fill('#pinNew','5678'); await pg.fill('#pinNew2','5678'); await pg.click('[data-act=setpin]'); await pg.wait_for_timeout(150)
        saved = await pg.evaluate("JSON.parse(localStorage.getItem('yuni-english-v1')).settings.parentPin") == '5678' and await tab_ok('settings')
        old_no = not await open_parent('1234')
        new_ok = await gate('5678')
        await pg.click('[data-act=home]'); await pg.click('[data-act=parent]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act=forgot]'); await pg.wait_for_timeout(150)
        q = await pg.inner_text('.gate .card div'); x,y = [int(v) for v in q.replace('= ?','').split('×')]
        await pg.screenshot(path=f'../shots/{name}-7f-pinreset.png')
        await pg.fill('#ans', str(x*y+1)); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(150)
        bad_no = await pg.evaluate("YUNI.state.settings.parentPin") == '5678' and not await pg.evaluate("!!document.querySelector('.ptabs')")
        q = await pg.inner_text('.gate .card div'); x,y = [int(v) for v in q.replace('= ?','').split('×')]
        await pg.fill('#ans', str(x*y)); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(250)
        reset_ok = await pg.evaluate("YUNI.state.settings.parentPin") == '1234' and await tab_ok('settings')
        again = await open_parent('1234')
        t61 = [not pin_wrong, pin_ok, mism, saved, old_no, new_ok, bad_no, reset_ok, again]
        print(' pin', t61)
        REQ['REQ-61 아빠 화면 암호 (1234·변경·잊었어요)'] = all(t61)
        await pg.click('[data-act=home]'); await pg.click('[data-act=rewards]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{name}-7c-rewards.png')
        await pg.click('[data-act=home]'); await pg.click('[data-act=stickers]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'../shots/{name}-8-stickers.png')
        said = await pg.evaluate("(window.__said||[]).filter(t=>!/[가-힣]/.test(t))")
        print(' english via device TTS:', said[:10], len(said))
        REQ['REQ-12 영어 원어민 녹음'] = len(said) == 0
        # 모든 영어 문장에 녹음이 있는지 (content.js 전체)
        miss = await pg.evaluate("""fetch('audio/index.json').then(r=>r.json()).then(idx=>{ const m=[]; for(const t of CONTENT.topics){ for(const w of t.words){ if(!idx[w.en]) m.push(w.en); if(!idx['slow|'+w.en]) m.push('slow|'+w.en);} for(const q of t.questions){ if(!idx[q.q]) m.push(q.q); const a=YUNI.fill(q.answer); if(!idx[a]) m.push(a);} } return m; })""")
        print(' 녹음 없는 문장:', miss[:8], len(miss))
        REQ['REQ-12 전체 단어·질문 녹음'] = len(miss) == 0
        REQ['화면 오류 없음'] = not errs
        print(' ---- 요구사항 점검 ----')
        for k, v in REQ.items(): print('  ', 'OK  ' if v else 'FAIL', k)
        print(' 결과:', 'ALL OK' if all(REQ.values()) else 'FAIL 있음')
        print(' errors:', errs)
        await b.close()
if __name__=="__main__": asyncio.run(run(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]=='1'))
