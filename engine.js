/* ============================================================
   engine.js — OdyssIA · MOTEUR DE MINI-JEUX (Phaser 3.90)
   Rendu plein écran (Scale.RESIZE, pleine résolution, lissé).
   Mini-jeux DIVERSIFIÉS par profil VARK :
     - visuel        : schéma dessiné + QCM
     - auditif       : on écoute l'énoncé (texte masqué) puis on répond
     - lire/écrire   : on TAPE la réponse au clavier (+ choix de secours)
     - kinesthésique : glisser-déposer pour ranger
   API : OdyssiaEngine.init({parent,onReady,onFinish,onClose})
         OdyssiaEngine.launch(subject, mode) / launchQuest(id) / quit()
   ============================================================ */
(function (root) {
  "use strict";
  const FONT_TITLE = '"Bricolage Grotesque", sans-serif';
  const FONT_BODY  = '"Atkinson Hyperlegible", sans-serif';
  const hx = h => parseInt(h.replace('#',''),16);
  const dk = (c,a)=> (root.QCOLOR ? root.QCOLOR.darken(c,a) : c);
  const HIT = (rect)=>({ hitArea:rect, hitAreaCallback:Phaser.Geom.Rectangle.Contains, useHandCursor:true });
  function normalize(s){ return (s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"").trim(); }

  const SFX = (function(){ let ctx=null,muted=false;
    function AC(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return ctx; }
    function note(f,s,d,t,v){ const c=AC(); if(!c||muted) return; const o=c.createOscillator(),g=c.createGain(); o.type=t||"square"; o.frequency.value=f; o.connect(g); g.connect(c.destination); const tt=c.currentTime+s; g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(v||0.12,tt+0.01); g.gain.exponentialRampToValueAtTime(0.0001,tt+d); o.start(tt); o.stop(tt+d+0.03); }
    return { resume(){ const c=AC(); if(c&&c.state==="suspended") c.resume(); }, setMuted(m){ muted=m; },
      click(){ note(520,0,0.05,"square",0.06); }, blip(){ note(380,0,0.04,"square",0.05); }, type(){ note(660,0,0.03,"square",0.04); },
      good(){ note(660,0,0.09,"square",0.11); note(990,0.09,0.12,"square",0.11); }, bad(){ note(196,0,0.16,"sawtooth",0.10); note(147,0.13,0.2,"sawtooth",0.08); },
      enter(){ note(523,0,0.08,"triangle",0.1); note(784,0.08,0.12,"triangle",0.1); } };
  })();
  function speak(text){ if(!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang="fr-FR"; u.rate=.95; const fr=window.speechSynthesis.getVoices().find(v=>/fr/i.test(v.lang)); if(fr) u.voice=fr; window.speechSynthesis.speak(u); }
  if("speechSynthesis" in window){ try{ window.speechSynthesis.getVoices(); }catch(e){} }

  class BootScene extends Phaser.Scene {
    constructor(){ super("Boot"); }
    create(){ const r=(key,size,inner,outer,r0,r1)=>{ if(this.textures.exists(key))return; const t=this.textures.createCanvas(key,size,size); const c=t.getContext();
        const grd=c.createRadialGradient(size/2,size/2,r0,size/2,size/2,r1); grd.addColorStop(0,inner); grd.addColorStop(1,outer); c.fillStyle=grd; c.fillRect(0,0,size,size); t.refresh(); };
      r("spark",12,"rgba(255,255,255,1)","rgba(255,255,255,0)",0,6); r("soft",16,"rgba(255,255,255,1)","rgba(255,255,255,0)",0,8);
      if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onReady) root.OdyssiaEngine._cfg.onReady();
    }
  }

  class MiniGameScene extends Phaser.Scene {
    constructor(){ super("MiniGame"); }
    init(data){ this.subject=data.subject; this.mode=data.mode; this.v=root.VARK[this.mode]; this.view=null; }
    create(){
      this.layout();
      this.dim=this.add.rectangle(0,0,this.W,this.H,0x1b1b23,0.35).setOrigin(0,0).setDepth(-2);
      this.panelG=this.add.graphics().setDepth(-1);
      this.chrome=this.add.container(0,0).setDepth(1);
      this.content=this.add.container(0,0).setDepth(2);
      this.spark=this.add.particles(0,0,"spark",{ lifespan:600, speed:{min:50,max:160}, scale:{start:0.9,end:0}, alpha:{start:1,end:0}, gravityY:240, tint:[0xfdd404,0x27ae60,0xffffff], quantity:1, maxParticles:80, emitting:false }).setDepth(50);
      this.drawChrome();
      const data=root.ODYSSIA_CONTENT.maths;
      if(this.mode==="visuel") this.startMCQ(data.visuel,{schema:true});
      else if(this.mode==="auditif") this.startMCQ(data.auditif,{audio:true,hideText:true});
      else if(this.mode==="lire") this.startType(data.lire);
      else if(this.mode==="kinesthesique") this.startOrder(data.kinesthesique);
      this.scale.on("resize", this.onResize, this);
      this.events.once("shutdown", ()=>{ this.scale.off("resize", this.onResize, this); this.detachType(); if(window.speechSynthesis) window.speechSynthesis.cancel(); });
    }
    layout(){ const W=this.scale.width, H=this.scale.height; this.W=W; this.H=H;
      this.PW=Math.min(540, Math.max(300, W-48)); this.PX=Math.round((W-this.PW)/2);
      this.PH=Math.min(680, Math.max(420, H-48)); this.PT=Math.round((H-this.PH)/2); this.PB=this.PT+this.PH; this.cx=Math.round(W/2); }
    onResize(){ this.layout(); if(this.dim){ this.dim.setSize(this.W,this.H); } this.drawChrome(); this.rerender(); }
    drawChrome(){ const QC=root.QC; const ph=this.PH;
      this.panelG.clear();
      this.panelG.fillStyle(0x000000,0.18); this.panelG.fillRoundedRect(this.PX+6,this.PT+8,this.PW,ph,22);
      this.panelG.fillStyle(QC.surface,1); this.panelG.fillRoundedRect(this.PX,this.PT,this.PW,ph,22);
      this.panelG.lineStyle(2,QC.outlineVariant,1); this.panelG.strokeRoundedRect(this.PX,this.PT,this.PW,ph,22);
      this.panelG.fillStyle(hx(this.v.accent),1); this.panelG.fillRoundedRect(this.PX,this.PT,this.PW,8,{tl:22,tr:22,bl:0,br:0});
      this.chrome.removeAll(true);
      this.chrome.add(this.add.text(this.PX+20,this.PT+22,this.v.letter+" · "+this.v.label,{fontFamily:FONT_BODY,fontSize:"13px",color:this.v.accent,fontStyle:"bold"}).setOrigin(0,0));
      this.chrome.add(this.add.text(this.PX+20,this.PT+40,this.v.title,{fontFamily:FONT_TITLE,fontSize:"22px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0,0));
      this.prog=this.add.text(this.PX+this.PW-50,this.PT+44,this.progTxt||"",{fontFamily:FONT_BODY,fontSize:"13px",color:"#464555"}).setOrigin(1,0); this.chrome.add(this.prog);
    }
    rerender(){ if(this.view==="mcq") this.renderQ(); else if(this.view==="type") this.renderType(); else if(this.view==="order") this.startOrder(this._orderData); else if(this.view==="result") this.showResult(); }
    setProg(t){ this.progTxt=t; if(this.prog) this.prog.setText(t); }

    /* ---------- boutons ---------- */
    makeBtn(x,y,w,h,label,bg,fg,cb,fs){ const c=this.add.container(x,y); const g=this.add.graphics(); const r=Math.min(16,h/2);
      const draw=(fill)=>{ g.clear(); g.fillStyle(fill,1); g.fillRoundedRect(-w/2,-h/2,w,h,r); g.lineStyle(2,dk(fill,12),1); g.strokeRoundedRect(-w/2,-h/2,w,h,r); }; draw(bg);
      const t=this.add.text(0,0,label,{fontFamily:FONT_TITLE,fontSize:(fs||"16px"),color:fg,fontStyle:"bold"}).setOrigin(0.5);
      c.add([g,t]); c.txt=t; c.setSize(w,h).setInteractive(HIT(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h)));
      c.on("pointerover",()=>draw(dk(bg,5))); c.on("pointerout",()=>draw(bg));
      c.on("pointerdown",()=>{ SFX.click(); const oy=c.y; c.y=oy+2; this.time.delayedCall(90,()=>{ c.y=oy; }); cb(c,t); });
      return c; }
    makeOption(x,y,w,h,label,cb){ const QC=root.QC; const c=this.add.container(x,y); const g=this.add.graphics();
      const draw=(fill,stroke)=>{ g.clear(); g.fillStyle(fill,1); g.fillRoundedRect(-w/2,-h/2,w,h,12); g.lineStyle(2,stroke,1); g.strokeRoundedRect(-w/2,-h/2,w,h,12); };
      draw(QC.surfaceContainer, QC.outlineVariant);
      const t=this.add.text(-w/2+16,0,label,{fontFamily:FONT_BODY,fontSize:"15px",color:"#1b1b23",wordWrap:{width:w-30}}).setOrigin(0,0.5);
      c.add([g,t]); c.setFill=draw; c.setSize(w,h).setInteractive(HIT(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h)));
      c.on("pointerover",()=>{ if(!this.locked) draw(QC.primaryFixed, QC.primary); });
      c.on("pointerout",()=>{ if(!this.locked) draw(QC.surfaceContainer, QC.outlineVariant); });
      c.on("pointerdown",()=>{ if(!this.locked) cb(); }); return c; }

    /* ---------- schémas (visuel) ---------- */
    drawSchema(type,data,cx,topY){ const g=this.add.graphics(); this.content.add(g); const acc=hx(this.v.accent), QC=root.QC;
      if(type==="fraction"){ const bw=Math.min(220,this.PW-80),bh=46,bx=cx-bw/2,by=topY; const seg=bw/data.den;
        for(let i=0;i<data.den;i++){ g.fillStyle(i<data.num?acc:0xffffff,1); g.fillRect(bx+i*seg,by,seg,bh); g.lineStyle(2,QC.onSurface,0.7); g.strokeRect(bx+i*seg,by,seg,bh); } return bh+10; }
      if(type==="shape"){ const rw=data.kind==="carre"?100:150, rh=data.kind==="carre"?100:64, rx=cx-rw/2, ry=topY;
        g.fillStyle(acc,0.18); g.fillRect(rx,ry,rw,rh); g.lineStyle(3,acc,1); g.strokeRect(rx,ry,rw,rh);
        const top=(data.labels&&data.labels.top)||"", side=(data.labels&&data.labels.side)||"";
        this.content.add(this.add.text(cx,ry-4,top,{fontFamily:FONT_BODY,fontSize:"13px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0.5,1));
        this.content.add(this.add.text(rx-6,ry+rh/2,side,{fontFamily:FONT_BODY,fontSize:"13px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(1,0.5)); return rh+16; }
      if(type==="angle"){ const vx=cx-60, vy=topY+70, len=120, rad=data.degrees*Math.PI/180;
        g.lineStyle(4,acc,1); g.beginPath(); g.moveTo(vx,vy); g.lineTo(vx+len,vy); g.strokePath();
        g.beginPath(); g.moveTo(vx,vy); g.lineTo(vx+Math.cos(-rad)*len, vy+Math.sin(-rad)*len); g.strokePath();
        g.lineStyle(2,QC.onSurfaceVariant,1); g.beginPath(); g.arc(vx,vy,26,0,-rad,true); g.strokePath();
        g.fillStyle(acc,1); g.fillCircle(vx,vy,4); return 86; }
      if(type==="numberline"){ const lw=Math.min(260,this.PW-70), lx=cx-lw/2, ly=topY+30, n=data.max-data.min;
        g.lineStyle(3,QC.onSurface,1); g.beginPath(); g.moveTo(lx,ly); g.lineTo(lx+lw,ly); g.strokePath();
        for(let i=0;i<=n;i++){ const px=lx+(i/n)*lw; g.lineStyle(2,QC.onSurface,1); g.beginPath(); g.moveTo(px,ly-6); g.lineTo(px,ly+6); g.strokePath();
          this.content.add(this.add.text(px,ly+10,String(data.min+i),{fontFamily:FONT_BODY,fontSize:"11px",color:"#464555"}).setOrigin(0.5,0)); }
        const ppx=lx+((data.point-data.min)/n)*lw; g.fillStyle(acc,1); g.fillTriangle(ppx,ly-10,ppx-7,ly-22,ppx+7,ly-22); return 60; }
      return 0;
    }

    /* ---------- QCM (visuel / auditif) ---------- */
    startMCQ(qs,opts){ this.qs=qs; this.opt=opts||{}; this.idx=0; this.correct=0; this.locked=false; this.view="mcq"; this.renderQ(); }
    renderQ(){ const QC=root.QC; this.content.removeAll(true); this.locked=false; const q=this.qs[this.idx], cx=this.cx; let y=this.PT+90;
      this.setProg("Q "+(this.idx+1)+" / "+this.qs.length);
      if(this.opt.audio){ this.content.add(this.add.text(cx,y,"🎧",{fontSize:"44px"}).setOrigin(0.5)); y+=46;
        const play=this.makeBtn(cx,y+12,200,46,"▶  ÉCOUTER L'ÉNONCÉ",hx(this.v.accent),"#ffffff",()=>speak(q.speak),"15px"); this.content.add(play); y+=46;
        this.content.add(this.add.text(cx,y,"Écoute bien, puis choisis la bonne réponse",{fontFamily:FONT_BODY,fontSize:"12px",color:"#464555"}).setOrigin(0.5)); y+=26;
        this.time.delayedCall(250,()=>speak(q.speak)); }
      else if(this.opt.schema){ const used=this.drawSchema(q.schemaType,q.schemaData,cx,y); y+=used+12; }
      if(!this.opt.hideText){ const qt=this.add.text(cx,y,(q.q||q.text||""),{fontFamily:FONT_TITLE,fontSize:"17px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0);
        this.content.add(qt); y+=qt.height+14; }
      this.optEls=[]; const ow=Math.min(this.PW-44,460);
      q.options.forEach((opt,i)=>{ const el=this.makeOption(cx,y+20,ow,40,opt,()=>this.choose(i,el)); this.content.add(el); this.optEls.push(el); y+=48; });
      this.explainText=this.add.text(cx,y+4,"",{fontFamily:FONT_BODY,fontSize:"13px",color:"#464555",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0); this.content.add(this.explainText);
    }
    choose(i,el){ const QC=root.QC; if(this.locked) return; this.locked=true; const q=this.qs[this.idx], ans=q.answer;
      if(i===ans){ this.correct++; el.setFill(0xc8f5d8,QC.green); SFX.good(); this.spark.emitParticleAt(el.x,el.y,16); this.cameras.main.flash(150,39,174,96); }
      else { el.setFill(0xffd9de,QC.error); this.optEls[ans].setFill(0xc8f5d8,QC.green); SFX.bad(); this.cameras.main.shake(160,0.006); }
      if(q.explain) this.explainText.setText("💡 "+q.explain);
      if(this.opt.audio && window.speechSynthesis) window.speechSynthesis.cancel();
      this.time.delayedCall(1700,()=>{ this.idx++; if(this.idx<this.qs.length) this.renderQ(); else this.finish(this.correct,this.qs.length); });
    }

    /* ---------- Lire / Écrire : saisie au clavier ---------- */
    startType(qs){ this.qs=qs; this.idx=0; this.correct=0; this.view="type"; this.renderType(); }
    detachType(){ if(this._typeH){ this.input.keyboard.off("keydown", this._typeH); this._typeH=null; } if(this._caretEv){ this._caretEv.remove(); this._caretEv=null; } }
    renderType(){ const QC=root.QC; this.content.removeAll(true); this.detachType(); const q=this.qs[this.idx], cx=this.cx; let y=this.PT+96; this.locked=false; this.typed="";
      this.setProg("Q "+(this.idx+1)+" / "+this.qs.length);
      this.content.add(this.add.text(cx,y,"✍️  Écris ta réponse",{fontFamily:FONT_BODY,fontSize:"12px",color:this.v.accent,fontStyle:"bold"}).setOrigin(0.5)); y+=24;
      const qt=this.add.text(cx,y,q.text,{fontFamily:FONT_TITLE,fontSize:"17px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0); this.content.add(qt); y+=qt.height+16;
      // champ de saisie dessiné
      const fw=Math.min(this.PW-60,380), fh=46; const fg=this.add.graphics(); this.content.add(fg);
      const drawField=(stroke)=>{ fg.clear(); fg.fillStyle(0xffffff,1); fg.fillRoundedRect(cx-fw/2,y,fw,fh,12); fg.lineStyle(2.5,stroke,1); fg.strokeRoundedRect(cx-fw/2,y,fw,fh,12); };
      drawField(hx(this.v.accent)); this._drawField=drawField; this._fieldY=y; this._fieldW=fw; this._fieldH=fh;
      this.typedTxt=this.add.text(cx-fw/2+14,y+fh/2,"",{fontFamily:FONT_BODY,fontSize:"18px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0,0.5); this.content.add(this.typedTxt);
      this._caretOn=true; this._renderTyped();
      this._caretEv=this.time.addEvent({ delay:480, loop:true, callback:()=>{ this._caretOn=!this._caretOn; this._renderTyped(); } });
      y+=fh+14;
      const valider=this.makeBtn(cx,y+18,180,42,"✓  Valider",hx(this.v.accent),"#ffffff",()=>this.checkType(),"15px"); this.content.add(valider); y+=46;
      this.typeFeedback=this.add.text(cx,y+6,"",{fontFamily:FONT_BODY,fontSize:"13px",color:"#464555",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0); this.content.add(this.typeFeedback); y+=44;
      // secours tactile : choix
      this.content.add(this.add.text(cx,y,"— ou choisis (sur tablette) —",{fontFamily:FONT_BODY,fontSize:"11px",color:"#767586"}).setOrigin(0.5)); y+=20;
      const chipW=Math.min((this.PW-60)/2,210);
      q.options.forEach((opt,i)=>{ const colx=cx+(i%2===0?-(chipW/2+6):(chipW/2+6)); const rowy=y+Math.floor(i/2)*44+18;
        const el=this.makeOption(colx,rowy,chipW,38,opt,()=>this.commitAnswer(i,el)); this.content.add(el); });
      // clavier
      this._typeH=(e)=>{ if(this.view!=="type"||this.locked) return; const k=e.key;
        if(k==="Backspace"){ this.typed=this.typed.slice(0,-1); SFX.type(); }
        else if(k==="Enter"){ this.checkType(); return; }
        else if(k.length===1 && this.typed.length<26 && /[\p{L}\p{N} ,.'\/-]/u.test(k)){ this.typed+=k; SFX.type(); }
        else return; this._renderTyped(); };
      this.input.keyboard.on("keydown", this._typeH);
    }
    _renderTyped(){ if(!this.typedTxt) return; this.typedTxt.setText(this.typed + (this._caretOn && !this.locked ? "|" : "")); }
    checkType(){ if(this.locked) return; const q=this.qs[this.idx]; if(normalize(this.typed)===""){ this.typeFeedback.setColor("#b9651f").setText("Écris ta réponse (ou choisis ci-dessous)."); return; }
      const ok = normalize(this.typed)===normalize(q.options[q.answer]); this.commitResult(ok, q); }
    commitAnswer(i,el){ if(this.locked) return; const q=this.qs[this.idx]; const QC=root.QC;
      el.setFill(i===q.answer?0xc8f5d8:0xffd9de, i===q.answer?QC.green:QC.error); this.commitResult(i===q.answer, q); }
    commitResult(ok, q){ if(this.locked) return; this.locked=true; this.detachType();
      if(this._drawField) this._drawField(ok?root.QC.green:root.QC.error); this._renderTyped();
      if(ok){ this.correct++; SFX.good(); this.spark.emitParticleAt(this.cx,this._fieldY+this._fieldH/2,18); this.cameras.main.flash(150,39,174,96); this.typeFeedback.setColor("#1f7a3a").setText("✅ Bonne réponse ! "+(q.explain||"")); }
      else { SFX.bad(); this.cameras.main.shake(160,0.006); this.typeFeedback.setColor("#b00").setText("❌ La bonne réponse : « "+q.options[q.answer]+" ». "+(q.explain||"")); }
      this.time.delayedCall(1900,()=>{ this.idx++; if(this.idx<this.qs.length) this.renderType(); else this.finish(this.correct,this.qs.length); });
    }

    /* ---------- Kinesthésique : ranger ---------- */
    startOrder(data){ const QC=root.QC; this._orderData=data; this.view="order"; this.content.removeAll(true); this.checked=false; this.setProg("Glisser-déposer"); const cx=this.cx;
      this.content.add(this.add.text(cx,this.PT+92,data.instruction,{fontFamily:FONT_TITLE,fontSize:"16px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0));
      this.orderRef=data.items.slice().sort((a,b)=>a.value-b.value);
      this.tlStartY=this.PT+142; this.tlSpacing=46; this.tlW=Math.min(this.PW-44,460);
      let order=Phaser.Utils.Array.Shuffle(data.items.slice()); if(order.every((o,i)=>o.value===this.orderRef[i].value)) order.reverse();
      this.cards=[];
      order.forEach((item,i)=>{ const c=this.add.container(cx,this.tlStartY+i*this.tlSpacing);
        const g=this.add.graphics(); const draw=(fill,stroke)=>{ g.clear(); g.fillStyle(fill,1); g.fillRoundedRect(-this.tlW/2,-18,this.tlW,36,12); g.lineStyle(2,stroke,1); g.strokeRoundedRect(-this.tlW/2,-18,this.tlW,36,12); };
        draw(QC.surfaceContainer,QC.outlineVariant); c.draw=draw;
        const lbl=this.add.text(-this.tlW/2+44,0,item.display,{fontFamily:FONT_TITLE,fontSize:"18px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0,0.5);
        const grip=this.add.text(this.tlW/2-22,0,"⠿",{fontSize:"18px",color:"#767586"}).setOrigin(0.5);
        const num=this.add.text(-this.tlW/2+18,0,"",{fontFamily:FONT_BODY,fontSize:"12px",color:"#464555",fontStyle:"bold"}).setOrigin(0.5);
        c.add([g,lbl,grip,num]); c.item=item; c.numTxt=num;
        c.setSize(this.tlW,36).setInteractive(HIT(new Phaser.Geom.Rectangle(-this.tlW/2,-18,this.tlW,36)));
        this.input.setDraggable(c); this.content.add(c); this.cards.push(c); });
      this.input.off("dragstart"); this.input.off("drag"); this.input.off("dragend");
      this.input.on("dragstart",(p,obj)=>{ if(!obj.draw) return; obj.setDepth(50); obj.draw(QC.primaryFixed,QC.primary); SFX.blip(); });
      this.input.on("drag",(p,obj,dx,dy)=>{ if(!obj.draw) return; obj.y=Phaser.Math.Clamp(dy,this.tlStartY-12,this.tlStartY+(this.cards.length-1)*this.tlSpacing+12);
        const target=Phaser.Math.Clamp(Math.round((obj.y-this.tlStartY)/this.tlSpacing),0,this.cards.length-1); const cur=this.cards.indexOf(obj);
        if(target!==cur){ this.cards.splice(cur,1); this.cards.splice(target,0,obj); this.layoutCards(obj); } });
      this.input.on("dragend",(p,obj)=>{ if(!obj.draw) return; obj.setDepth(2); obj.draw(QC.surfaceContainer,QC.outlineVariant); this.layoutCards(null); });
      this.tlFeedback=this.add.text(cx,this.tlStartY+this.cards.length*this.tlSpacing+4,"",{fontFamily:FONT_BODY,fontSize:"13px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:this.PW-40}}).setOrigin(0.5,0); this.content.add(this.tlFeedback);
      const cb=this.makeBtn(cx,this.tlStartY+this.cards.length*this.tlSpacing+36,200,42,"✓  VÉRIFIER",hx(this.v.accent),"#ffffff",()=>this.checkOrder(),"15px"); this.content.add(cb);
    }
    layoutCards(except){ this.cards.forEach((c,i)=>{ if(c===except) return; this.tweens.add({targets:c,y:this.tlStartY+i*this.tlSpacing,duration:120}); }); }
    checkOrder(){ const QC=root.QC; if(this.checked) return; this.checked=true; let correct=0;
      this.cards.forEach((c,i)=>{ const ok=(c.item.value===this.orderRef[i].value); if(ok) correct++; c.draw&&c.draw(ok?0xc8f5d8:0xffd9de, ok?QC.green:QC.error); c.numTxt.setText(String(i+1)); c.disableInteractive(); });
      const all=correct===this.cards.length; this.tlFeedback.setText(all?"Parfait, tout est dans l'ordre croissant !":correct+" / "+this.cards.length+" bien placées.");
      if(all){ SFX.good(); this.cameras.main.flash(150,39,174,96); } else { SFX.bad(); this.cameras.main.shake(160,0.005); }
      this.time.delayedCall(2000,()=>this.finish(correct,this.cards.length));
    }

    /* ---------- résultat ---------- */
    finish(correct,total){ this._res={correct,total}; this.view="result"; this.showResult();
      const v=this.v, earned=Math.round(correct/total*v.maxXP);
      if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onFinish) root.OdyssiaEngine._cfg.onFinish({ subject:this.subject, mode:this.mode, correct, total, earnedXp:earned, maxXp:v.maxXP });
    }
    showResult(){ const QC=root.QC; this.detachType(); this.content.removeAll(true); this.setProg(""); const cx=this.cx; const {correct,total}=this._res; const v=this.v, earned=Math.round(correct/total*v.maxXP);
      const star=correct===total?"🌟":(correct>=Math.ceil(total/2)?"✨":"📖"); let y=this.PT+this.PH*0.22;
      this.spark.emitParticleAt(cx,y+10,24);
      this.content.add(this.add.text(cx,y,star,{fontSize:"56px"}).setOrigin(0.5)); y+=56;
      this.content.add(this.add.text(cx,y,"Checkpoint réussi !",{fontFamily:FONT_TITLE,fontSize:"22px",color:v.accent,fontStyle:"bold"}).setOrigin(0.5)); y+=34;
      this.content.add(this.add.text(cx,y,"Bonnes réponses : "+correct+" / "+total,{fontFamily:FONT_BODY,fontSize:"16px",color:"#1b1b23"}).setOrigin(0.5)); y+=34;
      this.content.add(this.add.text(cx,y,"+"+earned+" XP",{fontFamily:FONT_TITLE,fontSize:"28px",color:"#27ae60",fontStyle:"bold"}).setOrigin(0.5)); y+=54;
      const retry=this.makeBtn(cx-90,y,160,44,"↻  Rejouer",QC.surfaceContainer,"#1b1b23",()=>this.scene.restart({subject:this.subject,mode:this.mode}),"15px"); this.content.add(retry);
      const out=this.makeBtn(cx+90,y,160,44,"Continuer",hx(v.accent),"#ffffff",()=>this.close(),"15px"); this.content.add(out);
    }
    close(){ if(window.speechSynthesis) window.speechSynthesis.cancel(); this.scene.stop(); if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onClose) root.OdyssiaEngine._cfg.onClose(); }
  }

  root.OdyssiaEngine = {
    _game:null, _cfg:null, _booted:false, _quests:{},
    init(cfg){ this._cfg=cfg||{}; this._parent=(cfg&&cfg.parent)||"engine-canvas"; },
    _ensureGame(){ if(this._game) return this._game;
      this._game=new Phaser.Game({
        type:Phaser.AUTO, parent:this._parent, transparent:true, roundPixels:false, render:{ antialias:true, pixelArt:false, roundPixels:false },
        scale:{ mode:Phaser.Scale.RESIZE, width:"100%", height:"100%" },
        scene:[ BootScene, MiniGameScene ].concat(Object.keys(this._quests).map(k=>this._quests[k].SceneClass)),
      });
      this._game.events.once("ready",()=>{ this._booted=true; try{ this._game.scale.refresh(); }catch(e){} });
      return this._game;
    },
    launch(subject, mode){ this._ensureGame(); if(!this._game) return; SFX.resume(); SFX.enter();
      const start=()=>{ const sm=this._game.scene; if(sm.isActive("MiniGame")) sm.stop("MiniGame"); sm.start("MiniGame",{subject,mode}); };
      if(this._booted) start(); else this._game.events.once("ready",start);
    },
    registerQuest(id, sceneKey, SceneClass, content){ this._quests[id]={ sceneKey, SceneClass, content };
      if(this._game){ try{ if(!this._game.scene.getScene(sceneKey)) this._game.scene.add(sceneKey, SceneClass); }catch(e){} } },
    launchQuest(id){ const q=this._quests[id]; if(!q) return; this._ensureGame(); if(!this._game) return; SFX.resume(); SFX.enter();
      const start=()=>{ const sm=this._game.scene; if(sm.isActive(q.sceneKey)) sm.stop(q.sceneKey); sm.start(q.sceneKey,{id, content:q.content}); };
      if(this._booted) start(); else this._game.events.once("ready",start); },
    quit(){ if(!this._game) return; try{ this._game.scene.getScenes(true).forEach(sc=>{ const k=sc.scene.key; if(k!=="Boot") this._game.scene.stop(k); }); }catch(e){} if(this._cfg && this._cfg.onClose) this._cfg.onClose(); },
    setMuted(m){ SFX.setMuted(m); },
  };
})(window);
