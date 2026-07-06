const firebaseConfig = {
  apiKey: "AIzaSyB5oFSIDXhzHaFgTR5cr1LvGHXFNStLSWk",
  authDomain: "minority-game-45d67.firebaseapp.com",
  databaseURL: "https://minority-game-45d67-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "minority-game-45d67",
  storageBucket: "minority-game-45d67.firebasestorage.app",
  messagingSenderId: "49514258718",
  appId: "1:49514258718:web:b89014318539af2e13e90f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const $app = document.getElementById('app');
const qs = new URLSearchParams(location.search);
const MODE = qs.get('mode') || 'home';
let room = qs.get('room') || localStorage.getItem('msg_room_v8') || localStorage.getItem('msg_room') || '';
let roomRef = null;
let state = {};

const STOCKS = [
  { key:'A', name:'A 주식', base:50, desc:'기본 점수 50점' },
  { key:'B', name:'B 주식', base:40, desc:'기본 점수 40점' },
  { key:'C', name:'C 주식', base:30, desc:'기본 점수 30점' },
];
const DEFAULT_EVENT_MULTIPLIER = 1;

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const now = () => Date.now();
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const fmt = n => Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1).replace(/\.0$/,'');
const normName = s => String(s || '').trim().replace(/\s+/g,' ').toLowerCase();

function route(mode, extra=''){ location.href = `${location.pathname}?mode=${mode}${extra}`; }
function code(){ return (room || 'ROOM').toUpperCase(); }
function roomPath(){ return 'stockRoomsV8/'+code(); }
function teacherUrl(){ return `${location.origin}${location.pathname}?mode=teacher&room=${encodeURIComponent(code())}`; }
function studentUrl(){ return `${location.origin}${location.pathname}?mode=student&room=${encodeURIComponent(code())}`; }
function displayUrl(){ return `${location.origin}${location.pathname}?mode=display&room=${encodeURIComponent(code())}`; }
function qrUrl(text){ return 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data='+encodeURIComponent(text); }
function makeCode(){ return Math.random().toString(36).replace(/[^a-z0-9]/g,'').slice(2,8).toUpperCase(); }
function makeId(prefix='s'){ return prefix+'_'+Math.random().toString(36).slice(2)+Date.now(); }
function deviceId(){
  let id = localStorage.getItem('msg_device_id_v8');
  if(!id){ id=makeId('d'); localStorage.setItem('msg_device_id_v8', id); }
  return id;
}
function legacyStudentId(){
  let id = localStorage.getItem('msg_student_id_v8');
  if(!id){ id=makeId('s'); localStorage.setItem('msg_student_id_v8', id); }
  return id;
}
function playerKey(r=code()){ return 'msg_player_id_v8_'+String(r||'').toUpperCase(); }
function studentId(){
  if(room){
    const saved = localStorage.getItem(playerKey());
    if(saved) return saved;
  }
  return legacyStudentId();
}
function setPlayerId(id, r=code()){
  if(id && r) localStorage.setItem(playerKey(r), id);
  if(id) localStorage.setItem('msg_student_id_v8', id); // 구버전 화면과의 호환용
}
function newPlayerId(){ return makeId('p'); }
function connect(cb){
  if(!room) return;
  if(roomRef) roomRef.off();
  roomRef = db.ref(roomPath());
  roomRef.on('value', snap => { state = snap.val() || {}; cb && cb(); });
}
function participants(st=state){ return st.participants || {}; }
function answers(st=state){ return st.answers || {}; }
function scores(st=state){ return st.scores || {}; }
function activeRound(st=state){ return Number(st.round || 0); }
function eventMultiplier(st=state){ return Math.max(1, Number(st.eventMultiplier || DEFAULT_EVENT_MULTIPLIER)); }
function countsOf(st=state){
  const ans = Object.values(answers(st));
  const counts = STOCKS.map((_,i)=>ans.filter(a=>Number(a.choice)===i).length);
  return { counts, submitted: ans.length, expected: Object.keys(participants(st)).length };
}
function multipliers(counts){
  const unique = [...new Set(counts)].sort((a,b)=>a-b);
  if(unique.length <= 1) return counts.map(()=>1);
  const min = unique[0], max = unique[unique.length-1];
  return counts.map(c => c===min ? 2 : c===max ? 0.5 : 1);
}
function roundScores(counts, st=state){
  const m = multipliers(counts);
  const event = eventMultiplier(st);
  return STOCKS.map((s,i)=>s.base*m[i]*event);
}
function board(st=state){
  return Object.entries(scores(st)).map(([id,s])=>({id, name:s.name||participants(st)[id]?.name||'이름없음', total:Number(s.total||0), last:Number(s.last||0), lastChoice:s.lastChoice})).sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name));
}
function copyText(t){ navigator.clipboard?.writeText(t); alert('복사했습니다.'); }
function fullScreen(){ document.documentElement.requestFullscreen?.(); }
function beep(type='click'){
  if(localStorage.getItem('msg_sound')==='off') return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = type==='win'?880:type==='start'?520:660; g.gain.value=.045;
    o.start(); setTimeout(()=>{o.stop();ctx.close();}, type==='win'?380:150);
  }catch(e){}
}

function home(){
  const last = localStorage.getItem('msg_room') || '';
  $app.innerHTML = `<main class="wrap narrow">
    <section class="hero">
      <div class="logo">📈</div>
      <h1>소수결 주식 게임 <span>v8.4</span></h1>
      <p>A·B·C 중 친구들이 적게 고를 주식을 예측하세요. 학생은 라운드 마감 전까지 조용히 선택을 바꿀 수 있습니다.</p>
      <div class="homeButtons">
        <button onclick="createRoom()">교사용 방 만들기</button>
        <button class="blue" onclick="route('student')">학생 입장</button>
      </div>
      ${last?`<button class="ghost" onclick="route('teacher','&room=${encodeURIComponent(last)}')">최근 방 이어하기: ${esc(last)}</button>`:''}
      <div class="miniRule">
        <b>A 50점</b><b>B 40점</b><b>C 30점</b>
        <span>가장 적게 선택 +100%</span><span>중간 유지</span><span>가장 많이 선택 -50%</span><span>이벤트 n배 가능</span>
      </div>
    </section>
  </main>`;
}
async function createRoom(){
  const custom = prompt('방 코드를 직접 입력하거나, 비워두면 자동 생성됩니다.\n예: 6-3, BONGDAE, STOCK1') || '';
  room = (custom.trim() || makeCode()).replace(/\s+/g,'').toUpperCase();
  localStorage.setItem('msg_room_v8', room); localStorage.setItem('msg_room', room);
  const ref = db.ref(roomPath());
  const snap = await ref.once('value');
  if(!snap.exists()){
    await ref.set({
      title:'소수결 주식 게임', createdAt:now(), round:0, status:'waiting', showResults:false, scored:false,
      stocks: STOCKS, participants:{}, answers:{}, scores:{}, history:[], eventMultiplier:1, openedAt:0
    });
  }
  route('teacher', '&room='+encodeURIComponent(room));
}

function teacher(){
  if(!room){ home(); return; }
  localStorage.setItem('msg_room', code());
  connect(renderTeacher);
  renderTeacher();
}
function renderTeacher(){
  const {counts, submitted, expected} = countsOf();
  const missing = Object.entries(participants()).filter(([id])=>!answers()[id]);
  const progress = clamp(Math.round(submitted/Math.max(1,expected)*100),0,100);
  const rs = roundScores(counts, state);
  const b = board();
  const history = Array.isArray(state.history) ? state.history : [];
  $app.innerHTML = `<main class="wrap">
    <div class="top"><div><h1>소수결 주식 게임 <span>교사용 v8.4</span></h1><p>방 코드 ${esc(code())} · QR 입장 · 실시간 제출 · 선택 수정 가능 · 무음 학생 화면 · n배 이벤트</p></div>
    <div class="topButtons"><button class="ghost" onclick="fullScreen()">전체화면</button><button class="ghost" onclick="route('home')">처음으로</button></div></div>

    <section class="grid">
      <div class="card"><h2>학생 접속</h2>
        <label>방 코드</label><input value="${esc(code())}" readonly>
        <div class="urlbox">${esc(studentUrl())}</div>
        <button class="smallBtn" onclick="copyText('${esc(studentUrl())}')">학생 주소 복사</button>
        <a class="smallBtn linkBtn" href="${esc(displayUrl())}" target="_blank" rel="noopener">전자칠판 화면</a>
        <div class="urlbox boardUrl">전자칠판 주소: ${esc(displayUrl())}</div>
        <img class="qr" src="${qrUrl(studentUrl())}" alt="학생 접속 QR">
      </div>
      <div class="card"><h2>라운드 준비</h2>
        <label>이번 라운드 이벤트 배율</label>
        <div class="eventInputRow"><input id="eventMultiplier" type="number" min="1" step="1" value="${esc(eventMultiplier())}"><span>배</span></div>
        <p class="hint">기본은 1배입니다. 특별 이벤트 라운드는 2, 3, 4처럼 입력하세요.</p>
        <div class="stockCards">${STOCKS.map(s=>`<div><b>${s.name}</b><span>${s.base}점</span></div>`).join('')}</div>
        <button ${activeRound()>0 && state.status==='open' ? 'class="disabledBtn"' : ''} onclick="startRound()">새 라운드 시작</button>
        <button class="secondary" onclick="resetAnswers()">응답 초기화</button>
        <button class="ghost" onclick="resetRoom()">방 전체 초기화</button>
      </div>
    </section>

    <section class="statusGrid">
      <div class="stat"><b>${expected}</b><span>입장 인원</span></div>
      <div class="stat"><b>${expected}</b><span>제출 예정</span></div>
      <div class="stat good"><b>${submitted}</b><span>제출 완료</span></div>
      <div class="stat warn"><b>${Math.max(0, expected-submitted)}</b><span>미제출</span></div>
    </section>

    <section class="card stage">
      <div class="stageHead"><h2>${activeRound()?activeRound()+'라운드':'대기 중'} ${state.status==='open'?'진행 중':state.showResults?'결과 공개':'준비 중'}</h2><div class="pill">${submitted}/${expected} 제출</div></div>
      <div class="progress"><div style="width:${progress}%"></div></div>
      <p class="eventBox">이번 라운드 점수 ${fmt(eventMultiplier())}배 적용</p>
      <div class="countGrid">${STOCKS.map((s,i)=>`<div><b>${s.key}</b><span>${counts[i]}명</span><em>${state.showResults?fmt(rs[i])+'점':'?'}</em></div>`).join('')}</div>
      <button class="reveal ${expected>0 && submitted>=expected ? 'readyClose' : ''}" onclick="closeRound()">${expected>0 && submitted>=expected ? '모두 제출 완료! 마감하기' : '라운드 마감 + 점수 반영'}</button>
      <details class="missing"><summary>미제출 학생 ${missing.length}명 보기</summary>${missing.length?missing.map(([id,p])=>`<span>${esc(p.name)}</span>`).join(''):'<p>모두 제출했습니다.</p>'}</details>
    </section>

    <section class="grid">
      <div class="card"><h2>라운드별 ABC 점수 그래프</h2>${chartHtml(history)}</div>
      <div class="card"><h2>현재 순위</h2>${rankingHtml(b)}<button class="ghost" onclick="downloadCSV()">CSV 저장</button></div>
    </section>

    <section class="card"><h2>입장 학생</h2>${studentListHtml()}</section>
  </main>`;
}
async function startRound(){
  if(activeRound() > 0 && state.status === 'open'){
    alert('이전 라운드를 먼저 마감해주세요.');
    return;
  }
  const event = Math.max(1, Number(document.getElementById('eventMultiplier')?.value || 1));
  beep('start');
  await db.ref(roomPath()).update({
    round: activeRound()+1, status:'open', showResults:false, scored:false, openedAt:now(), eventMultiplier:event,
    answers:{}, lastCounts:null, lastScores:null
  });
}
async function resetAnswers(){ await db.ref(roomPath()).update({answers:{}, showResults:false, scored:false, status:'open'}); }
async function resetRoom(){
  if(!confirm('방의 학생, 점수, 기록을 모두 초기화할까요?')) return;
  await db.ref(roomPath()).set({title:'소수결 주식 게임', createdAt:now(), round:0, status:'waiting', showResults:false, scored:false, participants:{}, answers:{}, scores:{}, history:[], eventMultiplier:1, openedAt:0});
}
async function closeRound(){
  const snap = await db.ref(roomPath()).once('value');
  const st = snap.val() || {};
  if(st.status !== 'open'){
    alert('진행 중인 라운드가 없습니다. 새 라운드를 먼저 시작해주세요.');
    return;
  }
  if(st.scored){ await db.ref(roomPath()).update({showResults:true,status:'closed'}); return; }
  const currentParticipants = participants(st);
  const currentAnswers = answers(st);
  const missing = Object.entries(currentParticipants).filter(([id])=>!currentAnswers[id]);
  if(missing.length > 0){
    const names = missing.slice(0, 12).map(([id,p]) => `- ${p?.name || '이름없음'}`).join('\n');
    const more = missing.length > 12 ? `\n외 ${missing.length - 12}명` : '';
    const ok = confirm(`아직 제출하지 않은 학생이 있습니다.\n그래도 라운드를 마감하시겠습니까?\n\n미제출 학생: ${missing.length}명\n${names}${more}`);
    if(!ok) return;
  }
  const {counts} = countsOf(st);
  const rScores = roundScores(counts, st);
  const ans = answers(st), old = scores(st), nextScores = {...old};
  Object.entries(ans).forEach(([id,a])=>{
    const choice = Number(a.choice);
    const add = Number(rScores[choice] || 0);
    nextScores[id] = { name: a.name || participants(st)[id]?.name || old[id]?.name || '이름없음', total:Number(old[id]?.total||0)+add, last:add, lastChoice:choice };
  });
  Object.entries(participants(st)).forEach(([id,p])=>{ if(!nextScores[id]) nextScores[id] = {name:p.name,total:0,last:0}; });
  const hist = [...(Array.isArray(st.history)?st.history:[]), {round:st.round, eventMultiplier:eventMultiplier(st), counts, scores:rScores, at:now()}].slice(-30);
  beep('win');
  await db.ref(roomPath()).update({showResults:true, scored:true, status:'closed', scores:nextScores, lastCounts:counts, lastScores:rScores, history:hist});
}
function rankingHtml(b){
  if(!b.length) return '<p class="hint">아직 점수가 없습니다.</p>';
  return `<div class="scoreboard">${b.map((s,i)=>`<div class="scoreRow"><span class="rank">${i+1}</span><b>${esc(s.name)}</b><span>총 ${fmt(s.total)}점</span><em>이번 ${s.last?`+${fmt(s.last)}`:'-'}</em></div>`).join('')}</div>`;
}
function studentListHtml(){
  const ps = Object.entries(participants());
  if(!ps.length) return '<p class="hint">아직 입장한 학생이 없습니다.</p>';
  return `<div class="studentList">${ps.map(([id,p])=>{
    const a=answers()[id];
    const allow = p?.allowNewDevice === true;
    const deviceState = allow ? ' · 새 기기 재입장 허용 중' : (p?.deviceId ? ' · 기기 잠금' : ' · 기기 미등록');
    const buttonText = allow ? '재입장 허용 취소' : '재입장 허용';
    const buttonClass = allow ? 'tinyBtn dangerTiny' : 'tinyBtn';
    return `<span>${a?'✅':'⬜'} ${esc(p.name)}${a?' · '+STOCKS[Number(a.choice)]?.key:''}${deviceState}<button class="${buttonClass}" onclick="toggleRejoin('${esc(id)}')">${buttonText}</button></span>`
  }).join('')}</div>`;
}
async function toggleRejoin(id){
  const snap = await db.ref(roomPath()+'/participants/'+id).once('value');
  const p = snap.val() || {};
  if(p.allowNewDevice === true){
    if(!confirm('재입장 허용을 취소할까요?')) return;
    await db.ref(roomPath()+'/participants/'+id).update({allowNewDevice:false, deviceTransferCanceledAt:now()});
    return;
  }
  if(!confirm('이 학생이 다른 기기로 같은 이름 재입장할 수 있게 허용할까요?\n\n허용 후 학생이 새 기기로 입장하면 자동으로 다시 잠깁니다.')) return;
  await db.ref(roomPath()+'/participants/'+id).update({allowNewDevice:true, deviceTransferAllowedAt:now()});
}
function chartHtml(history){
  if(!history.length) return '<p class="hint">라운드가 마감되면 그래프가 나타납니다.</p>';
  const W=760,H=330,L=48,R=18,T=24,B=42;
  const maxY=Math.max(100, ...history.flatMap(h=>h.scores||[]));
  const x = i => L + (history.length===1 ? (W-L-R)/2 : i*(W-L-R)/(history.length-1));
  const y = v => T + (maxY-v)*(H-T-B)/maxY;
  const colors=['#2563eb','#16a34a','#dc2626'];
  const lines = STOCKS.map((s,si)=>{
    const pts=history.map((h,i)=>`${x(i)},${y((h.scores||[])[si]||0)}`).join(' ');
    const dots=history.map((h,i)=>`<circle cx="${x(i)}" cy="${y((h.scores||[])[si]||0)}" r="5"><title>${s.key} ${h.round}R: ${fmt((h.scores||[])[si]||0)}점</title></circle>`).join('');
    return `<g class="line l${si}"><polyline points="${pts}" fill="none" stroke="${colors[si]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</g>`;
  }).join('');
  const xLabels=history.map((h,i)=>`<text x="${x(i)}" y="${H-12}" text-anchor="middle">${h.round}R</text>`).join('');
  const gridVals=[0,.25,.5,.75,1].map(r=>Math.round(maxY*r));
  const yGrid=gridVals.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-10}" y="${y(v)+5}" text-anchor="end">${v}</text>`).join('');
  return `<div class="legend"><b>A 50점</b><b>B 40점</b><b>C 30점</b><span>이벤트 배율 포함</span></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="라운드별 ABC 점수 그래프"><g class="gridLines">${yGrid}</g>${lines}<g class="xLabels">${xLabels}</g></svg>`;
}
function downloadCSV(){
  const rows=[['순위','이름','총점','이번점수','마지막선택']];
  board().forEach((s,i)=>rows.push([i+1,s.name,fmt(s.total),fmt(s.last),s.lastChoice==null?'':STOCKS[s.lastChoice]?.key]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); a.download=`소수결주식게임_${code()}_결과.csv`; a.click();
}

function student(){
  room = qs.get('room') || localStorage.getItem('msg_room') || '';
  if(room) connect(renderStudent);
  renderStudent();
}
async function assertCurrentDevice(){
  if(!room || !localStorage.getItem('msg_joined_'+code())) return true;
  const sid = studentId();
  const snap = await db.ref(roomPath()+'/participants/'+sid).once('value');
  const p = snap.val();
  if(!p) return true;
  const registeredDevice = p.deviceId || null;
  const myDeviceId = deviceId();
  if(registeredDevice && registeredDevice !== myDeviceId){
    localStorage.removeItem('msg_joined_'+code());
    localStorage.removeItem(playerKey());
    alert('이 이름은 다른 기기에서 사용 중입니다. 다른 이름으로 입장하거나 선생님께 재입장 허용을 요청하세요.');
    route('student','&room='+encodeURIComponent(code()));
    return false;
  }
  return true;
}
function renderStudent(){
  const name = localStorage.getItem('msg_name') || '';
  const sid = studentId();
  if(!room || !localStorage.getItem('msg_joined_'+code())){
    $app.innerHTML = `<main class="wrap narrow student"><section class="card"><h1>소수결 주식 게임</h1><p>방 코드와 이름을 입력하세요.</p><label>방 코드</label><input id="sRoom" value="${esc(room)}" placeholder="예: ABC123"><label>이름 또는 번호</label><input id="sName" value="${esc(name)}" placeholder="예: 6번 김OO"><button class="blue" onclick="joinStudent()">입장하기</button></section></main>`; return;
  }
  const opened = Number(state.openedAt||0);
  const submittedKey = 'msg_submitted_'+code();
  const submittedAt = Number(localStorage.getItem(submittedKey)||0);
  const already = opened && submittedAt === opened;
  const myAnswer = answers()[sid];
  const canSubmit = state.status==='open' && opened && name.trim();
  const {submitted, expected} = countsOf();
  $app.innerHTML = `<main class="wrap student"><h1>소수결 주식 게임 <span>학생 v8.4</span></h1>
    <section class="card stage tabletStage"><div class="studentNameBox"><label>이름 또는 번호</label><input id="sName2" value="${esc(name)}" onchange="updateStudentName(this.value)"></div>
    <div class="roundBadge">${activeRound()?activeRound()+'라운드':'대기 중'} · 제출 ${submitted}/${expected}</div><div class="landscapeNotice">갤럭시 탭은 가로모드에서 A/B/C 버튼이 크게 보입니다.</div>
    <h2>${state.status==='open'?'어떤 주식을 살까요?':'선생님이 라운드를 시작할 때까지 기다려 주세요.'}</h2>
    <p class="eventBox">이번 라운드 점수 ${fmt(eventMultiplier())}배 적용</p>
    <div class="choices">${STOCKS.map((s,i)=>`<button class="choice stock${i} ${myAnswer && Number(myAnswer.choice)===i ? 'selected' : ''}" ${canSubmit?'':'disabled'} onclick="submitAnswer(${i})"><b>${s.key}</b><span>${s.name}</span><em>기본 ${s.base}점</em></button>`).join('')}</div>
    <p class="status">${!name.trim()?'먼저 이름을 입력하세요.':myAnswer && state.status==='open' ? `현재 선택: ${STOCKS[Number(myAnswer.choice)]?.key || ''} · 라운드 종료 전까지 수정할 수 있습니다.` : myAnswer ? '라운드가 종료되어 선택을 수정할 수 없습니다.' : state.status==='open'?'친구들이 적게 고를 것 같은 주식을 고르세요. 제출 후에도 라운드 종료 전까지 수정할 수 있습니다.':'대기 중입니다.'}</p>
    </section>
    ${state.showResults?`<section class="card"><h2>최근 결과</h2>${miniResultHtml()}</section>`:''}
  </main>`;
}
async function joinStudent(){
  room=(document.getElementById('sRoom').value||'').trim().toUpperCase();
  const name=(document.getElementById('sName').value||'').trim();
  if(!room) return alert('방 코드를 입력하세요.');
  if(!name) return alert('이름 또는 번호를 입력하세요.');

  const roomSnap = await db.ref('stockRoomsV8/'+room).once('value');
  if(!roomSnap.exists()) return alert('방을 찾을 수 없습니다. 방 코드를 다시 확인하세요.');
  const roomState = roomSnap.val() || {};
  const ps = roomState.participants || {};
  const myDeviceId = deviceId();
  const savedForRoom = localStorage.getItem(playerKey(room));
  const same = Object.entries(ps).find(([id,p]) => normName(p && p.name) === normName(name));

  let sid = savedForRoom || newPlayerId();
  let isResume = false;
  let transferFromDevice = null;

  if(same){
    const [existingId, existingPlayer] = same;
    const existingDevice = existingPlayer?.deviceId || null;
    const sameDevice = existingDevice && existingDevice === myDeviceId;
    const teacherAllowedNewDevice = existingPlayer?.allowNewDevice === true;
    const legacySameBrowser = !existingDevice && savedForRoom === existingId;

    if(sameDevice || legacySameBrowser){
      // 같은 기기(또는 구버전에서 같은 브라우저에 저장된 학생)만 이어하기 허용
      sid = existingId;
      isResume = true;
    }else if(teacherAllowedNewDevice){
      // 교사가 허용한 경우에만 새 기기로 이전 가능. 이전 후 자동으로 다시 잠금.
      sid = existingId;
      isResume = true;
      transferFromDevice = existingDevice || null;
    }else{
      return alert('이미 있는 이름입니다. 다른 이름을 입력해주세요.\n\n기기를 바꾸어 이어하려면 선생님께 재입장 허용을 요청하세요.');
    }
  }else{
    // 저장된 ID가 다른 이름으로 이미 쓰이고 있으면 새 ID를 발급
    if(sid && ps[sid] && normName(ps[sid]?.name) !== normName(name)) sid = newPlayerId();
  }

  setPlayerId(sid, room);
  localStorage.setItem('msg_room_v8', room);
  localStorage.setItem('msg_room', room);
  localStorage.setItem('msg_name', name);
  localStorage.setItem('msg_joined_'+room, '1');

  await db.ref('stockRoomsV8/'+room+'/participants/'+sid).update({
    name,
    deviceId: myDeviceId,
    allowNewDevice:false,
    joinedAt: ps[sid]?.joinedAt || now(),
    rejoinedAt: isResume ? now() : null,
    transferredFromDevice: transferFromDevice,
    transferredAt: transferFromDevice ? now() : (ps[sid]?.transferredAt || null),
    lastSeen: now()
  });
  location.href = `${location.pathname}?mode=student&room=${encodeURIComponent(room)}`;
}
async function updateStudentName(v){
  if(!(await assertCurrentDevice())) return;
  const name=(v||'').trim();
  if(!name) return;
  const sid = studentId();
  if(room){
    const snap = await db.ref(roomPath()+'/participants').once('value');
    const ps = snap.val() || {};
    const duplicate = Object.entries(ps).find(([id,p]) => id !== sid && normName(p && p.name) === normName(name));
    if(duplicate){
      alert('이미 있는 이름입니다. 다른 이름을 입력해주세요.');
      const oldName = localStorage.getItem('msg_name') || '';
      const input = document.getElementById('sName2');
      if(input) input.value = oldName;
      return;
    }
  }
  localStorage.setItem('msg_name', name);
  if(room && name) await db.ref(roomPath()+'/participants/'+sid).update({name,deviceId:deviceId(),allowNewDevice:false,lastSeen:now()});
}
async function submitAnswer(choice){
  if(!(await assertCurrentDevice())) return;
  const name=(document.getElementById('sName2')?.value||localStorage.getItem('msg_name')||'').trim();
  if(!name) return alert('이름을 입력하세요.');
  await db.ref(roomPath()+'/participants/'+studentId()).update({name,deviceId:deviceId(),allowNewDevice:false,lastSeen:now()});
  await db.ref(roomPath()+'/answers/'+studentId()).set({choice,name,at:now()});
  localStorage.setItem('msg_name', name);
  localStorage.setItem('msg_submitted_'+code(), state.openedAt);
  // 학생 선택/수정 시에는 효과음과 알림창을 띄우지 않습니다.
  renderStudent();
}
function miniResultHtml(){
  const counts = state.lastCounts || countsOf().counts;
  const rs = state.lastScores || roundScores(counts, state);
  return `<div class="countGrid">${STOCKS.map((s,i)=>`<div><b>${s.key}</b><span>${counts[i]}명</span><em>${fmt(rs[i])}점</em></div>`).join('')}</div>`;
}

function display(){
  if(!room){ home(); return; }
  connect(renderDisplay); renderDisplay();
}
function renderDisplay(){
  const {counts, submitted, expected} = countsOf();
  const rs = state.lastScores || roundScores(counts, state);
  const b = board().slice(0,10);
  $app.innerHTML = `<main class="displayWrap">
    <section class="displayHeader"><div><div class="displayBadge">${activeRound()?activeRound()+'라운드':'대기 중'}</div><h1>소수결 주식 게임</h1><p>이번 라운드 점수 ${fmt(eventMultiplier())}배 · 친구들이 적게 고를 주식을 예측하세요.</p></div><div class="displaySubmit"><b>${submitted}</b><span>/${expected} 제출</span></div></section>
    ${!state.showResults ? `<section class="displayWaiting"><div class="pulse">소수 선택을 노려라!</div><div class="displayChoices">${STOCKS.map(s=>`<div class="displayChoice"><b>${s.key}</b><span>${s.base}점</span></div>`).join('')}</div></section>` :
    `<section class="displayGrid"><div class="displayCard"><h2>라운드 결과</h2><div class="bigBars">${STOCKS.map((s,i)=>{const max=Math.max(1,...counts);const p=Math.round(counts[i]/max*100);return `<div class="bigBarRow"><div class="bigBarLabel"><b>${s.key} ${s.name}</b><span>${counts[i]}명 · ${fmt(rs[i])}점</span></div><div class="bigBarTrack"><div style="width:${Math.max(5,p)}%"></div></div></div>`}).join('')}</div></div><div class="displayCard"><h2>TOP 10</h2>${b.length?b.map((s,i)=>`<div class="rankBig rank${i+1}"><span>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span><b>${esc(s.name)}</b><em>${fmt(s.total)}점</em><small>+${fmt(s.last)}</small></div>`).join(''):'<p>아직 점수가 없습니다.</p>'}</div></section>`}
  </main>`;
}

if(MODE==='teacher') teacher(); else if(MODE==='student') student(); else if(MODE==='display') display(); else home();
