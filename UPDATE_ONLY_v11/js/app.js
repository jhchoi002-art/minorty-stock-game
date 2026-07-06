
/* Minority Game Ultimate v11 - static web app, no build step */
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

const App = { el:null, mode:"home", room:"", state:{}, ref:null };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const now = () => Date.now();
const qbank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

function init(){
  App.el = $("app");
  const p = new URLSearchParams(location.search);
  App.mode = p.get("mode") || "home";
  App.room = (p.get("room") || "").toUpperCase();
  if(App.mode==="teacher") teacher();
  else if(App.mode==="student") student();
  else if(App.mode==="display") display();
  else home();
}
function path(room=App.room){ return db.ref("rooms/"+room); }
function listen(render){
  if(!App.room) return home();
  if(App.ref) App.ref.off();
  App.ref = path();
  App.ref.on("value", snap => { App.state = snap.val() || {}; render(); });
  render();
}
function makeCode(){ const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join(""); }
function url(mode, room=App.room){ return `${location.pathname}?mode=${mode}${room ? "&room="+encodeURIComponent(room) : ""}`; }
function go(mode, room=App.room){ location.href = url(mode, room); }
function fullUrl(mode){ return location.origin + url(mode); }
function studentUrl(){ return fullUrl("student"); }
function displayUrl(){ return fullUrl("display"); }
function qrUrl(t){ return "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data="+encodeURIComponent(t); }
function copyText(t){ navigator.clipboard.writeText(t); alert("복사했습니다."); }
function openDisplay(){ const w=window.open(displayUrl(),"_blank"); if(!w){ copyText(displayUrl()); alert("팝업 차단으로 전자칠판 주소를 복사했습니다."); } }
function sid(){ let x=localStorage.getItem("mg9_sid"); if(!x){ x="s_"+cryptoRandom(); localStorage.setItem("mg9_sid",x);} return x; }
function cryptoRandom(){ try{return crypto.randomUUID()}catch(e){return Math.random().toString(36).slice(2)+Date.now()} }
function settings(){ return Object.assign({gameMode:"personal", teamCount:4, teamAssign:"choice"}, App.state.settings||{}); }
function isTeam(){ return settings().gameMode==="team"; }
function teamCount(){ return Math.max(2, Math.min(10, Number(settings().teamCount||4))); }
function teamAssign(){ return settings().teamAssign || "choice"; }
function countsOf(st=App.state){
  const opts=st.options||[];
  const vals=Object.values(st.answers||{});
  return {counts: opts.map((_,i)=>vals.filter(v=>Number(v.choice)===i).length), total: vals.length};
}
function scoresFor(counts){
  const u=[...new Set(counts)].sort((a,b)=>a-b);
  if(u.length===1) return counts.map(()=>50);
  if(u.length===2) return counts.map(c=>c===u[0]?50:30);
  return counts.map(c=>c===u[0]?50:c===u[1]?40:30);
}
function personalRanks(st=App.state){
  return Object.entries(st.scores||{}).map(([id,s])=>({id,name:s.name||"이름없음",team:s.team||"",total:Number(s.total||0),last:Number(s.last||0)})).sort((a,b)=>b.total-a.total);
}
function teamMemberCounts(st=App.state){
  const p=Object.values(st.participants||{}); const out={};
  for(let i=1;i<=teamCount();i++) out[i]=p.filter(x=>String(x.team)===String(i)).length;
  return out;
}
function pickBalancedTeam(st=App.state){
  const c=teamMemberCounts(st); let min=Infinity;
  for(let i=1;i<=teamCount();i++) min=Math.min(min,c[i]||0);
  const cand=[]; for(let i=1;i<=teamCount();i++) if((c[i]||0)===min)cand.push(String(i));
  return cand[Math.floor(Math.random()*cand.length)] || "1";
}
function teamStats(st=App.state){
  const parts=Object.values(st.participants||{}), scores=Object.values(st.scores||{}), arr=[];
  for(let i=1;i<=teamCount();i++){
    const members=parts.filter(p=>String(p.team)===String(i)).length;
    const scored=scores.filter(s=>String(s.team)===String(i));
    const total=scored.reduce((a,b)=>a+Number(b.total||0),0);
    arr.push({team:String(i), name:i+"조", members, total, avg:scored.length?Math.round(total/scored.length):0});
  }
  return arr.sort((a,b)=>b.avg-a.avg);
}
function optionState(){
  return [
    $("opt0")?.value?.trim() || "보기 1",
    $("opt1")?.value?.trim() || "보기 2",
    $("opt2")?.value?.trim() || "보기 3"
  ];
}
function setQuestionLocal(q,o){
  localStorage.setItem("mg9_q_"+App.room, q);
  localStorage.setItem("mg9_o_"+App.room, JSON.stringify(o));
}
function getQuestionLocal(){
  const first=qbank[0]||{q:"하루 동안 한 가지 맛만 먹는다면?", o:["달콤한 맛","짭짤한 맛","매운맛"]};
  let opts=first.o;
  try{ opts=JSON.parse(localStorage.getItem("mg9_o_"+App.room)||"null") || first.o; }catch(e){}
  return {q:localStorage.getItem("mg9_q_"+App.room)||first.q, o:opts};
}
function myAnswer(){ const a=(App.state.answers||{})[sid()]; return a&&a.choice!==undefined ? Number(a.choice) : -1; }
function beep(type="click"){
  if(localStorage.getItem("mg9_sound")==="off") return;
  try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(), o=ctx.createOscillator(), g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);o.frequency.value=type==="win"?880:type==="start"?520:660;g.gain.value=.055;o.start();setTimeout(()=>{o.stop();ctx.close()}, type==="win"?420:160);}catch(e){}
}

/* Home */
function home(){
  App.el.innerHTML = `<main class="home">
    <section class="hero">
      <h1>🎮 소수결 게임 Ultimate v11</h1>
      <p>정식 배포용 재설계 · 개인전/팀전 · 랜덤 균형 배정 · 전자칠판 실시간 그래프</p>
      <div class="homeGrid">
        <div class="card">
          <h2>방 만들기</h2>
          <label>방 이름</label><input id="roomTitle" value="소수결 게임">
          <label>교사 이름</label><input id="teacherName" placeholder="예: 최정훈">
          <button onclick="createRoom()">새 방 만들기</button>
        </div>
        <div class="card">
          <h2>방 참가하기</h2>
          <label>방코드</label><input id="joinCode" placeholder="예: A8KJX2" oninput="this.value=this.value.toUpperCase()">
          <button class="blue" onclick="joinRoom('student')">학생으로 참가</button>
          <button class="ghost" onclick="joinRoom('teacher')">교사용으로 열기</button>
          <button class="ghost" onclick="joinRoom('display')">전자칠판으로 열기</button>
        </div>
      </div>
    </section>
  </main>`;
}
async function createRoom(){
  const code=makeCode();
  await path(code).set({
    title:$("roomTitle").value||"소수결 게임",
    teacher:$("teacherName").value||"선생님",
    createdAt:now(),
    settings:{gameMode:"personal", teamCount:4, teamAssign:"choice", scoreMode:"average"},
    round:0, question:"문제를 열어 주세요.", options:["치킨","피자","떡볶이"],
    openedAt:0, showResults:false, scored:false, pointMultiplier:1,
    participants:{}, answers:{}, scores:{}, history:[]
  });
  go("teacher",code);
}
function joinRoom(mode){ const c=($("joinCode").value||"").trim().toUpperCase(); if(!c)return alert("방코드를 입력해 주세요."); go(mode,c); }

/* Teacher */
function teacher(){ listen(renderTeacher); }
function renderTeacher(){
  const s=settings(), ql=getQuestionLocal();
  const expected=Number(localStorage.getItem("mg9_expected_"+App.room)||25);
  const mult=Number(localStorage.getItem("mg9_mult_"+App.room)||1);
  const {counts,total}=countsOf(); const score=scoresFor(counts); const ranks=personalRanks(); const progress=Math.min(100,Math.round(total/Math.max(1,expected)*100));
  App.el.innerHTML = `<main class="dash">
    <header class="dashHeader">
      <div><h1>소수결 게임 <span>Ultimate v11</span></h1><p>방코드 <b class="code">${App.room}</b> · ${esc(App.state.title||"")}</p></div>
      <button class="ghost" onclick="go('home','')">처음으로</button>
    </header>
    <section class="summary">
      <div><span>모드</span><b>${s.gameMode==="team"?"팀전":"개인전"}</b></div>
      <div><span>제출</span><b>${total}/${expected}</b></div>
      <div><span>라운드</span><b>${App.state.round||0}</b></div>
      <div><span>배수</span><b>${mult}배</b></div>
    </section>
    <section class="card settingsCard">
      <h2>수업 설정</h2>
      <div class="settingGrid">
        <div><label>게임 모드</label><select id="gameMode" onchange="saveSettings()"><option value="personal" ${s.gameMode==="personal"?"selected":""}>개인전</option><option value="team" ${s.gameMode==="team"?"selected":""}>팀전</option></select></div>
        <div class="${s.gameMode==="team"?"":"off"}"><label>조 개수</label><input id="teamCount" type="number" min="2" max="10" value="${s.teamCount}" ${s.gameMode==="team"?"":"disabled"} onchange="saveSettings()"></div>
        <div><label>이번 문제 배수</label><input type="number" min="1" max="10" value="${mult}" onchange="localStorage.setItem('mg9_mult_${App.room}',Math.max(1,Number(this.value)||1));renderTeacher()"></div>
        <div><label>예상 참여 인원</label><input type="number" value="${expected}" onchange="localStorage.setItem('mg9_expected_${App.room}',this.value);renderTeacher()"></div>
      </div>
      <div class="${s.gameMode==="team"?"teamPanel":"hidden"}">
        <h3>팀 설정</h3>
        <div class="settingGrid two">
          <div><label>조 배정 방식</label><select id="teamAssign" onchange="saveSettings()"><option value="choice" ${s.teamAssign==="choice"?"selected":""}>학생이 직접 선택</option><option value="random" ${s.teamAssign==="random"?"selected":""}>랜덤 균형 배정</option></select></div>
          <div><label>팀 점수</label><input value="팀 평균 점수" disabled></div>
        </div>
        ${teamSummaryHtml()}
      </div>
    </section>
    <section class="grid2">
      <div class="card"><h2>학생 접속</h2><div class="codeBox">${App.room}</div><div class="urlbox">${esc(studentUrl())}</div><button class="smallBtn" onclick="copyText('${esc(studentUrl())}')">학생 주소 복사</button><button class="smallBtn" onclick="openDisplay()">전자칠판 열기</button><button class="smallBtn" onclick="copyText('${esc(displayUrl())}')">전자칠판 주소 복사</button><img class="qr" src="${qrUrl(studentUrl())}"></div>
      <div class="card"><h2>문제은행</h2><div class="bankControls"><select id="cat"><option>전체</option>${[...new Set(qbank.map(x=>x.category))].map(c=>`<option>${esc(c)}</option>`).join("")}</select><input id="search" placeholder="검색"></div><button onclick="randomQuestion()">랜덤 문제</button><button class="ghost" onclick="listQuestions()">목록 보기</button><div id="qList" class="qList"></div></div>
    </section>
    <section class="card"><h2>문제 준비</h2><label>문제</label><input id="question" value="${esc(ql.q)}" oninput="saveQuestionDraft()"><div class="optionGrid">${[0,1,2].map(i=>`<div><label>보기 ${i+1}</label><input id="opt${i}" value="${esc(ql.o[i]||`보기 ${i+1}`)}" oninput="saveQuestionDraft()"></div>`).join("")}</div><button onclick="openQuestion()">문제 열기 / 다음 문제</button><button class="secondary" onclick="resetAnswers()">응답 초기화</button></section>
    <section class="card stage"><div class="stageHead"><h2>${App.state.round?App.state.round+"번. ":""}${esc(App.state.question||"문제를 열어 주세요.")} ${Number(App.state.pointMultiplier||1)>1?"🔥 "+App.state.pointMultiplier+"배":""}</h2><div class="pill">제출 ${total}명 / 예상 ${expected}명</div></div><div class="progress"><div style="width:${progress}%"></div></div><button class="reveal" onclick="showResults()">라운드 종료 / 결과 공개 + 점수 반영</button>${App.state.showResults?resultBars(counts,score,Number(App.state.pointMultiplier||1)):`<p class="hint bigHint">라운드 진행 중입니다. 학생들은 결과 공개 전까지 선택을 바꿀 수 있습니다.</p>`}</section>
    <section class="rankGrid">${s.gameMode==="team"?`<div class="card"><h2>팀 랭킹</h2>${teamRankHtml()}</div>`:""}<div class="card"><div class="stageHead"><h2>개인 랭킹</h2><div><button class="ghost" onclick="downloadCSV()">CSV 저장</button><button class="ghost" onclick="resetScores()">점수 초기화</button></div></div>${rankHtml(ranks)}</div></section>
    ${s.gameMode==="team"?`<section class="card"><h2>참가자 조 관리</h2><p class="hint">교사가 학생의 조를 직접 변경할 수 있습니다.</p>${participantManagerHtml()}</section>`:""}
    <section class="card"><h2>문제별 통계</h2>${historyHtml(App.state.history||[])}</section>
  </main>`;
}
function saveQuestionDraft(){ setQuestionLocal($("question").value, optionState()); }
async function saveSettings(){
  const gm=$("gameMode").value; const tc=Math.max(2,Math.min(10,Number($("teamCount")?.value)||4)); const ta=$("teamAssign")?.value || teamAssign();
  await path().child("settings").update({gameMode:gm, teamCount:tc, teamAssign:ta, scoreMode:"average"});
}
function filteredQuestions(){
  const c=$("cat")?.value||"전체", k=($("search")?.value||"").trim();
  return qbank.filter(x=>(c==="전체"||x.category===c)&&(!k||x.q.includes(k)||x.o.join(" ").includes(k)));
}
function listQuestions(){ $("qList").innerHTML=filteredQuestions().slice(0,100).map(x=>`<button class="qItem" onclick="loadQuestion(${x.id})"><b>${esc(x.category)}</b> ${esc(x.q)}</button>`).join(""); }
function loadQuestion(id){ const x=qbank.find(q=>q.id===id); if(!x)return; $("question").value=x.q; [0,1,2].forEach(i=>$("opt"+i).value=x.o[i]||`보기 ${i+1}`); setQuestionLocal(x.q, [x.o[0]||"보기 1",x.o[1]||"보기 2",x.o[2]||"보기 3"]); }
function randomQuestion(){ const a=filteredQuestions(); loadQuestion((a[Math.floor(Math.random()*a.length)]||qbank[0]).id); }
async function openQuestion(){
  const opts=optionState(); const q=$("question").value.trim()||"문제"; setQuestionLocal(q,opts); beep("start");
  await path().update({question:q, options:opts, openedAt:now(), showResults:false, scored:false, round:Number(App.state.round||0)+1, pointMultiplier:Number(localStorage.getItem("mg9_mult_"+App.room)||1), answers:{}});
}
async function resetAnswers(){ await path().update({answers:{}, showResults:false, scored:false}); }
async function resetScores(){ if(confirm("점수를 초기화할까요?")) await path().update({scores:{}}); }
async function showResults(){
  const snap=await path().once("value"); const st=snap.val()||{}; const {counts}=countsOf(st); const score=scoresFor(counts); const answers=st.answers||{}; const old=st.scores||{}; const next={...old}; const mult=Number(st.pointMultiplier||1);
  if(!st.scored){ Object.entries(answers).forEach(([id,a])=>{ const add=(score[Number(a.choice)]||0)*mult; next[id]={name:a.name||old[id]?.name||"이름없음", team:a.team||old[id]?.team||"", total:Number(old[id]?.total||0)+add, last:add, lastChoice:Number(a.choice)}; }); }
  const history=[...(Array.isArray(st.history)?st.history:[]),{round:st.round, question:st.question, options:st.options, counts, score, pointMultiplier:mult, at:now()}].slice(-50);
  beep("win"); await path().update({showResults:true, scored:true, scores:next, history});
}
function resultBars(counts,score,mult){ const max=Math.max(1,...counts); return `<div class="results">${(App.state.options||[]).map((o,i)=>`<div class="result"><div class="row"><b>${esc(o)}</b><span>${counts[i]}명 · ${score[i]*mult}점</span></div><div class="meter"><div style="width:${Math.round(counts[i]/max*100)}%"></div></div></div>`).join("")}</div>`; }
function rankHtml(list){ return list.length?`<div class="scoreboard">${list.map((s,i)=>`<div class="scoreRow ${i===0?"topRank":""}"><span class="rank">${i+1}</span><b>${esc(s.name)} ${s.team?`<small>${s.team}조</small>`:""}</b><span>총 ${s.total}점</span><em>이번 +${s.last}</em></div>`).join("")}</div>`:`<p class="hint">아직 점수가 없습니다.</p>`; }
function historyHtml(h){ return h.length?`<div class="historyList">${h.slice(-8).reverse().map(x=>`<div class="historyItem"><b>${x.round}번. ${esc(x.question)}</b><div>${(x.options||[]).map((o,i)=>`${esc(o)} ${(x.counts||[])[i]||0}명`).join(" · ")}</div></div>`).join("")}</div>`:`<p class="hint">아직 통계가 없습니다.</p>`; }
function downloadCSV(){ const rows=[["순위","이름","조","총점","이번점수"]]; personalRanks().forEach((s,i)=>rows.push([i+1,s.name,s.team?`${s.team}조`:"",s.total,s.last])); const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"})); a.download=`소수결_${App.room}.csv`; a.click(); }

/* Team helpers */
function teamSummaryHtml(){ if(!isTeam())return `<p class="hint">현재 개인전입니다.</p>`; return `<div class="teamSummary">${teamStats().sort((a,b)=>Number(a.team)-Number(b.team)).map(t=>`<div><b>${t.name}</b><span>${t.members}명 참가</span><em>평균 ${t.avg}점</em></div>`).join("")}</div>`; }
function teamRankHtml(){ return `<div class="teamRankBox">${teamStats().map((t,i)=>`<div class="teamRank ${i===0?"firstTeam":""}"><span>${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span><b>${t.name}</b><em>평균 ${t.avg}점</em><small>${t.members}명</small></div>`).join("")}</div>`; }
function participantManagerHtml(){ const entries=Object.entries(App.state.participants||{}).sort((a,b)=>Number(a[1].team||99)-Number(b[1].team||99)||String(a[1].name||"").localeCompare(String(b[1].name||""))); if(!entries.length)return `<p class="hint">아직 참가자가 없습니다.</p>`; return `<div class="participantList">${entries.map(([id,p])=>`<div class="participantItem"><b>${esc(p.name||"이름없음")}</b><select onchange="moveTeam('${id}',this.value)"><option value="">미배정</option>${Array.from({length:teamCount()},(_,i)=>i+1).map(n=>`<option value="${n}" ${String(p.team)===String(n)?"selected":""}>${n}조</option>`).join("")}</select></div>`).join("")}</div>`; }
async function moveTeam(id,team){ const up={}; up[`participants/${id}/team`]=team; if((App.state.scores||{})[id])up[`scores/${id}/team`]=team; if((App.state.answers||{})[id])up[`answers/${id}/team`]=team; await path().update(up); }

/* Student */
function student(){ listen(renderStudent); }

function renderStudent(){
  const name=localStorage.getItem("mg9_name")||"";
  const localTeam=localStorage.getItem("mg9_team_"+App.room)||"";
  const part=(App.state.participants||{})[sid()]||{};
  const team=part.team||localTeam;
  const opened=Number(App.state.openedAt||0);
  const ended=!!App.state.showResults||!!App.state.scored;
  const sel=myAnswer();

  // 한글 입력 중 자음/모음마다 화면을 다시 그리면 IME 조합이 끊기므로
  // 이름 입력칸에서는 renderStudent()를 호출하지 않습니다.
  const canClick = opened && !ended && (!isTeam() || teamAssign()==="random" || team);

  App.el.innerHTML=`<main class="student"><section class="studentCard">
    <h1>소수결 게임</h1>
    <p class="center">방코드 <b class="code">${App.room}</b> · ${isTeam()?"팀전":"개인전"}</p>

    <div class="studentInfo">
      <label>이름 또는 번호</label>
      <input id="sName" value="${esc(name)}" 
        oninput="localStorage.setItem('mg9_name', this.value)"
        onblur="saveParticipantSilent()">

      ${isTeam()&&teamAssign()==="choice"?`
        <label>조 선택</label>
        <select id="sTeam" onchange="localStorage.setItem('mg9_team_${App.room}',this.value);saveParticipant();renderStudent()">
          <option value="">조를 선택하세요</option>
          ${Array.from({length:teamCount()},(_,i)=>i+1).map(n=>`<option value="${n}" ${String(team)===String(n)?"selected":""}>${n}조</option>`).join("")}
        </select>`:""}

      ${isTeam()&&teamAssign()==="random"?`
        <div class="assigned">${team?`🎉 ${team}조에 배정되었습니다.`:"이름을 입력하고 보기를 누르면 자동으로 조가 배정됩니다."}</div>`:""}
    </div>

    <h2>${App.state.round?App.state.round+"번. ":""}${esc(App.state.question||"선생님이 문제를 열 때까지 기다려 주세요.")}</h2>

    <div class="choices">
      ${(App.state.options||[]).map((o,i)=>`
        <button class="choice ${sel===i?"selectedChoice":""}" ${!canClick?"disabled":""} onclick="submitAnswer(${i})">
          ${esc(o)}${sel===i?"<small>선택됨</small>":""}
        </button>`).join("")}
    </div>

    <p class="status">${
      ended ? "라운드가 종료되어 선택을 바꿀 수 없습니다." :
      !opened ? "선생님이 문제를 열 때까지 기다려 주세요." :
      isTeam()&&teamAssign()==="choice"&&!team ? "팀전입니다. 조를 선택하세요." :
      sel>=0 ? "선택되었습니다. 결과 공개 전까지 바꿀 수 있습니다." :
      "이름을 입력하고 하나를 골라 주세요."
    }</p>
  </section></main>`;
}

async function saveParticipantSilent(){
  const name=($("sName")?.value||"").trim();
  if(!name) return;
  if(isTeam() && teamAssign()==="choice"){
    const team=$("sTeam")?.value||localStorage.getItem("mg9_team_"+App.room)||"";
    if(team) await path().child("participants/"+sid()).set({name,team,at:now()});
  } else if(!isTeam()){
    await path().child("participants/"+sid()).set({name,team:"",at:now()});
  }
}

async function autoAssign(){
  if(!isTeam()||teamAssign()!=="random")return "";
  const name=($("sName")?.value||localStorage.getItem("mg9_name")||"").trim();
  if(!name)return "";
  const part=(App.state.participants||{})[sid()]||{};
  if(part.team)return String(part.team);
  const team=pickBalancedTeam();
  localStorage.setItem("mg9_team_"+App.room,team);
  await path().child("participants/"+sid()).set({name,team,at:now()});
  return team;
}

async function saveParticipant(){
  const name=($("sName")?.value||localStorage.getItem("mg9_name")||"").trim();
  const team=$("sTeam")?.value||localStorage.getItem("mg9_team_"+App.room)||"";
  if(!name)return;
  await path().child("participants/"+sid()).set({name,team,at:now()});
}

async function submitAnswer(choice){
  const name=$("sName").value.trim();
  let team=localStorage.getItem("mg9_team_"+App.room)||"";

  if(!name){
    alert("이름 또는 번호를 먼저 입력해 주세요.");
    $("sName").focus();
    return;
  }

  if(isTeam()&&teamAssign()==="random"){
    const part=(App.state.participants||{})[sid()]||{};
    team=part.team||team||await autoAssign();
  }

  if(isTeam()&&teamAssign()==="choice"&&!team){
    alert("조를 선택해 주세요.");
    return;
  }

  if(App.state.showResults||App.state.scored){
    alert("라운드가 종료되어 선택을 바꿀 수 없습니다.");
    return;
  }

  localStorage.setItem("mg9_name",name);
  await path().child("participants/"+sid()).set({name,team,at:now()});
  await path().child("answers/"+sid()).set({choice,name,team,at:now()});
}


/* Display */
function display(){ listen(renderDisplay); }
function renderDisplay(){
  const {counts,total}=countsOf(); const score=scoresFor(counts); const sum=Math.max(1,counts.reduce((a,b)=>a+b,0)); const ranks=personalRanks().slice(0,8);
  App.el.innerHTML=`<main class="display"><section class="displayHeader"><div><div class="badge">${App.state.round?App.state.round+"번 문제":"대기 중"} · ${isTeam()?`팀전(${teamAssign()==="random"?"랜덤배정":"직접선택"})`:"개인전"} ${Number(App.state.pointMultiplier||1)>1?"🔥 "+App.state.pointMultiplier+"배":""}</div><h1>${esc(App.state.question||"선생님이 문제를 열 때까지 기다려 주세요.")}</h1></div><div class="submitBox"><b>${total}</b><span>명 제출</span></div></section>${!App.state.showResults?`<section class="waiting"><div class="pulse">소수결을 노려보세요!</div><div class="displayChoices">${(App.state.options||[]).map((o,i)=>`<div>${i+1}. ${esc(o)}</div>`).join("")}</div>${isTeam()?`<div class="displayCard"><h2>팀 현황</h2>${teamSummaryHtml()}</div>`:""}</section>`:`<section class="displayGrid"><div class="displayCard"><h2>바로 전 문제 선택 비율</h2>${(App.state.options||[]).map((o,i)=>{const p=Math.round(counts[i]/sum*100);return `<div class="barRow"><div class="barLabel"><b>${esc(o)}</b><span>${counts[i]}명 · ${p}% · ${score[i]*Number(App.state.pointMultiplier||1)}점</span></div><div class="bar"><div style="width:${Math.max(4,p)}%"></div></div></div>`}).join("")}</div><div class="displayCard"><h2>${isTeam()?"팀 랭킹":"개인 랭킹"} TOP</h2>${isTeam()?teamRankHtml():ranks.map((s,i)=>`<div class="rankBig"><span>${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span><b>${esc(s.name)}</b><em>${s.total}점</em><small>+${s.last}</small></div>`).join("")}</div></section>`}</main>`;
}


/* v11 local backup helpers */
function exportLocalSettings(){
  const data = {};
  Object.keys(localStorage).forEach(k => {
    if(k.startsWith("mg10_") || k.startsWith("mg11_")) data[k] = localStorage.getItem(k);
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "minority_game_local_settings_backup.json";
  a.click();
}
function importLocalSettingsFile(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      Object.entries(data).forEach(([k,v]) => localStorage.setItem(k, v));
      alert("설정을 불러왔습니다. 새로고침합니다.");
      location.reload();
    }catch(e){
      alert("설정 파일을 읽을 수 없습니다.");
    }
  };
  reader.readAsText(file);
}

init();
