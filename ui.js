/* ============================================================
   ui.js — OdyssIA · INTERFACE UTILISATEUR (aucune dépendance Phaser)
   Gère : profil/localStorage, accueil, création de profil, quiz VARK,
          hub HTML "choix des matières" (carte illustrée + cartes),
          modal frise+VARK, HUD, avatar. Lance le MOTEUR via OdyssiaEngine.
   Dépend de : content.js (VARK/SUBJECTS/ODYSSIA_CONTENT), design.js
               (drawSubjectBuilding/drawAvatar/QC/QCOLOR), engine.js (OdyssiaEngine)
   ============================================================ */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const VARK = window.VARK, MATHS_MODES = window.MATHS_MODES, SUBJECTS = window.SUBJECTS, CONTENT = window.ODYSSIA_CONTENT;
  const QC = window.QC, QCOLOR = window.QCOLOR;
  const drawSubjectBuilding = window.drawSubjectBuilding, drawAvatar = window.drawAvatar;
  const KEY = "odyssia.v2", XP_PER_LEVEL = 25;
  const hx = h => parseInt(h.replace('#',''),16);

  /* ---------- Adaptateur Canvas2D ↔ API Phaser.Graphics ----------
     Permet d'exécuter le code de dessin de design.js sur un <canvas> HTML. */
  function cssColor(c, a){ const r=(c>>16)&255,g=(c>>8)&255,b=c&255; return "rgba("+r+","+g+","+b+","+(a==null?1:a)+")"; }
  class G2D {
    constructor(ctx){ this.ctx=ctx; this._fill="#000"; this._line="#000"; this._lw=1; }
    fillStyle(c,a){ this._fill=cssColor(c,a); return this; }
    lineStyle(w,c,a){ this._lw=w; this._line=cssColor(c,a); return this; }
    fillRect(x,y,w,h){ const c=this.ctx; c.fillStyle=this._fill; c.fillRect(x,y,w,h); }
    strokeRect(x,y,w,h){ const c=this.ctx; c.strokeStyle=this._line; c.lineWidth=this._lw; c.strokeRect(x,y,w,h); }
    fillCircle(x,y,r){ const c=this.ctx; c.beginPath(); c.arc(x,y,Math.max(0,r),0,6.2832); c.fillStyle=this._fill; c.fill(); }
    strokeCircle(x,y,r){ const c=this.ctx; c.beginPath(); c.arc(x,y,Math.max(0,r),0,6.2832); c.strokeStyle=this._line; c.lineWidth=this._lw; c.stroke(); }
    fillEllipse(x,y,w,h){ const c=this.ctx; c.beginPath(); c.ellipse(x,y,Math.max(0.01,w/2),Math.max(0.01,h/2),0,0,6.2832); c.fillStyle=this._fill; c.fill(); }
    strokeEllipse(x,y,w,h){ const c=this.ctx; c.beginPath(); c.ellipse(x,y,Math.max(0.01,w/2),Math.max(0.01,h/2),0,0,6.2832); c.strokeStyle=this._line; c.lineWidth=this._lw; c.stroke(); }
    fillTriangle(x1,y1,x2,y2,x3,y3){ const c=this.ctx; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.lineTo(x3,y3); c.closePath(); c.fillStyle=this._fill; c.fill(); }
    strokeTriangle(x1,y1,x2,y2,x3,y3){ const c=this.ctx; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.lineTo(x3,y3); c.closePath(); c.strokeStyle=this._line; c.lineWidth=this._lw; c.stroke(); }
    _rr(x,y,w,h,rad){ const c=this.ctx; let tl,tr,br,bl;
      if(typeof rad==="object"){ tl=rad.tl||0; tr=rad.tr||0; br=rad.br||0; bl=rad.bl||0; } else { tl=tr=br=bl=rad||0; }
      c.beginPath(); c.moveTo(x+tl,y); c.lineTo(x+w-tr,y); c.arcTo(x+w,y,x+w,y+tr,tr);
      c.lineTo(x+w,y+h-br); c.arcTo(x+w,y+h,x+w-br,y+h,br); c.lineTo(x+bl,y+h); c.arcTo(x,y+h,x,y+h-bl,bl);
      c.lineTo(x,y+tl); c.arcTo(x,y,x+tl,y,tl); c.closePath(); }
    fillRoundedRect(x,y,w,h,rad){ this._rr(x,y,w,h,rad); this.ctx.fillStyle=this._fill; this.ctx.fill(); }
    strokeRoundedRect(x,y,w,h,rad){ this._rr(x,y,w,h,rad); this.ctx.strokeStyle=this._line; this.ctx.lineWidth=this._lw; this.ctx.stroke(); }
    beginPath(){ this.ctx.beginPath(); }
    moveTo(x,y){ this.ctx.moveTo(x,y); }
    lineTo(x,y){ this.ctx.lineTo(x,y); }
    closePath(){ this.ctx.closePath(); }
    arc(x,y,r,s,e,anti){ this.ctx.arc(x,y,r,s,e,anti); }
    fillPath(){ this.ctx.fillStyle=this._fill; this.ctx.fill(); }
    strokePath(){ this.ctx.strokeStyle=this._line; this.ctx.lineWidth=this._lw; this.ctx.stroke(); }
  }

  /* ---------- Petits sons UI ---------- */
  const uiSFX=(function(){ let ctx=null,muted=false;
    function AC(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return ctx; }
    function n(f,d,v){ const c=AC(); if(!c||muted) return; const o=c.createOscillator(),g=c.createGain(); o.type="square"; o.frequency.value=f; o.connect(g); g.connect(c.destination); const t=c.currentTime; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.start(t); o.stop(t+d+0.02); }
    return { resume(){ const c=AC(); if(c&&c.state==="suspended") c.resume(); }, setMuted(m){ muted=m; }, click(){ n(520,0.05,0.05); }, enter(){ n(523,0.08,0.06); n(784,0.12,0.06); } };
  })();

  /* ---------- État / persistance ---------- */
  function freshState(){ return { pseudo:"", classe:"6e A", avatarSeed:0, varkProfile:"visuel", xp:0,
      done:{visuel:false,auditif:false,lire:false,kinesthesique:false}, scores:{visuel:0,auditif:0,lire:0,kinesthesique:0},
      quests:{}, questScores:{} }; }
  let state;
  function load(){ let s=null; try{ s=JSON.parse(localStorage.getItem(KEY)); }catch(e){} state = Object.assign(freshState(), s||{});
      state.done=Object.assign({visuel:false,auditif:false,lire:false,kinesthesique:false}, state.done||{});
      state.scores=Object.assign({visuel:0,auditif:0,lire:0,kinesthesique:0}, state.scores||{});
      state.quests=Object.assign({}, state.quests||{}); state.questScores=Object.assign({}, state.questScores||{}); return s; }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
  function level(){ return 1+Math.floor(state.xp/XP_PER_LEVEL); }
  function hashString(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

  /* ---------- Avatar (HTML, via adaptateur) ---------- */
  function renderAvatarURL(seed, lvl){ const cv=document.createElement("canvas"); cv.width=64; cv.height=72;
    const ctx=cv.getContext("2d"); ctx.translate(0,4); drawAvatar(new G2D(ctx), seed>>>0, lvl); return cv.toDataURL(); }
  function updateAvatars(){ const url=renderAvatarURL(state.avatarSeed, level());
    document.querySelectorAll(".avatar-img").forEach(i=>i.src=url); }

  /* ---------- Carte illustrée du village ---------- */
  function villageColors(key){ const wall=0xefe7d4, roof=0xb85c3a, acc=hx(SUBJECTS[key].color);
    return { accent:acc, accentDark:QCOLOR.darken(acc,18), wall, wallDark:QCOLOR.darken(wall,16), roof, roofDark:QCOLOR.darken(roof,16) }; }
  function drawVillage(){ const cv=$("village-map"); if(!cv) return; const ctx=cv.getContext("2d"); const W=cv.width, H=cv.height; const g=new G2D(ctx);
    ctx.clearRect(0,0,W,H);
    const grd=ctx.createLinearGradient(0,0,0,H); grd.addColorStop(0,"#d6efc8"); grd.addColorStop(1,"#a7d896"); ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
    // sentier central clair reliant les bâtiments
    ctx.strokeStyle="#e7d6a8"; ctx.lineWidth=26; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); const pts=["maths","histgeo","svt","pc"].map(k=>SUBJECTS[k].pos);
    ctx.moveTo(pts[0].x/100*W, pts[0].y/100*H+30); pts.forEach(p=>ctx.lineTo(p.x/100*W, p.y/100*H+30)); ctx.stroke();
    ctx.beginPath(); const pts2=["francais","langues","techno"].map(k=>SUBJECTS[k].pos);
    ctx.moveTo(pts2[0].x/100*W, pts2[0].y/100*H+30); pts2.forEach(p=>ctx.lineTo(p.x/100*W, p.y/100*H+30)); ctx.stroke();
    // buissons décoratifs déterministes
    let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    for(let i=0;i<26;i++){ const bx=rnd()*W, by=40+rnd()*(H-60); g.fillStyle(0x000000,0.10); g.fillEllipse(bx,by+8,26,9);
      g.fillStyle(0x4ea63c,1); g.fillEllipse(bx,by,26,20); g.fillStyle(0x66c46f,0.8); g.fillEllipse(bx-4,by-4,12,9); }
    // bâtiments
    const BW=Math.min(118, W*0.115), BH=BW*0.66;
    Object.keys(SUBJECTS).forEach(key=>{ const s=SUBJECTS[key]; const px=s.pos.x/100*W, py=s.pos.y/100*H;
      ctx.save(); ctx.translate(px-BW/2, py-BH); drawSubjectBuilding(g, key, BW, BH, villageColors(key)); ctx.restore(); });
  }
  function buildHotspots(){ const wrap=$("map-hotspots"); if(!wrap) return; wrap.innerHTML="";
    Object.keys(SUBJECTS).forEach(key=>{ const s=SUBJECTS[key]; const avail = s.playable || !!s.quests;
      const b=document.createElement("button"); b.className="hotspot"+(avail?" playable":""); b.style.left=s.pos.x+"%"; b.style.top=s.pos.y+"%";
      let done=false; if(s.playable) done=MATHS_MODES.every(m=>state.done[m]); else if(s.quests) done=Object.keys(s.quests).every(t=>state.quests[s.quests[t]]);
      const tag = avail ? (done?' <span class="hs-star">🌟</span>':' <span class="hs-go">▶</span>') : ' <span class="hs-lock material-symbols-outlined">lock</span>';
      b.innerHTML='<span class="hs-pin" style="--c:'+s.color+'"><span class="material-symbols-outlined">'+s.icon+'</span></span>'
        +'<span class="hs-pill" style="border-color:'+s.color+'">'+s.matiere+tag+'</span>';
      b.onclick=()=>{ uiSFX.click(); openSubjectModal(key); };
      wrap.appendChild(b); });
  }
  function refreshHub(){ drawVillage(); buildHotspots(); refreshHud(); }

  /* ---------- HUD ---------- */
  function refreshHud(){ const lvlXp=state.xp%XP_PER_LEVEL;
    if($("hud-level")) $("hud-level").textContent=level();
    if($("hud-pseudo")) $("hud-pseudo").textContent=state.pseudo||"Explorateur";
    if($("hud-xp")) $("hud-xp").textContent=state.xp;
    if($("xpfill")) $("xpfill").style.width=Math.round(lvlXp/XP_PER_LEVEL*100)+"%";
    if($("hud-badges")) $("hud-badges").textContent="🗼 "+MATHS_MODES.filter(m=>state.done[m]).length+"/4";
  }

  /* ---------- Toast ---------- */
  let toastTimer; function toast(msg, ok){ const t=$("toast"), inner=$("toast-inner"); if(!t) return;
    inner.innerHTML='<span class="material-symbols-outlined" style="font-size:18px;">'+(ok!==false?"check_circle":"info")+'</span>'+msg;
    inner.style.background=ok!==false?"#27ae60":"#fdd404"; inner.style.color=ok!==false?"#fff":"#221b00";
    t.style.display="block"; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.style.display="none",1800); }

  /* ---------- Modal matière (frise + sélecteur VARK / bientôt) ---------- */
  function openSubjectModal(subject){ const fr=CONTENT.frises[subject], s=SUBJECTS[subject], col=s.color;
    $("sm-title").textContent=fr.subject; $("sm-sub").textContent=fr.building+" · Programme de 6e";
    $("sm-icon").textContent=s.icon; $("sm-icon").style.color=col;
    const frise=$("frise"); frise.innerHTML="";
    fr.items.forEach((it,i)=>{ const d=document.createElement("div"); d.className="frise-step"; d.style.borderLeftColor=col;
      const qid = s.quests && s.quests[it.titre]; let right="";
      if(qid){ const qd=!!state.quests[qid]; right='<button class="frise-quest'+(qd?" done":"")+'" data-q="'+qid+'" style="--c:'+col+'"><span class="material-symbols-outlined">'+(qd?"replay":"play_arrow")+'</span>'+(qd?"Rejouer":"Jouer")+'</button>'; }
      d.innerHTML='<div class="n">'+(i+1)+'</div><div style="flex:1;"><div class="ti">'+it.titre+'</div><div class="de">'+it.desc+'</div></div>'+right; frise.appendChild(d); });
    frise.querySelectorAll(".frise-quest").forEach(b=>{ b.onclick=()=>{ uiSFX.click(); closeSubjectModal(); launchQuest(b.dataset.q); }; });
    if(s.playable){ $("sm-play").style.display="block"; $("sm-soon").style.display="none";
      const grid=$("vark-grid"); grid.innerHTML="";
      MATHS_MODES.forEach(m=>{ const v=VARK[m]; const card=document.createElement("button"); card.className="vark-card"+(m===state.varkProfile?" reco":"");
        card.innerHTML='<div class="vk-med" style="background:'+v.accent+'"><span class="material-symbols-outlined" style="font-size:20px;">'+v.icon+'</span></div>'
          +'<div class="vk-t">'+v.label+'</div><div class="vk-d">'+v.desc+'</div>'
          +(state.done[m]?'<span class="done-tag material-symbols-outlined">check_circle</span>':(m===state.varkProfile?'<span class="reco-tag">Conseillé</span>':''));
        card.onclick=()=>{ uiSFX.click(); closeSubjectModal(); launchMode(m); };
        grid.appendChild(card); });
    } else if(s.quests){ $("sm-play").style.display="none"; $("sm-soon").style.display="block";
      $("sm-soon").innerHTML='<p style="font-size:13px; color:var(--on-surface-variant); margin:0;"><b style="color:'+col+'">▶ Une quête est disponible !</b> Lance-la depuis la frise ci-dessus. Les autres chapitres arrivent bientôt.</p>';
    } else { $("sm-play").style.display="none"; $("sm-soon").style.display="block";
      $("sm-soon").innerHTML='<span class="soon"><span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span>Bientôt disponible</span><p style="font-size:13px; color:var(--on-surface-variant); margin:12px 0 0;">Cette matière arrive dans une prochaine quête. Pour la démo, mets le cap sur la <b>Tour des étoiles</b> (Maths) !</p>'; }
    $("subject-modal").classList.add("show");
  }
  function closeSubjectModal(){ $("subject-modal").classList.remove("show"); }

  /* ---------- Moteur (mini-jeux) ---------- */
  function showEngine(title){ const ov=$("engine-overlay"); ov.classList.add("show"); if(title&&$("engine-title-txt")) $("engine-title-txt").textContent=title;
    const e=window.OdyssiaEngine; if(e&&e._game&&e._game.scale){ e._game.scale.refresh(); setTimeout(()=>{ try{ e._game.scale.refresh(); }catch(_){} },60); } }
  function hideEngine(){ $("engine-overlay").classList.remove("show"); }
  function launchMode(mode){ uiSFX.enter(); showEngine("Maths — "+VARK[mode].label);
    requestAnimationFrame(()=>{ window.OdyssiaEngine.launch("maths", mode); if(window.OdyssiaEngine._game&&window.OdyssiaEngine._game.scale) window.OdyssiaEngine._game.scale.refresh(); }); }
  function launchQuest(qid){ uiSFX.enter(); showEngine("Quête — La Grèce antique");
    requestAnimationFrame(()=>{ window.OdyssiaEngine.launchQuest(qid); if(window.OdyssiaEngine._game&&window.OdyssiaEngine._game.scale) window.OdyssiaEngine._game.scale.refresh(); }); }
  function awardResult(res){ const prevLevel=level(); const prev=state.scores[res.mode]||0;
    if(res.earnedXp>prev){ state.xp += (res.earnedXp-prev); state.scores[res.mode]=res.earnedXp; }
    if(res.correct>=Math.ceil(res.total/2)) state.done[res.mode]=true; save();
    const nl=level(); if(nl>prevLevel){ updateAvatars(); toast("⭐ Ton avatar évolue — niveau "+nl+" !", true); }
    refreshHud();
  }
  function awardQuestResult(res){ const prevLevel=level(); const prev=state.questScores[res.quest]||0;
    if(res.earnedXp>prev){ state.xp += (res.earnedXp-prev); state.questScores[res.quest]=res.earnedXp; }
    if(res.correct>=Math.ceil(res.total/2)) state.quests[res.quest]=true; save();
    const nl=level(); if(nl>prevLevel){ updateAvatars(); toast("⭐ Ton avatar évolue — niveau "+nl+" !", true); }
    refreshHud();
  }
  function checkVictory(){ if(MATHS_MODES.every(m=>state.done[m])){ $("victory-xp").textContent=state.xp; $("victory").classList.add("show"); } }

  /* ---------- Avatar IA (1 appel optionnel + fallback procédural) ---------- */
  const AVATAR_API = { url:"", key:"" };
  async function generateAvatarAI(pseudo){ if(!AVATAR_API.url) throw new Error("no-api");
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),4000);
    try{ const res=await fetch(AVATAR_API.url,{ method:"POST", signal:ctrl.signal,
        headers:{ "Content-Type":"application/json", ...(AVATAR_API.key?{"Authorization":"Bearer "+AVATAR_API.key}:{}) },
        body:JSON.stringify({ prompt:"avatar collégien "+pseudo }) });
      if(!res.ok) throw new Error("bad-status"); const data=await res.json();
      if(typeof data.seed==="number") return data.seed>>>0; throw new Error("bad-shape");
    } finally { clearTimeout(to); }
  }

  /* ---------- Écrans (accueil / onboarding / quiz / hub) ---------- */
  let appState="boot";
  function showScreen(id){ ["screen-accueil","screen-onboarding","screen-quiz","screen-hub"].forEach(s=>{ const el=$(s); if(el) el.classList.toggle("show", s===id); }); }
  function showAccueil(){ appState="accueil"; const has=!!state.pseudo;
    $("btn-commencer").innerHTML = has ? '<span class="material-symbols-outlined">play_arrow</span> CONTINUER L\'AVENTURE'
                                       : '<span class="material-symbols-outlined">play_arrow</span> COMMENCER';
    $("btn-reset-wrap").style.display = has ? "block" : "none";
    showScreen("screen-accueil"); }

  let onbSeed=0;
  function showOnboarding(){ appState="onboarding"; showScreen("screen-onboarding");
    $("onb-pseudo").value=state.pseudo||""; $("onb-classe").value=state.classe||"6e A";
    onbSeed=state.avatarSeed|| (Math.random()*0xffffffff>>>0); refreshOnbAvatar(); setTimeout(()=>$("onb-pseudo").focus(),50); }
  function refreshOnbAvatar(){ $("onb-avatar").src=renderAvatarURL(onbSeed,1); }
  async function onIAavatar(){ const btn=$("btn-av-ia"); const pseudo=$("onb-pseudo").value.trim()||"Explorateur";
    btn.disabled=true; const old=btn.innerHTML; btn.innerHTML='<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Génération…';
    try{ const seed=await generateAvatarAI(pseudo); onbSeed=seed>>>0; refreshOnbAvatar(); toast("Avatar généré par l'IA !",true); }
    catch(e){ onbSeed=hashString(pseudo); refreshOnbAvatar(); toast("IA indisponible — avatar par défaut généré",false); }
    finally{ btn.disabled=false; btn.innerHTML=old; } }
  function submitOnboarding(){ const pseudo=$("onb-pseudo").value.trim(); if(!pseudo){ $("onb-pseudo").focus(); toast("Choisis un pseudo !",false); return; }
    state.pseudo=pseudo; state.classe=$("onb-classe").value; state.avatarSeed=onbSeed; save(); updateAvatars(); startQuiz(); }

  let quizIdx=0, quizCounts={};
  function startQuiz(){ appState="quiz"; quizIdx=0; quizCounts={visuel:0,auditif:0,lire:0,kinesthesique:0}; renderQuiz(); showScreen("screen-quiz"); }
  function renderQuiz(){ const prog=$("qz-prog"); prog.innerHTML="";
    for(let i=0;i<CONTENT.varkQuiz.length;i++){ const d=document.createElement("div"); d.className="dot"+(i<=quizIdx?" on":""); prog.appendChild(d); }
    const q=CONTENT.varkQuiz[quizIdx]; const body=$("qz-body");
    body.innerHTML='<div class="qz-q">'+(quizIdx+1)+'. '+q.q+'</div>';
    q.options.forEach(opt=>{ const b=document.createElement("button"); b.className="qz-opt"; b.textContent=opt.text;
      b.onclick=()=>{ uiSFX.click(); quizCounts[opt.vark]++; quizIdx++; if(quizIdx<CONTENT.varkQuiz.length) renderQuiz(); else showQuizResult(); }; body.appendChild(b); }); }
  function showQuizResult(){ let best="visuel",bestN=-1; MATHS_MODES.forEach(m=>{ if(quizCounts[m]>bestN){ bestN=quizCounts[m]; best=m; } });
    state.varkProfile=best; save(); const v=VARK[best]; const body=$("qz-body");
    body.innerHTML='<div style="text-align:center;"><div class="vk-med" style="width:64px;height:64px;border-radius:50%;background:'+v.accent+';display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><span class="material-symbols-outlined" style="font-size:34px;color:#fff;">'+v.icon+'</span></div>'
      +'<h2 style="font-size:22px;">Ton profil : '+v.label+'</h2>'
      +'<p style="font-family:var(--font-body);color:var(--on-surface-variant);font-size:14px;margin:8px 0 16px;">C\'est le mode qu\'on te conseillera en premier. Tu pourras changer de mode à tout moment dans chaque matière !</p>'
      +'<div class="sub" style="margin-bottom:8px;">Tu préfères un autre mode ? Choisis-le :</div></div>';
    const grid=document.createElement("div"); grid.id="vark-grid";
    MATHS_MODES.forEach(m=>{ const vv=VARK[m]; const card=document.createElement("button"); card.className="vark-card"+(m===best?" reco":"");
      card.innerHTML='<div class="vk-med" style="background:'+vv.accent+'"><span class="material-symbols-outlined" style="font-size:20px;">'+vv.icon+'</span></div><div class="vk-t">'+vv.label+'</div><div class="vk-d">'+vv.desc+'</div>'+(m===best?'<span class="reco-tag">Conseillé</span>':'');
      card.onclick=()=>{ uiSFX.click(); state.varkProfile=m; save(); document.querySelectorAll("#vark-grid .vark-card").forEach(c=>c.classList.remove("reco")); card.classList.add("reco"); };
      grid.appendChild(card); });
    body.appendChild(grid);
    const go=document.createElement("button"); go.className="bigbtn btn"; go.style.cssText="width:100%;margin-top:18px;";
    go.innerHTML='<span class="material-symbols-outlined">explore</span> Entrer dans le village';
    go.onclick=()=>{ uiSFX.enter(); enterHub(); }; body.appendChild(go); }

  function enterHub(){ appState="hub"; showScreen("screen-hub"); updateAvatars(); refreshHub();
    toast("Bienvenue "+(state.pseudo||"")+" ! Clique sur la Tour des étoiles (Maths).", true); }

  /* ---------- Wiring ---------- */
  function wire(){
    $("btn-commencer").onclick=()=>{ uiSFX.resume(); uiSFX.enter(); if(state.pseudo) enterHub(); else showOnboarding(); };
    $("btn-reset").onclick=(e)=>{ e.preventDefault(); try{ localStorage.removeItem(KEY); }catch(_){} state=freshState(); showOnboarding(); };
    $("btn-av-dice").onclick=()=>{ uiSFX.click(); onbSeed=(Math.random()*0xffffffff)>>>0; refreshOnbAvatar(); };
    $("btn-av-ia").onclick=onIAavatar;
    $("btn-onb-next").onclick=()=>{ uiSFX.click(); submitOnboarding(); };
    $("onb-pseudo").addEventListener("keydown",e=>{ if(e.key==="Enter") submitOnboarding(); });
    $("sm-close").onclick=()=>{ uiSFX.click(); closeSubjectModal(); };
    $("btn-victory-close").onclick=()=>{ uiSFX.click(); $("victory").classList.remove("show"); };
    $("engine-back").onclick=()=>{ uiSFX.click(); if(window.OdyssiaEngine&&window.OdyssiaEngine.quit) window.OdyssiaEngine.quit(); else { hideEngine(); refreshHub(); } };
    $("btn-hub-reset").onclick=()=>{ uiSFX.click(); try{ localStorage.removeItem(KEY); }catch(_){} state=freshState(); showOnboarding(); };
    let muted=false; $("btn-sound").onclick=()=>{ muted=!muted; uiSFX.setMuted(muted); if(window.OdyssiaEngine) window.OdyssiaEngine.setMuted(muted);
      $("btn-sound").querySelector("span").textContent=muted?"volume_off":"volume_up"; };
    $("btn-help").onclick=()=>{ toast("Clique sur une matière pour voir le programme et jouer. Seuls les Maths sont jouables pour la démo !", true); };
    window.addEventListener("resize", ()=>{ if(appState==="hub") drawVillage(); });
    const wake=()=>uiSFX.resume(); window.addEventListener("pointerdown",wake,{once:true});
  }

  window.addEventListener("load", async ()=>{
    load(); wire();
    try{ await Promise.all([
      document.fonts.load('800 24px "Bricolage Grotesque"'),
      document.fonts.load('700 16px "Atkinson Hyperlegible"'),
      document.fonts.load('400 16px "Atkinson Hyperlegible"') ]); }catch(e){}
    try{ await document.fonts.ready; }catch(e){}
    // Moteur : initialisé une fois, callbacks branchés sur l'UI
    window.OdyssiaEngine.init({ parent:"engine-canvas",
      onReady(){ /* prêt */ },
      onFinish(res){ if(res.quest) awardQuestResult(res); else awardResult(res); },
      onClose(){ hideEngine(); refreshHub(); checkVictory(); } });
    updateAvatars(); showAccueil();
  });
})();
