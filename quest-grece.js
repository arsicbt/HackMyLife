/* ============================================================
   quest-grece.js — OdyssIA · QUÊTE "La Grèce antique"
   MONDE OUVERT jouable (façon napoleon-phaser), réskin Grèce, plein écran.
   Déplacement libre (flèches/WASD + croix tactile + A), 5 monuments à
   visiter ; chacun pose une question d'histoire 6e. Tout exploré = réussi.
   Rendu responsive (Scale.RESIZE) : l'UI se repositionne à la taille fenêtre.
   ============================================================ */
(function (root) {
  "use strict";
  const TILE = 32, MW = 22, MH = 16;
  const FONT_TITLE = '"Bricolage Grotesque", sans-serif';
  const FONT_BODY  = '"Atkinson Hyperlegible", sans-serif';
  const ACCENT = "#f2994a";
  const hx = h => parseInt(h.replace('#',''),16);
  const dk = (c,a)=> (root.QCOLOR ? root.QCOLOR.darken(c,a) : c);
  const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const HIT = (rect)=>({ hitArea:rect, hitAreaCallback:Phaser.Geom.Rectangle.Contains, useHandCursor:true });

  const SFX = (function(){ let ctx=null,muted=false,last=0;
    function AC(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return ctx; }
    function n(f,s,d,t,v){ const c=AC(); if(!c||muted) return; const o=c.createOscillator(),g=c.createGain(); o.type=t||"square"; o.frequency.value=f; o.connect(g); g.connect(c.destination); const tt=c.currentTime+s; g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(v||0.1,tt+0.01); g.gain.exponentialRampToValueAtTime(0.0001,tt+d); o.start(tt); o.stop(tt+d+0.03); }
    return { setMuted(m){muted=m;}, step(){ const t=performance.now(); if(t-last<150)return; last=t; n(150,0,0.05,"square",0.04); },
      click(){ n(520,0,0.05,"square",0.06); }, blip(){ n(380,0,0.04,"square",0.05); }, enter(){ n(523,0,0.08,"triangle",0.1); n(784,0.08,0.12,"triangle",0.1); },
      good(){ n(660,0,0.09,"square",0.11); n(990,0.09,0.12,"square",0.11); }, bad(){ n(196,0,0.16,"sawtooth",0.1); }, win(){ [523,659,784,1047,1319].forEach((f,i)=>n(f,i*0.1,0.15,"square",0.11)); } };
  })();

  /* ============================================================
     CONFIG API — appels DIRECTS depuis le navigateur (clé collée).
     ⚠️ Colle ta clé Google AI Studio / Cloud ci-dessous. Laisser vide = mode
     repli (QCM texte + voix du navigateur), le jeu marche quand même.
     ============================================================ */
  const ODYSSIA_API = {
    key: "",                                   // ⬅️ COLLE TA CLÉ ICI
    imageModel: "gemini-3.1-flash-image",
    useGoogleTts: true,                        // false = voix du navigateur (Web Speech)
    ttsLang: "fr-FR",                          // "en-US" pour parler anglais
  };

  function _norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"").trim(); }
  function localMatch(a, acc){ const x=_norm(a); if(!x) return false; return (acc||[]).some(o=>{ const n=_norm(o); return n && (x===n || x.includes(n) || n.includes(x)); }); }

  /** Génère une image via Gemini "Nano Banana" → renvoie une dataURL (ou throw). */
  async function geminiImage(prompt){
    if(!ODYSSIA_API.key) throw new Error("no-key");
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + ODYSSIA_API.imageModel + ":generateContent?key=" + encodeURIComponent(ODYSSIA_API.key);
    const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ responseModalities:["IMAGE"] } }) });
    if(!res.ok) throw new Error("img " + res.status);
    const data = await res.json();
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const img = parts.find(p => p.inlineData && /image/.test(p.inlineData.mimeType || ""));
    if(!img) throw new Error("no-image");
    return "data:" + (img.inlineData.mimeType || "image/png") + ";base64," + img.inlineData.data;
  }

  /** Voix du navigateur (gratuit, fonctionne hors-ligne). */
  function webSpeech(text, lang){ if(!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = lang || "fr-FR"; u.rate = 0.95;
    const v = window.speechSynthesis.getVoices().find(vo => vo.lang && vo.lang.toLowerCase().startsWith((lang||"fr").slice(0,2))); if(v) u.voice = v;
    window.speechSynthesis.speak(u); }
  /** TTS Google Cloud (clé) avec repli automatique sur la voix du navigateur. */
  async function speakSmart(text, lang){
    if(ODYSSIA_API.key && ODYSSIA_API.useGoogleTts){
      try {
        const url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(ODYSSIA_API.key);
        const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ input:{ text }, voice:{ languageCode: lang || ODYSSIA_API.ttsLang }, audioConfig:{ audioEncoding:"MP3" } }) });
        if(!res.ok) throw new Error("tts " + res.status);
        const data = await res.json(); const audio = new Audio("data:audio/mp3;base64," + data.audioContent); await audio.play(); return;
      } catch(e) { /* repli ci-dessous */ }
    }
    webSpeech(text, lang || ODYSSIA_API.ttsLang);
  }

  const GRECE = {
    maxXP: 40,
    intro: ["Bienvenue à Athènes, jeune voyageur ! Déplace-toi avec les flèches (ou la croix tactile), puis entre dans les monuments avec A.",
            "Chaque monument propose une épreuve différente (méthode VARK) : observer, écouter, écrire, agir."],
    monuments: [
      { key:"agora", name:"L'Agora", emoji:"🏛️", vark:"lire",
        q:"Comment appelle-t-on une cité grecque indépendante comme Athènes ? (écris le mot)",
        reponsesAcceptees:["polis","une polis","la polis"],
        options:["une polis","une légion","un pharaon","une tribu"], answer:0,
        explain:"Une cité-État grecque s'appelle une polis : une ville et son territoire, avec ses lois." },
      { key:"pnyx", name:"L'Assemblée", emoji:"🗳️", vark:"qcm",
        q:"À Athènes, qui pouvait voter à l'Ecclésia (l'assemblée) ?",
        options:["Les citoyens : hommes libres nés à Athènes","Tout le monde, femmes et esclaves compris","Seulement le roi","Uniquement les enfants"], answer:0,
        explain:"Seuls les citoyens (hommes libres nés à Athènes) votaient." },
      { key:"acropole", name:"Le Parthénon", emoji:"🦉", vark:"visuel",
        q:"Clique sur le Parthénon, le temple d'Athéna à Athènes.",
        images:[
          { prompt:"Le Parthénon : grand temple grec antique en marbre blanc, nombreuses colonnes, sur l'Acropole d'Athènes, ciel bleu, style illustration nette", correct:true },
          { prompt:"Une grande pyramide d'Égypte ancienne dans le désert, style illustration nette", correct:false },
          { prompt:"Le Colisée romain antique, amphithéâtre ovale, style illustration nette", correct:false },
          { prompt:"Une pagode japonaise traditionnelle à plusieurs toits, style illustration nette", correct:false }
        ],
        options:["Le Parthénon (temple à colonnes)","Une pyramide d'Égypte","Le Colisée romain","Une pagode japonaise"], answer:0,
        explain:"Le Parthénon, temple d'Athéna, se reconnaît à ses colonnes de marbre sur l'Acropole." },
      { key:"olympie", name:"Olympie", emoji:"🔥", vark:"kine",
        q:"Allume la flamme : dépose l'offrande quand le curseur est dans la zone verte !",
        explain:"À Olympie, on célébrait Zeus, roi des dieux, lors des Jeux Olympiques." },
      { key:"theatre", name:"Le Théâtre", emoji:"🎭", vark:"auditif",
        q:"Au théâtre grec, on jouait surtout des tragédies et des…",
        speak:"Écoute : au théâtre grec, sur les gradins en plein air, on jouait surtout deux genres. Le premier est la tragédie. Quel est le second ?",
        lang:"fr-FR",
        options:["comédies","opéras","films","ballets"], answer:0,
        explain:"Le théâtre grec présentait des tragédies et des comédies." }
    ]
  };
  const B_POS = [ {x:3,y:2}, {x:15,y:2}, {x:9,y:2}, {x:4,y:12}, {x:14,y:12} ];
  const SPAWN={x:10,y:9}, NPC={x:9,y:8}, PLAZA={x0:8,y0:7,x1:13,y1:10};

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function genWorld(seed){
    const rng=mulberry32(seed>>>0), ri=(a,b)=>a+Math.floor(rng()*(b-a+1));
    const grid=[]; for(let y=0;y<MH;y++){ const r=[]; for(let x=0;x<MW;x++) r.push((x===0||y===0||x===MW-1||y===MH-1)?'T':'G'); grid.push(r); }
    const setT=(x,y,c)=>{ if(x>0&&y>0&&x<MW-1&&y<MH-1) grid[y][x]=c; };
    const buildings=B_POS.map((p,i)=>({ idx:i, mon:GRECE.monuments[i], x:p.x, y:p.y, w:3, h:2, top:(p.y<MH/2), door:{x:p.x+1,y:p.y+1} }));
    const fp=new Set(); buildings.forEach(b=>{ for(let dy=0;dy<b.h;dy++) for(let dx=0;dx<b.w;dx++) fp.add((b.x+dx)+","+(b.y+dy)); });
    for(let y=PLAZA.y0;y<=PLAZA.y1;y++) for(let x=PLAZA.x0;x<=PLAZA.x1;x++) setT(x,y,'P');
    for(let x=3;x<=MW-3;x++) setT(x,8,'P');
    buildings.forEach(b=>{ const ax=b.door.x, ay=b.door.y+1; setT(ax,ay,'P');
      if(b.top){ for(let y=Math.min(ay,8);y<=Math.max(ay,8);y++) setT(ax,y,'P'); const tx=ax<11?PLAZA.x0:PLAZA.x1; for(let x=Math.min(ax,tx);x<=Math.max(ax,tx);x++) setT(x,8,'P'); }
      else { const sc=ax<11?Math.min(ax+2,PLAZA.x0):Math.max(ax-2,PLAZA.x1); for(let x=Math.min(ax,sc);x<=Math.max(ax,sc);x++) setT(x,ay,'P'); for(let y=8;y<=ay;y++) setT(sc,y,'P'); const tx=sc<11?PLAZA.x0:PLAZA.x1; for(let x=Math.min(sc,tx);x<=Math.max(sc,tx);x++) setT(x,8,'P'); } });
    const isFree=(x,y)=> grid[y][x]==='G' && !fp.has(x+","+y) && !(x===SPAWN.x&&y===SPAWN.y) && !(x===NPC.x&&y===NPC.y);
    let placed=0,guard=0; while(placed<4&&guard++<200){ const x=ri(1,MW-2),y=ri(1,MH-2); if(!isFree(x,y))continue; setT(x,y,'W'); if(rng()<0.6&&isFree(x+1,y))setT(x+1,y,'W'); placed++; }
    for(let y=1;y<MH-1;y++) for(let x=1;x<MW-1;x++){ if(isFree(x,y)&&rng()<0.10) setT(x,y,'T'); }
    return { grid, buildings, fp };
  }

  function drawHero(g,dir,step){ const cx=14, lL=step===1?-2:0, lR=step===1?0:-2;
    g.fillStyle(0x000000,0.18); g.fillEllipse(cx,34,16,5);
    g.fillStyle(0xe8c9a0,1); g.fillRect(cx-5,28+lL,4,7); g.fillRect(cx+1,28+lR,4,7);
    g.fillStyle(0xf4f0e6,1); g.fillRect(cx-6,15,12,14); g.fillStyle(0xddd6c4,1); g.fillRect(cx+2,15,4,14);
    g.fillStyle(0x3a6baf,1); g.fillRect(cx-6,15,12,3);
    g.fillStyle(0xf1c9a5,1); g.fillRect(cx-5,6,10,11); g.fillStyle(0x6a4a2a,1); g.fillRect(cx-5,4,10,5);
    if(dir==="up"){ g.fillStyle(0x553a1f,1); g.fillRect(cx-5,4,10,12); } else if(dir==="right"){ g.fillStyle(0x6a4a2a,1); g.fillRect(cx-5,4,9,7); }
    g.fillStyle(0xfdd404,1); g.fillRect(cx-5,9,10,2);
    g.fillStyle(0x1b1b23,1); if(dir==="down"){ g.fillRect(cx-3,11,2,2); g.fillRect(cx+1,11,2,2); } else if(dir==="right"){ g.fillRect(cx+1,11,2,2); } }
  function drawOlive(g){ const W=30,H=40,cx=15; g.fillStyle(0x000000,0.18); g.fillEllipse(cx,H-3,22,7);
    g.fillStyle(0x7a5a35,1); g.fillRect(cx-3,H-15,6,15); g.fillStyle(0x5c8a4a,1); g.fillEllipse(cx,16,26,22);
    g.fillStyle(0x7aa861,1); g.fillEllipse(cx-3,13,16,14); g.fillStyle(0x2a2a2a,1); for(let i=0;i<4;i++) g.fillCircle(cx-6+i*5,18,1.6); return [W,H]; }
  function drawColumn(g){ const W=24,H=44,cx=12; g.fillStyle(0x000000,0.18); g.fillEllipse(cx,H-3,18,6);
    g.fillStyle(0xf2eee2,1); g.fillRect(cx-7,H-34,14,34); g.fillStyle(0xdcd5c4,1); for(let i=0;i<4;i++) g.fillRect(cx-7+i*4,H-34,1,34);
    g.fillStyle(0xe7e0cf,1); g.fillRect(cx-9,H-38,18,5); g.fillRect(cx-9,H-4,18,4); g.lineStyle(1,0x9a927f,0.6); g.strokeRect(cx-7,H-34,14,34); return [W,H]; }
  function drawRock(g){ const W=30,H=24,cx=15; g.fillStyle(0x000000,0.18); g.fillEllipse(cx,H-3,24,7);
    g.fillStyle(0xb9b2a2,1); g.fillRect(4,6,22,15); g.fillStyle(0x9a927f,1); g.fillRect(4,15,22,6); g.fillStyle(0xd2ccbd,1); g.fillRect(8,8,8,5); g.lineStyle(1,0x6a6457,0.6); g.strokeRect(4,6,22,15); return [W,H]; }
  function drawWater(g,frame){ g.fillStyle(0x3a8fd6,1); g.fillRect(0,0,TILE,TILE); g.fillStyle(0x2f78b8,1); g.fillRect(0,TILE-6,TILE,6);
    const o=frame?6:0; g.fillStyle(0x8fc3ee,0.85); g.fillRect((4+o)%TILE,8,10,2); g.fillRect((18+o)%TILE,18,8,2); g.fillRect((10+o)%TILE,26,6,2); }
  function drawGround(g,c,sx,sy,gx,gy){ if(c==='P') return;
    g.fillStyle(0x9fc06a,1); g.fillRect(sx,sy,TILE,TILE);
    g.fillStyle(0x8fb35c,1); for(let i=0;i<6;i++){ const px=(gx*13+i*7+gy*3)%TILE, py=(gy*11+i*5+gx*7)%TILE; if((px+py)%5<2) g.fillRect(sx+px,sy+py,3,3); }
    g.fillStyle(0xb6cf86,0.7); for(let i=0;i<3;i++){ const px=(gx*5+i*9)%TILE, py=(gy*7+i*11)%TILE; g.fillRect(sx+px,sy+py,2,2); } }
  function drawCobble(g){ g.fillStyle(0xe7d6a8,1); g.fillRect(0,0,TILE,TILE);
    [[8,9,9,8],[23,8,8,7],[8,23,8,8],[23,22,9,8],[16,16,7,6]].forEach(s=>{ g.fillStyle(0xcdb985,1); g.fillEllipse(s[0],s[1],s[2]+2,s[3]+2); g.fillStyle(0xf3e7c4,1); g.fillEllipse(s[0]-1,s[1]-2,s[2]-3,s[3]-4); }); }
  function drawTemple(g,w,h,accent){ const cx=w/2;
    g.fillStyle(0x000000,0.18); g.fillEllipse(cx,h-2,w*0.92,12);
    g.fillStyle(0xcfc7b2,1); g.fillRect(2,h-8,w-4,8); g.fillRect(6,h-15,w-12,8);
    const bw=Math.round(w*0.82), bx=cx-bw/2, by=h-15-Math.round(h*0.5), bh=Math.round(h*0.5);
    g.fillStyle(0xf4f0e4,1); g.fillRect(bx,by,bw,bh);
    const cps=[bx+6,bx+bw/3-3,bx+bw*2/3-3,bx+bw-12]; g.fillStyle(0xfbf8ef,1);
    cps.forEach(px=>{ g.fillRect(px,by,9,bh); g.fillStyle(0xddd6c4,1); g.fillRect(px,by,9,4); g.fillRect(px,by+bh-4,9,4); g.fillStyle(0xfbf8ef,1); });
    g.fillStyle(accent,1); g.beginPath(); g.moveTo(bx-6,by); g.lineTo(cx,by-20); g.lineTo(bx+bw+6,by); g.closePath(); g.fillPath();
    g.fillStyle(dk(accent,12),1); g.fillRect(bx-6,by-2,bw+12,4);
    const dw=Math.round(bw*0.26), dh=Math.round(bh*0.6); g.fillStyle(0x6a4a2a,1); g.fillRect(cx-dw/2,h-15-dh,dw,dh);
    g.lineStyle(2,0x1b1b23,0.4); g.strokeRect(bx,by,bw,bh); }

  class GreceWorldScene extends Phaser.Scene {
    constructor(){ super("QuestGrece"); }
    init(data){ this.qid=(data&&data.id)||"grece"; this.content=(data&&data.content)||GRECE;
      this.done=this.content.monuments.map(()=>false); this.correct=0; this.answered=0; this.busy=true; }
    SW(){ return this.scale.width; } SH(){ return this.scale.height; }
    create(){
      this.pad={up:false,down:false,left:false,right:false};
      this.makeTextures(); this.cameras.main.setBackgroundColor(0x9fc06a); this.buildWorld();
      this.cursors=this.input.keyboard.createCursorKeys();
      this.wasd=this.input.keyboard.addKeys({up:"W",down:"S",left:"A",right:"D"});
      this.input.keyboard.addCapture("UP,DOWN,LEFT,RIGHT,SPACE,ENTER");
      ["SPACE","ENTER"].forEach(k=> this.input.keyboard.on("keydown-"+k, ()=>this.action()));
      this.buildControls(); this.layoutControls();
      this.scale.on("resize", this.onResize, this);
      this.events.once("shutdown", ()=>{ this.scale.off("resize", this.onResize, this); });
      this.cameras.main.fadeIn(400,0,0,0);
      this.showDialogue(this.content.intro);
    }
    onResize(){ this.layoutControls(); if(this.dlg&&this.dlg.visible) this._renderDlg(); }
    makeTextures(){ const mk=(key,w,h,fn)=>{ if(this.textures.exists(key)) return; const g=this.make.graphics({add:false}); fn(g); g.generateTexture(key,w,h); g.destroy(); };
      ["down","up","right"].forEach(d=>{ for(let s=0;s<2;s++) mk("gh_"+d+"_"+s,28,36,g=>drawHero(g,d,s)); });
      mk("g_cobble",TILE,TILE,drawCobble); mk("g_olive",30,40,drawOlive); mk("g_col",24,44,drawColumn); mk("g_rock",30,24,drawRock);
      [0,1].forEach(f=>mk("g_water"+f,TILE,TILE,g=>drawWater(g,f)));
      if(!this.anims.exists("g_wateranim")) this.anims.create({key:"g_wateranim",frames:[{key:"g_water0"},{key:"g_water1"}],frameRate:1.6,repeat:-1});
    }
    buildWorld(){
      const gen=genWorld(20260606); this.grid=gen.grid; this.buildings=gen.buildings; this.fp=gen.fp;
      const g=this.make.graphics({add:false});
      for(let y=0;y<MH;y++) for(let x=0;x<MW;x++) drawGround(g, this.grid[y][x], x*TILE, y*TILE, x, y);
      const rt=this.add.renderTexture(0,0,MW*TILE,MH*TILE).setOrigin(0,0).setDepth(-1e6); rt.draw(g); g.destroy();
      for(let y=0;y<MH;y++) for(let x=0;x<MW;x++) if(this.grid[y][x]==='P') rt.draw("g_cobble",x*TILE,y*TILE);
      const styles=["g_olive","g_col","g_rock"];
      for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){ const c=this.grid[y][x];
        if(c==='W'){ const s=this.add.sprite(x*TILE,y*TILE,"g_water0").setOrigin(0,0).setDepth(-9e5); s.play("g_wateranim"); }
        else if(c==='T'){ const st=styles[(x*3+y*5)%styles.length]; this.add.image(x*TILE+TILE/2,y*TILE+TILE,st).setOrigin(0.5,1).setDepth(y*TILE+TILE); } }
      this.buildings.forEach(b=> this.makeBuilding(b)); this.makeNPC();
      this.px=SPAWN.x; this.py=SPAWN.y; this.dir="down"; this.moving=false; this.frame=0; this.walkT=0; this._dirty=true; this._lastDir=null;
      this.player=this.add.sprite(this.px*TILE+TILE/2,this.py*TILE+TILE,"gh_down_0").setOrigin(0.5,1);
      this.cameras.main.setBounds(0,0,MW*TILE,MH*TILE); this.cameras.main.startFollow(this.player,true,0.18,0.18,0,-8);
      this.cameras.main.setDeadzone(36,36); this.cameras.main.roundPixels=false;
    }
    makeBuilding(b){ const accent=hx(ACCENT), w=b.w*TILE, h=b.h*TILE; const c=this.add.container(b.x*TILE,b.y*TILE).setDepth((b.y+b.h)*TILE);
      const g=this.add.graphics(); drawTemple(g,w,h,accent); c.add(g);
      c.add(this.add.text(w/2,-20,b.mon.emoji,{fontSize:"22px"}).setOrigin(0.5));
      const lbl=this.add.container(w/2,-40); const bw=b.mon.name.length*7+16; const lg=this.add.graphics();
      lg.fillStyle(0xffffff,0.92); lg.fillRoundedRect(-bw/2,-9,bw,18,9); lg.lineStyle(2,accent,1); lg.strokeRoundedRect(-bw/2,-9,bw,18,9);
      lbl.add([lg,this.add.text(0,0,b.mon.name,{fontFamily:FONT_TITLE,fontSize:"11px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0.5)]); c.add(lbl);
      const star=this.add.text(w/2,-56,"🌟",{fontSize:"18px"}).setOrigin(0.5).setVisible(false); c.add(star); b._star=star; }
    makeNPC(){ const px=NPC.x*TILE+TILE/2, py=NPC.y*TILE+TILE; const t=this.add.text(px,py-4,"🧔",{fontSize:"26px"}).setOrigin(0.5,1).setDepth(py);
      this.tweens.add({targets:t,y:py-7,duration:1100,yoyo:true,repeat:-1,ease:"Sine.inOut"}); }

    buildControls(){ this.ui={};
      const mkPad=(label,dir)=>{ const c=this.add.container(0,0).setScrollFactor(0).setDepth(5e6); const g=this.add.graphics();
        g.fillStyle(0xfcf8ff,0.92); g.fillRoundedRect(-23,-23,46,46,12); g.lineStyle(2,root.QC.outlineVariant,1); g.strokeRoundedRect(-23,-23,46,46,12);
        c.add([g,this.add.text(0,0,label,{fontFamily:FONT_TITLE,fontSize:"20px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0.5)]);
        c.setSize(50,50).setInteractive(HIT(new Phaser.Geom.Rectangle(-25,-25,50,50)));
        const on=()=>{ this.pad[dir]=true; }, off=()=>{ this.pad[dir]=false; };
        c.on("pointerdown",on); c.on("pointerup",off); c.on("pointerout",off); c.on("pointerupoutside",off); return c; };
      this.ui.up=mkPad("▲","up"); this.ui.down=mkPad("▼","down"); this.ui.left=mkPad("◀","left"); this.ui.right=mkPad("▶","right");
      const A=this.add.container(0,0).setScrollFactor(0).setDepth(5e6); const ag=this.add.graphics();
      ag.fillStyle(hx("#4343d5"),1); ag.fillCircle(0,0,32); ag.lineStyle(3,0xffffff,1); ag.strokeCircle(0,0,32);
      A.add([ag,this.add.text(0,-2,"A",{fontFamily:FONT_TITLE,fontSize:"22px",color:"#fff",fontStyle:"bold"}).setOrigin(0.5),this.add.text(0,14,"ENTRER",{fontFamily:FONT_BODY,fontSize:"8px",color:"#fff",fontStyle:"bold"}).setOrigin(0.5)]);
      A.setSize(68,68).setInteractive(HIT(new Phaser.Geom.Rectangle(-34,-34,68,68))); A.on("pointerdown",()=>this.action()); this.ui.A=A;
      const Q=this.add.container(0,0).setScrollFactor(0).setDepth(5e6); const qg=this.add.graphics();
      qg.fillStyle(0xfcf8ff,0.95); qg.fillRoundedRect(-16,-16,32,32,10); qg.lineStyle(2,root.QC.outlineVariant,1); qg.strokeRoundedRect(-16,-16,32,32,10);
      Q.add([qg,this.add.text(0,0,"✕",{fontFamily:FONT_TITLE,fontSize:"16px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0.5)]);
      Q.setSize(36,36).setInteractive(HIT(new Phaser.Geom.Rectangle(-18,-18,36,36))); Q.on("pointerdown",()=>this.close()); this.ui.Q=Q;
      this.prog=this.add.text(0,0,"",{fontFamily:FONT_TITLE,fontSize:"13px",color:"#fff",fontStyle:"bold",stroke:"#1b1b23",strokeThickness:4}).setOrigin(0.5,0).setScrollFactor(0).setDepth(5e6);
      this.prompt=this.add.text(0,0,"",{fontFamily:FONT_BODY,fontSize:"12px",color:"#1b1b23",backgroundColor:"#fcf8ff",padding:{x:8,y:4},fontStyle:"bold"}).setOrigin(0.5,0).setScrollFactor(0).setDepth(5e6).setVisible(false);
      this.refreshProg();
    }
    layoutControls(){ if(!this.ui) return; const W=this.SW(), H=this.SH(); const bx=66, by=H-72;
      this.ui.up.setPosition(bx,by-46); this.ui.down.setPosition(bx,by+46); this.ui.left.setPosition(bx-48,by); this.ui.right.setPosition(bx+48,by);
      this.ui.A.setPosition(W-60,by); this.ui.Q.setPosition(W-30,30);
      this.prog.setPosition(W/2,14); this.prompt.setPosition(W/2,48);
      if(this.dlg) this.dlg.setPosition(W/2, H-86);
    }
    refreshProg(){ if(this.prog) this.prog.setText("🏛️ Monuments visités : "+this.done.filter(Boolean).length+" / "+this.content.monuments.length); }

    isBlocked(x,y){ if(x<0||y<0||x>=MW||y>=MH) return true; const c=this.grid[y][x]; if(c==='T'||c==='W') return true; if(this.fp.has(x+","+y)) return true; if(x===NPC.x&&y===NPC.y) return true; return false; }
    facing(){ const d=DIRS[this.dir]; return { x:this.px+d.x, y:this.py+d.y }; }
    heldDir(){ if(this.busy) return null; const c=this.cursors,w=this.wasd,p=this.pad;
      if(c.up.isDown||w.up.isDown||p.up) return "up"; if(c.down.isDown||w.down.isDown||p.down) return "down";
      if(c.left.isDown||w.left.isDown||p.left) return "left"; if(c.right.isDown||w.right.isDown||p.right) return "right"; return null; }
    tryStep(dir){ if(this.dir!==dir){ this.dir=dir; this._dirty=true; } const nx=this.px+DIRS[dir].x, ny=this.py+DIRS[dir].y; if(this.isBlocked(nx,ny)) return;
      this.moving=true; this.px=nx; this.py=ny; SFX.step();
      this.tweens.add({ targets:this.player, x:nx*TILE+TILE/2, y:ny*TILE+TILE, duration:150, ease:"Linear", onComplete:()=>{ this.moving=false; } }); }
    action(){ if(this.busy){ if(this.dlg&&this.dlg.visible){ this.advanceDialogue(); } return; } const f=this.facing();
      const b=this.buildings.find(b=> b.door.x===f.x && b.door.y===f.y);
      if(b){ if(this.done[b.idx]){ this.toast("Monument déjà visité ✔"); return; } this.openMonument(b); return; }
      if(NPC.x===f.x&&NPC.y===f.y){ SFX.blip(); this.showDialogue(["Le philosophe : « Explore la cité, jeune esprit ! Chaque monument cache une leçon. »"]); } }

    update(_,dt){ if(!this.player) return;
      if(!this.busy && !this.moving){ const d=this.heldDir(); if(d) this.tryStep(d); }
      if(this.moving){ this.walkT+=dt; if(this.walkT>130){ this.walkT=0; this.frame^=1; this._dirty=true; } }
      else if(this.frame!==0){ this.frame=0; this._dirty=true; }
      if(this._dirty || this._lastDir!==this.dir){ const td=this.dir==="left"?"right":this.dir; this.player.setTexture("gh_"+td+"_"+this.frame).setFlipX(this.dir==="left"); this._lastDir=this.dir; this._dirty=false; }
      this.player.setDepth(this.player.y);
      if(!this.busy) this.updatePrompt(); }
    updatePrompt(){ const f=this.facing(); const b=this.buildings.find(b=> b.door.x===f.x&&b.door.y===f.y);
      if(b){ this.prompt.setText((this.done[b.idx]?"✔ ":"")+b.mon.name+" — A pour entrer").setVisible(true); }
      else if(NPC.x===f.x&&NPC.y===f.y){ this.prompt.setText("Parler au philosophe — A").setVisible(true); }
      else this.prompt.setVisible(false); }

    showDialogue(lines){ this.busy=true; this.dlgLines=lines; this.dlgIdx=0; if(this.prompt) this.prompt.setVisible(false);
      if(!this.dlg){ this.dlg=this.add.container(this.SW()/2,this.SH()-86).setScrollFactor(0).setDepth(6e6);
        this.dlgBg=this.add.graphics(); this.dlgTxt=this.add.text(0,0,"",{fontFamily:FONT_BODY,fontSize:"14px",color:"#1b1b23",align:"center",wordWrap:{width:Math.min(560,this.SW()-60)}}).setOrigin(0.5);
        this.dlgHint=this.add.text(0,0,"▼ Touche / A pour continuer",{fontFamily:FONT_BODY,fontSize:"10px",color:"#464555",fontStyle:"bold"}).setOrigin(0.5);
        this.dlg.add([this.dlgBg,this.dlgTxt,this.dlgHint]); }
      this.dlg.setVisible(true); this._renderDlg(); }
    _renderDlg(){ if(!this.dlg) return; const txt=this.dlgLines[this.dlgIdx]; const ww=Math.min(560,this.SW()-60); this.dlgTxt.setWordWrapWidth(ww); this.dlgTxt.setText(txt);
      const w=ww+40, h=Math.max(64,this.dlgTxt.height+44);
      this.dlgBg.clear(); this.dlgBg.fillStyle(0x000000,0.12); this.dlgBg.fillRoundedRect(-w/2+4,-h/2+5,w,h,16);
      this.dlgBg.fillStyle(0xfcf8ff,1); this.dlgBg.fillRoundedRect(-w/2,-h/2,w,h,16); this.dlgBg.lineStyle(2,root.QC.outlineVariant,1); this.dlgBg.strokeRoundedRect(-w/2,-h/2,w,h,16);
      this.dlgTxt.setY(-6); this.dlgHint.setY(h/2-14); this.dlg.setPosition(this.SW()/2,this.SH()-86); }
    advanceDialogue(){ SFX.blip(); this.dlgIdx++; if(this.dlgIdx<this.dlgLines.length){ this._renderDlg(); } else { this.dlg.setVisible(false); this.dlgLines=null; this.busy=false; } }

    /* ---------- Dispatcher VARK (in-engine, plus de modal QCM) ---------- */
    openMonument(b){ this.busy=true; if(this.prompt) this.prompt.setVisible(false); SFX.enter();
      const v=(b.mon.vark)||"qcm";
      if(v==="visuel") this.varkVisuel(b); else if(v==="auditif") this.varkAuditif(b);
      else if(v==="lire") this.varkLire(b); else if(v==="kine") this.varkKine(b); else this.varkQcm(b);
    }
    /** Panneau commun (dim + carte + titre du monument). */
    panelBase(b, tag){ const QC=root.QC, W=this.SW(), H=this.SH();
      const ov=this.add.container(0,0).setScrollFactor(0).setDepth(7e6); this.qov=ov;
      ov.add(this.add.rectangle(W/2,H/2,W,H,0x1b1b23,0.55).setInteractive());
      const pw=Math.min(560,W-40), px=(W-pw)/2, ph=Math.min(700,H-40), pt=(H-ph)/2; const bg=this.add.graphics();
      bg.fillStyle(0x000000,0.18); bg.fillRoundedRect(px+5,pt+8,pw,ph,20); bg.fillStyle(QC.surface,1); bg.fillRoundedRect(px,pt,pw,ph,20);
      bg.lineStyle(2,QC.outlineVariant,1); bg.strokeRoundedRect(px,pt,pw,ph,20); bg.fillStyle(hx(ACCENT),1); bg.fillRoundedRect(px,pt,pw,8,{tl:20,tr:20,bl:0,br:0}); ov.add(bg);
      const cx=W/2;
      ov.add(this.add.text(px+16,pt+16,tag,{fontFamily:FONT_BODY,fontSize:"11px",color:ACCENT,fontStyle:"bold"}).setOrigin(0,0));
      ov.add(this.add.text(cx,pt+30,b.mon.emoji+"  "+b.mon.name,{fontFamily:FONT_TITLE,fontSize:"19px",color:"#b9651f",fontStyle:"bold"}).setOrigin(0.5,0));
      return { ov, cx, top: pt+66, pw, ph, pt };
    }
    btn(x,y,w,h,label,bg,fg,cb){ const c=this.add.container(x,y); const g=this.add.graphics(); const r=Math.min(14,h/2);
      const draw=f=>{ g.clear(); g.fillStyle(f,1); g.fillRoundedRect(-w/2,-h/2,w,h,r); g.lineStyle(2,dk(f,12),1); g.strokeRoundedRect(-w/2,-h/2,w,h,r); }; draw(bg);
      c.add([g,this.add.text(0,0,label,{fontFamily:FONT_TITLE,fontSize:"15px",color:fg,fontStyle:"bold"}).setOrigin(0.5)]);
      c.setSize(w,h).setInteractive(HIT(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h)));
      c.on("pointerover",()=>draw(dk(bg,6))); c.on("pointerout",()=>draw(bg));
      c.on("pointerdown",()=>{ SFX.click(); const oy=c.y; c.y=oy+2; this.time.delayedCall(90,()=>{c.y=oy;}); cb(); }); return c; }
    /** Feedback + bouton Continuer (clôt le monument, marque la visite). */
    finishOption(b, ov, cx, y, correct, explain){ this.answered++; if(correct) this.correct++;
      ov.add(this.add.text(cx,y,(correct?"✅ Bien joué ! ":"❌ Pas tout à fait. ")+(explain||""),
        {fontFamily:FONT_BODY,fontSize:"13px",color: correct?"#1f7a3a":"#b00020", align:"center", wordWrap:{width:Math.min(520,this.SW()-80)}}).setOrigin(0.5,0));
      ov.add(this.btn(cx,y+56,200,42,"Continuer →",hx(ACCENT),"#ffffff",()=>{
        if(this._lireCleanup){ this._lireCleanup(); this._lireCleanup=null; }
        this.done[b.idx]=true; if(b._star) b._star.setVisible(true); this.refreshProg();
        ov.destroy(); this.qov=null; if(this.done.every(Boolean)) this.finish(); else this.busy=false; }));
    }
    /** QCM (tap) — utilisé par 'qcm', 'auditif' et le repli visuel. */
    renderQCM(ov, b, cx, y){ const QC=root.QC, m=b.mon, pw=Math.min(560,this.SW()-40), ow=pw-56; let locked=false; const els=[];
      m.options.forEach((opt,i)=>{ const c=this.add.container(cx,y+20); const g=this.add.graphics();
        const draw=(f,s)=>{ g.clear(); g.fillStyle(f,1); g.fillRoundedRect(-ow/2,-19,ow,38,12); g.lineStyle(2,s,1); g.strokeRoundedRect(-ow/2,-19,ow,38,12); }; draw(QC.surfaceContainer,QC.outlineVariant);
        c.add([g,this.add.text(-ow/2+14,0,opt,{fontFamily:FONT_BODY,fontSize:"14px",color:"#1b1b23",wordWrap:{width:ow-26}}).setOrigin(0,0.5)]); ov.add(c);
        c.setSize(ow,38).setInteractive(HIT(new Phaser.Geom.Rectangle(-ow/2,-19,ow,38)));
        c.on("pointerover",()=>{ if(!locked) draw(QC.primaryFixed,QC.primary); }); c.on("pointerout",()=>{ if(!locked) draw(QC.surfaceContainer,QC.outlineVariant); });
        c.on("pointerdown",()=>{ if(locked) return; locked=true; const ok=i===m.answer; draw(ok?0xc8f5d8:0xffd9de, ok?QC.green:QC.error); if(!ok) els[m.answer]._draw(0xc8f5d8,QC.green); ok?SFX.good():SFX.bad();
          this.finishOption(b,ov,cx, y + m.options.length*46 + 12, ok, m.explain); });
        c._draw=draw; els.push(c); y+=46; });
    }
    varkQcm(b){ const {ov,cx,top,pw}=this.panelBase(b,"QUESTION");
      const q=this.add.text(cx,top,b.mon.q,{fontFamily:FONT_TITLE,fontSize:"16px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:pw-40}}).setOrigin(0.5,0); ov.add(q);
      this.renderQCM(ov,b,cx,top+q.height+14); }
    /* ---------- Auditif : écoute (TTS) puis QCM ---------- */
    varkAuditif(b){ const {ov,cx,top,pw}=this.panelBase(b,"AUDITIF · écoute puis réponds"); const m=b.mon;
      ov.add(this.add.text(cx,top,"🎧",{fontSize:"40px"}).setOrigin(0.5,0));
      ov.add(this.btn(cx,top+66,210,44,"▶  ÉCOUTER",hx(ACCENT),"#ffffff",()=>speakSmart(m.speak||m.q, m.lang)));
      ov.add(this.add.text(cx,top+94,"Écoute bien, puis choisis la bonne réponse.",{fontFamily:FONT_BODY,fontSize:"12px",color:"#464555"}).setOrigin(0.5,0));
      this.time.delayedCall(350,()=>speakSmart(m.speak||m.q, m.lang));
      this.renderQCM(ov,b,cx,top+122); }
    /* ---------- Lire/Écrire : saisie au clavier ---------- */
    varkLire(b){ const {ov,cx,top,pw}=this.panelBase(b,"LIRE / ÉCRIRE · tape ta réponse"); const m=b.mon; const QC=root.QC;
      const q=this.add.text(cx,top,m.q,{fontFamily:FONT_TITLE,fontSize:"16px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:pw-40}}).setOrigin(0.5,0); ov.add(q);
      let y=top+q.height+16; const fw=Math.min(pw-60,360), fh=46, fx=cx-fw/2;
      const fg=this.add.graphics(); ov.add(fg); const drawF=s=>{ fg.clear(); fg.fillStyle(0xffffff,1); fg.fillRoundedRect(fx,y,fw,fh,12); fg.lineStyle(2.5,s,1); fg.strokeRoundedRect(fx,y,fw,fh,12); }; drawF(hx(ACCENT));
      let typed="", caret=true, locked=false;
      const tt=this.add.text(fx+14,y+fh/2,"",{fontFamily:FONT_BODY,fontSize:"18px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0,0.5); ov.add(tt);
      const rend=()=>tt.setText(typed+(caret&&!locked?"|":"")); rend();
      const cev=this.time.addEvent({delay:480,loop:true,callback:()=>{caret=!caret;rend();}});
      const submit=()=>{ if(locked) return; const a=typed.trim(); if(!a) return; locked=true;
        const ok=localMatch(a, m.reponsesAcceptees||[m.options[m.answer]]); drawF(ok?QC.green:QC.error); rend();
        if(this._lireCleanup){ this._lireCleanup(); this._lireCleanup=null; }
        if(valBtn) valBtn.destroy(); this.finishOption(b,ov,cx,y+fh+14, ok, m.explain); };
      const handler=(e)=>{ if(locked) return; const k=e.key; if(k==="Backspace") typed=typed.slice(0,-1); else if(k==="Enter"){ submit(); return; } else if(k.length===1 && typed.length<28 && /[À-ſ a-zA-Z0-9'\-]/.test(k)) typed+=k; else return; rend(); };
      this.input.keyboard.on("keydown",handler); this._lireCleanup=()=>{ this.input.keyboard.off("keydown",handler); cev.remove(); };
      ov.add(this.add.text(cx,y+fh+8,"⌨️ Tape puis Entrée",{fontFamily:FONT_BODY,fontSize:"11px",color:"#767586"}).setOrigin(0.5,0));
      const valBtn=this.btn(cx,y+fh+38,180,42,"✓  Valider",hx(ACCENT),"#ffffff",submit); ov.add(valBtn);
    }
    /* ---------- Kinesthésique : timing (zone verte) ---------- */
    varkKine(b){ const {ov,cx,top,pw}=this.panelBase(b,"KINESTHÉSIQUE · timing"); const m=b.mon; const QC=root.QC;
      ov.add(this.add.text(cx,top,m.q,{fontFamily:FONT_TITLE,fontSize:"15px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:pw-40}}).setOrigin(0.5,0));
      const barY=top+96, barW=Math.min(360,pw-60), bx=cx-barW/2, zoneW=barW*0.22;
      ov.add(this.add.rectangle(cx,barY,barW,26,0xefecf9).setStrokeStyle(2,QC.outlineVariant));
      ov.add(this.add.rectangle(cx,barY,zoneW,26,0x27ae60,0.55));
      const marker=this.add.rectangle(bx,barY,8,36,0x4343d5); ov.add(marker);
      const tw=this.tweens.add({targets:marker,x:bx+barW,duration:900,yoyo:true,repeat:-1,ease:"Sine.inOut"});
      let done=false;
      const tap=()=>{ if(done) return; done=true; tw.stop(); const ok=Math.abs(marker.x-cx)<=zoneW/2;
        marker.setFillStyle(ok?0x27ae60:0xe71d36); if(depose) depose.destroy(); this.finishOption(b,ov,cx,barY+44, ok, m.explain); };
      const depose=this.btn(cx,barY+44,200,46,"🔥  DÉPOSER",hx(ACCENT),"#ffffff",tap); ov.add(depose);
    }
    /* ---------- Visuel : QCM d'images (Gemini Nano Banana) + repli ---------- */
    loadImage(key,dataURL){ return new Promise((resolve,reject)=>{ const cb=(k)=>{ if(k===key){ this.textures.off("addtexture",cb); resolve(); } }; this.textures.on("addtexture",cb); try{ this.textures.addBase64(key,dataURL); }catch(e){ this.textures.off("addtexture",cb); reject(e); } }); }
    varkVisuel(b){ const {ov,cx,top,pw}=this.panelBase(b,"VISUEL · clique sur la bonne image"); const m=b.mon; const QC=root.QC;
      const q=this.add.text(cx,top,m.q||"Clique sur la bonne image.",{fontFamily:FONT_TITLE,fontSize:"16px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:pw-40}}).setOrigin(0.5,0); ov.add(q);
      let y=top+q.height+14;
      if(!ODYSSIA_API.key || !m.images){
        if(!ODYSSIA_API.key){ ov.add(this.add.text(cx,y,"(Colle ta clé API en haut de quest-grece.js pour des images générées — sinon QCM texte.)",{fontFamily:FONT_BODY,fontSize:"11px",color:"#767586",align:"center",wordWrap:{width:pw-60}}).setOrigin(0.5,0)); y+=30; }
        this.renderQCM(ov,b,cx,y); return;
      }
      const size=Math.min(150,(pw-70)/2), gap=18; let locked=false;
      const resultY=y+2*size+gap+18;
      const slots=m.images.map((im,i)=>{ const col=i%2,row=Math.floor(i/2);
        const sx=cx+(col?(size/2+gap/2):-(size/2+gap/2)); const sy=y+size/2+row*(size+gap);
        const r=this.add.rectangle(sx,sy,size,size,0xefecf9).setStrokeStyle(2,QC.outlineVariant); const lbl=this.add.text(sx,sy,"⏳",{fontSize:"22px"}).setOrigin(0.5);
        ov.add(r); ov.add(lbl); return {im,sx,sy,r,lbl,size}; });
      const choose=(s)=>{ if(locked) return; locked=true; s.r.setStrokeStyle(5, s.im.correct?QC.green:QC.error); s.im.correct?SFX.good():SFX.bad(); this.finishOption(b,ov,cx,resultY,s.im.correct,m.explain); };
      slots.forEach(s=>{ const rect=new Phaser.Geom.Rectangle(-s.size/2,-s.size/2,s.size,s.size);
        geminiImage(s.im.prompt)
          .then(url=>{ const key="gimg_"+b.idx+"_"+Math.floor(Math.random()*1e7); return this.loadImage(key,url).then(()=>{ s.lbl.destroy(); const img=this.add.image(s.sx,s.sy,key); const sc=s.size/Math.max(img.width||s.size,img.height||s.size); img.setScale(sc); ov.add(img); img.setInteractive(HIT(rect)); img.on("pointerdown",()=>choose(s)); }); })
          .catch(()=>{ s.lbl.setText("🖼️"); })
          .finally(()=>{ s.r.setInteractive(HIT(rect)); s.r.on("pointerdown",()=>choose(s)); });
      });
    }

    toast(msg){ if(this._t) this._t.destroy(); this._t=this.add.text(this.SW()/2,this.SH()-160,msg,{fontFamily:FONT_TITLE,fontSize:"13px",color:"#fff",backgroundColor:"#27ae60",padding:{x:12,y:7}}).setOrigin(0.5).setScrollFactor(0).setDepth(8e6);
      this.time.delayedCall(1400,()=>{ if(this._t){ this._t.destroy(); this._t=null; } }); }

    finish(){ this.busy=true; const total=Math.max(1,this.answered), earned=Math.round(this.correct/total*this.content.maxXP);
      if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onFinish) root.OdyssiaEngine._cfg.onFinish({ subject:"histgeo", quest:this.qid, correct:this.correct, total:total, earnedXp:earned, maxXp:this.content.maxXP });
      SFX.win(); const W=this.SW(),H=this.SH(); const ov=this.add.container(0,0).setScrollFactor(0).setDepth(9e6);
      ov.add(this.add.rectangle(W/2,H/2,W,H,0x1b1b23,0.6)); const bg=this.add.graphics();
      bg.fillStyle(root.QC.surface,1); bg.fillRoundedRect(W/2-180,H/2-150,360,300,22); bg.lineStyle(2,root.QC.outlineVariant,1); bg.strokeRoundedRect(W/2-180,H/2-150,360,300,22); ov.add(bg);
      ov.add(this.add.text(W/2,H/2-110,"🏛️",{fontSize:"54px"}).setOrigin(0.5));
      ov.add(this.add.text(W/2,H/2-46,"Quête accomplie !",{fontFamily:FONT_TITLE,fontSize:"22px",color:"#b9651f",fontStyle:"bold"}).setOrigin(0.5));
      ov.add(this.add.text(W/2,H/2-12,"Bonnes réponses : "+this.correct+" / "+total,{fontFamily:FONT_BODY,fontSize:"15px",color:"#1b1b23"}).setOrigin(0.5));
      ov.add(this.add.text(W/2,H/2+22,"+"+earned+" XP",{fontFamily:FONT_TITLE,fontSize:"26px",color:"#27ae60",fontStyle:"bold"}).setOrigin(0.5));
      const out=this.add.container(W/2,H/2+92); const og=this.add.graphics(); og.fillStyle(hx(ACCENT),1); og.fillRoundedRect(-110,-22,220,44,14); out.add([og,this.add.text(0,0,"Retour au village",{fontFamily:FONT_TITLE,fontSize:"15px",color:"#fff",fontStyle:"bold"}).setOrigin(0.5)]); ov.add(out);
      out.setSize(220,44).setInteractive(HIT(new Phaser.Geom.Rectangle(-110,-22,220,44))); out.on("pointerdown",()=>this.close()); }

    close(){ if(this._lireCleanup){ this._lireCleanup(); this._lireCleanup=null; } this.scene.stop(); if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onClose) root.OdyssiaEngine._cfg.onClose(); }
  }

  if(root.OdyssiaEngine && root.OdyssiaEngine.registerQuest)
    root.OdyssiaEngine.registerQuest("grece", "QuestGrece", GreceWorldScene, GRECE);
})(window);
