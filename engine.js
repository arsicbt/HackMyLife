/* ============================================================
   engine.js — OdyssIA · MOTEUR DE MINI-JEUX (Phaser 3.90)
   Dépend de : Phaser (global), window.ODYSSIA_CONTENT, window.VARK, window.QC
   N'a AUCUNE connaissance du profil / XP / UI : il joue une épreuve
   et renvoie le résultat via des callbacks (onFinish / onClose).

   API publique :
     OdyssiaEngine.init({ parent, onReady, onFinish, onClose })
     OdyssiaEngine.launch(subject, mode)
   Callbacks :
     onFinish({ subject, mode, correct, total, earnedXp, maxXp })
     onClose()   // l'utilisateur quitte l'épreuve → l'UI masque le moteur
   ============================================================ */
(function (root) {
  "use strict";

  const GAME_W = 480, GAME_H = 520;
  const FONT_TITLE = '"Bricolage Grotesque", sans-serif';
  const FONT_BODY  = '"Atkinson Hyperlegible", sans-serif';
  const hx = h => parseInt(h.replace('#',''),16);
  const dk = (c,a)=> (root.QCOLOR ? root.QCOLOR.darken(c,a) : c);

  /* ---- Audio (Web Audio, 0 asset) ---- */
  const SFX = (function(){
    let ctx=null, muted=false;
    function AC(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return ctx; }
    function note(f,s,d,t,v){ const c=AC(); if(!c||muted) return; const o=c.createOscillator(),g=c.createGain(); o.type=t||"square"; o.frequency.value=f; o.connect(g); g.connect(c.destination); const tt=c.currentTime+s; g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(v||0.12,tt+0.01); g.gain.exponentialRampToValueAtTime(0.0001,tt+d); o.start(tt); o.stop(tt+d+0.03); }
    return {
      resume(){ const c=AC(); if(c&&c.state==="suspended") c.resume(); },
      setMuted(m){ muted=m; },
      click(){ note(520,0,0.05,"square",0.06); }, blip(){ note(380,0,0.04,"square",0.05); },
      good(){ note(660,0,0.09,"square",0.11); note(990,0.09,0.12,"square",0.11); },
      bad(){ note(196,0,0.16,"sawtooth",0.10); note(147,0.13,0.2,"sawtooth",0.08); },
      enter(){ note(523,0,0.08,"triangle",0.1); note(784,0.08,0.12,"triangle",0.1); },
    };
  })();

  function speak(text){ if(!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang="fr-FR"; u.rate=.95;
    const fr=window.speechSynthesis.getVoices().find(v=>/fr/i.test(v.lang)); if(fr) u.voice=fr; window.speechSynthesis.speak(u); }
  if("speechSynthesis" in window){ try{ window.speechSynthesis.getVoices(); }catch(e){} }

  /* ---- Boot : textures de particules ---- */
  class BootScene extends Phaser.Scene {
    constructor(){ super("Boot"); }
    create(){
      const r=(key,size,inner,outer,r0,r1)=>{ const t=this.textures.createCanvas(key,size,size); const c=t.getContext();
        const grd=c.createRadialGradient(size/2,size/2,r0,size/2,size/2,r1); grd.addColorStop(0,inner); grd.addColorStop(1,outer); c.fillStyle=grd; c.fillRect(0,0,size,size); t.refresh(); };
      r("spark",12,"rgba(255,255,255,1)","rgba(255,255,255,0)",0,6);
      r("soft",16,"rgba(255,255,255,1)","rgba(255,255,255,0)",0,8);
      if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onReady) root.OdyssiaEngine._cfg.onReady();
    }
  }

  /* ---- MiniGame : les 4 modes VARK pour le contenu Maths ---- */
  class MiniGameScene extends Phaser.Scene {
    constructor(){ super("MiniGame"); }
    init(data){ this.subject=data.subject; this.mode=data.mode; this.v=root.VARK[this.mode]; this.checked=false; }
    create(){
      const W=GAME_W,H=GAME_H, QC=root.QC;
      this.PX=16; this.PW=W-32; this.PT=24; this.PB=H-24; const ph=this.PB-this.PT;
      const bg=this.add.graphics();
      bg.fillStyle(0x000000,0.12); bg.fillRoundedRect(this.PX+5,this.PT+8,this.PW,ph,22);
      bg.fillStyle(QC.surface,1); bg.fillRoundedRect(this.PX,this.PT,this.PW,ph,22);
      bg.lineStyle(2,QC.outlineVariant,1); bg.strokeRoundedRect(this.PX,this.PT,this.PW,ph,22);
      bg.fillStyle(hx(this.v.accent),1); bg.fillRoundedRect(this.PX,this.PT,this.PW,8,{tl:22,tr:22,bl:0,br:0});
      this.add.text(this.PX+18,this.PT+22,this.v.letter+" · "+this.v.label,{fontFamily:FONT_BODY,fontSize:"12px",color:this.v.accent,fontStyle:"bold"}).setOrigin(0,0);
      this.add.text(this.PX+18,this.PT+38,this.v.title,{fontFamily:FONT_TITLE,fontSize:"20px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0,0);
      this.progress=this.add.text(this.PX+this.PW-46,this.PT+42,"",{fontFamily:FONT_BODY,fontSize:"12px",color:"#464555"}).setOrigin(1,0);
      this.makeBtn(this.PX+this.PW-24,this.PT+24,28,28,"✕",QC.surfaceContainer,"#1b1b23",()=>this.close(),"16px");
      this.spark=this.add.particles(0,0,"spark",{ lifespan:600, speed:{min:50,max:160}, scale:{start:0.9,end:0}, alpha:{start:1,end:0}, gravityY:240, tint:[0xfdd404,0x27ae60,0xffffff], quantity:1, maxParticles:80, emitting:false }).setDepth(100);
      this.content=this.add.container(0,0);
      const data=root.ODYSSIA_CONTENT.maths;
      if(this.mode==="visuel") this.startMCQ(data.visuel,{schema:true});
      else if(this.mode==="auditif") this.startMCQ(data.auditif,{audio:true});
      else if(this.mode==="lire") this.startMCQ(data.lire,{isText:true});
      else if(this.mode==="kinesthesique") this.startOrder(data.kinesthesique);
    }
    clearContent(){ this.content.removeAll(true); }
    makeBtn(x,y,w,h,label,bg,fg,cb,fs){
      const c=this.add.container(x,y); const g=this.add.graphics(); const r=Math.min(14,h/2);
      const draw=(fill)=>{ g.clear(); g.fillStyle(fill,1); g.fillRoundedRect(-w/2,-h/2,w,h,r); g.lineStyle(2,dk(fill,12),1); g.strokeRoundedRect(-w/2,-h/2,w,h,r); };
      draw(bg);
      const t=this.add.text(0,0,label,{fontFamily:FONT_TITLE,fontSize:(fs||"15px"),color:fg,fontStyle:"bold"}).setOrigin(0.5);
      c.add([g,t]); c.txt=t;
      c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h), Phaser.Geom.Rectangle.Contains, {useHandCursor:true});
      c.on("pointerover",()=>draw(dk(bg,5))); c.on("pointerout",()=>draw(bg));
      c.on("pointerdown",()=>{ SFX.click(); const oy=c.y; c.y=oy+2; this.time.delayedCall(90,()=>{ c.y=oy; }); cb(c,t); });
      return c;
    }
    drawSchema(type,data,cx,topY){
      const g=this.add.graphics(); this.content.add(g); const acc=hx(this.v.accent), QC=root.QC;
      if(type==="fraction"){ const bw=200,bh=46,bx=cx-bw/2,by=topY; const seg=bw/data.den;
        for(let i=0;i<data.den;i++){ g.fillStyle(i<data.num?acc:0xffffff,1); g.fillRect(bx+i*seg,by,seg,bh); g.lineStyle(2,QC.onSurface,0.7); g.strokeRect(bx+i*seg,by,seg,bh); }
        return bh+10; }
      if(type==="shape"){ const rw=data.kind==="carre"?96:140, rh=data.kind==="carre"?96:64, rx=cx-rw/2, ry=topY;
        g.fillStyle(acc,0.18); g.fillRect(rx,ry,rw,rh); g.lineStyle(3,acc,1); g.strokeRect(rx,ry,rw,rh);
        const top=(data.labels&&data.labels.top)||"", side=(data.labels&&data.labels.side)||"";
        this.content.add(this.add.text(cx,ry-4,top,{fontFamily:FONT_BODY,fontSize:"13px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0.5,1));
        this.content.add(this.add.text(rx-6,ry+rh/2,side,{fontFamily:FONT_BODY,fontSize:"13px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(1,0.5));
        return rh+16; }
      if(type==="angle"){ const vx=cx-60, vy=topY+70, len=120, rad=data.degrees*Math.PI/180;
        g.lineStyle(4,acc,1);
        g.beginPath(); g.moveTo(vx,vy); g.lineTo(vx+len,vy); g.strokePath();
        g.beginPath(); g.moveTo(vx,vy); g.lineTo(vx+Math.cos(-rad)*len, vy+Math.sin(-rad)*len); g.strokePath();
        g.lineStyle(2,QC.onSurfaceVariant,1); g.beginPath(); g.arc(vx,vy,26,0,-rad,true); g.strokePath();
        g.fillStyle(acc,1); g.fillCircle(vx,vy,4); return 86; }
      if(type==="numberline"){ const lw=240, lx=cx-lw/2, ly=topY+30, n=data.max-data.min;
        g.lineStyle(3,QC.onSurface,1); g.beginPath(); g.moveTo(lx,ly); g.lineTo(lx+lw,ly); g.strokePath();
        for(let i=0;i<=n;i++){ const px=lx+(i/n)*lw; g.lineStyle(2,QC.onSurface,1); g.beginPath(); g.moveTo(px,ly-6); g.lineTo(px,ly+6); g.strokePath();
          this.content.add(this.add.text(px,ly+10,String(data.min+i),{fontFamily:FONT_BODY,fontSize:"11px",color:"#464555"}).setOrigin(0.5,0)); }
        const ppx=lx+((data.point-data.min)/n)*lw; g.fillStyle(acc,1); g.fillTriangle(ppx,ly-10,ppx-7,ly-22,ppx+7,ly-22); return 60; }
      return 0;
    }
    startMCQ(qs,opts){ this.qs=qs; this.opt=opts||{}; this.idx=0; this.correct=0; this.locked=false; this.renderQ(); }
    renderQ(){ const QC=root.QC; this.clearContent(); this.locked=false; const q=this.qs[this.idx], cx=GAME_W/2; let y=this.PT+82;
      this.progress.setText("Q "+(this.idx+1)+" / "+this.qs.length);
      if(this.opt.audio){ this.content.add(this.add.text(cx,y,"🔊",{fontSize:"42px"}).setOrigin(0.5)); y+=42;
        const play=this.makeBtn(cx,y+10,180,42,"▶  ÉCOUTER",hx(this.v.accent),"#ffffff",()=>speak(q.speak),"15px"); this.content.add(play); y+=42;
        this.content.add(this.add.text(cx,y,"Tu peux réécouter autant de fois que tu veux",{fontFamily:FONT_BODY,fontSize:"11px",color:"#464555"}).setOrigin(0.5)); y+=22;
        this.time.delayedCall(250,()=>speak(q.speak)); }
      else if(this.opt.schema){ const used=this.drawSchema(q.schemaType,q.schemaData,cx,y); y+=used+12; }
      const prompt=this.opt.isText?q.text:(q.q||"Quelle est la bonne réponse ?");
      const qt=this.add.text(cx,y,prompt,{fontFamily:FONT_TITLE,fontSize:"16px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0);
      this.content.add(qt); y+=qt.height+14; this.optEls=[];
      q.options.forEach((opt,i)=>{ const oh=38, ow=this.PW-44; const el=this.makeOption(cx,y+oh/2,ow,oh,opt,()=>this.choose(i,el)); this.optEls.push(el); y+=oh+8; });
      this.explainText=this.add.text(cx,y+4,"",{fontFamily:FONT_BODY,fontSize:"12.5px",color:"#464555",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0); this.content.add(this.explainText);
    }
    makeOption(x,y,w,h,label,cb){ const QC=root.QC;
      const c=this.add.container(x,y); const g=this.add.graphics();
      const draw=(fill,stroke)=>{ g.clear(); g.fillStyle(fill,1); g.fillRoundedRect(-w/2,-h/2,w,h,12); g.lineStyle(2,stroke,1); g.strokeRoundedRect(-w/2,-h/2,w,h,12); };
      draw(QC.surfaceContainer, QC.outlineVariant);
      const t=this.add.text(-w/2+16,0,label,{fontFamily:FONT_BODY,fontSize:"14px",color:"#1b1b23",wordWrap:{width:w-30}}).setOrigin(0,0.5);
      c.add([g,t]); c.setFill=draw; this.content.add(c);
      c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h), Phaser.Geom.Rectangle.Contains, {useHandCursor:true});
      c.on("pointerover",()=>{ if(!this.locked) draw(QC.primaryFixed, QC.primary); });
      c.on("pointerout",()=>{ if(!this.locked) draw(QC.surfaceContainer, QC.outlineVariant); });
      c.on("pointerdown",()=>{ if(!this.locked) cb(); });
      return c;
    }
    choose(i,el){ const QC=root.QC; if(this.locked) return; this.locked=true; const q=this.qs[this.idx], ans=q.answer;
      if(i===ans){ this.correct++; el.setFill(0xc8f5d8,QC.green); SFX.good(); this.spark.emitParticleAt(el.x,el.y,16); this.cameras.main.flash(150,39,174,96); }
      else { el.setFill(0xffd9de,QC.error); this.optEls[ans].setFill(0xc8f5d8,QC.green); SFX.bad(); this.cameras.main.shake(180,0.006); }
      if(q.explain) this.explainText.setText("💡 "+q.explain);
      if(this.opt.audio && window.speechSynthesis) window.speechSynthesis.cancel();
      this.time.delayedCall(1700,()=>{ this.idx++; if(this.idx<this.qs.length) this.renderQ(); else this.finish(this.correct,this.qs.length); });
    }
    startOrder(data){ const QC=root.QC; this.clearContent(); this.progress.setText("Glisser-déposer"); const cx=GAME_W/2;
      this.content.add(this.add.text(cx,this.PT+78,data.instruction,{fontFamily:FONT_TITLE,fontSize:"15px",color:"#1b1b23",fontStyle:"bold",align:"center",wordWrap:{width:this.PW-50}}).setOrigin(0.5,0));
      this.orderRef=data.items.slice().sort((a,b)=>a.value-b.value);
      this.tlStartY=this.PT+128; this.tlSpacing=46; this.tlW=this.PW-44;
      let order=Phaser.Utils.Array.Shuffle(data.items.slice());
      if(order.every((o,i)=>o.value===this.orderRef[i].value)) order.reverse();
      this.cards=[];
      order.forEach((item,i)=>{ const c=this.add.container(cx,this.tlStartY+i*this.tlSpacing);
        const g=this.add.graphics(); const draw=(fill,stroke)=>{ g.clear(); g.fillStyle(fill,1); g.fillRoundedRect(-this.tlW/2,-18,this.tlW,36,12); g.lineStyle(2,stroke,1); g.strokeRoundedRect(-this.tlW/2,-18,this.tlW,36,12); };
        draw(QC.surfaceContainer,QC.outlineVariant); c.draw=draw;
        const lbl=this.add.text(-this.tlW/2+44,0,item.display,{fontFamily:FONT_TITLE,fontSize:"18px",color:"#1b1b23",fontStyle:"bold"}).setOrigin(0,0.5);
        const grip=this.add.text(this.tlW/2-22,0,"⠿",{fontSize:"18px",color:"#767586"}).setOrigin(0.5);
        const num=this.add.text(-this.tlW/2+18,0,"",{fontFamily:FONT_BODY,fontSize:"12px",color:"#464555",fontStyle:"bold"}).setOrigin(0.5);
        c.add([g,lbl,grip,num]); c.item=item; c.numTxt=num;
        c.setSize(this.tlW,36).setInteractive(new Phaser.Geom.Rectangle(-this.tlW/2,-18,this.tlW,36), Phaser.Geom.Rectangle.Contains, {useHandCursor:true});
        this.input.setDraggable(c); this.content.add(c); this.cards.push(c); });
      this.input.on("dragstart",(p,obj)=>{ obj.setDepth(50); obj.draw&&obj.draw(QC.primaryFixed,QC.primary); SFX.blip(); });
      this.input.on("drag",(p,obj,dx,dy)=>{ obj.y=Phaser.Math.Clamp(dy,this.tlStartY-12,this.tlStartY+(this.cards.length-1)*this.tlSpacing+12);
        const target=Phaser.Math.Clamp(Math.round((obj.y-this.tlStartY)/this.tlSpacing),0,this.cards.length-1); const cur=this.cards.indexOf(obj);
        if(target!==cur){ this.cards.splice(cur,1); this.cards.splice(target,0,obj); this.layoutCards(obj); } });
      this.input.on("dragend",(p,obj)=>{ obj.setDepth(0); obj.draw&&obj.draw(QC.surfaceContainer,QC.outlineVariant); this.layoutCards(null); });
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
    finish(correct,total){ const QC=root.QC; const v=this.v, earned=Math.round(correct/total*v.maxXP);
      if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onFinish)
        root.OdyssiaEngine._cfg.onFinish({ subject:this.subject, mode:this.mode, correct, total, earnedXp:earned, maxXp:v.maxXP });
      this.clearContent(); this.progress.setText(""); const cx=GAME_W/2, star=correct===total?"🌟":(correct>=Math.ceil(total/2)?"✨":"📖");
      this.spark.emitParticleAt(cx,this.PT+120,24);
      this.content.add(this.add.text(cx,this.PT+120,star,{fontSize:"54px"}).setOrigin(0.5));
      this.content.add(this.add.text(cx,this.PT+176,"Checkpoint réussi !",{fontFamily:FONT_TITLE,fontSize:"20px",color:v.accent,fontStyle:"bold"}).setOrigin(0.5));
      this.content.add(this.add.text(cx,this.PT+206,"Bonnes réponses : "+correct+" / "+total,{fontFamily:FONT_BODY,fontSize:"15px",color:"#1b1b23"}).setOrigin(0.5));
      this.content.add(this.add.text(cx,this.PT+244,"+"+earned+" XP",{fontFamily:FONT_TITLE,fontSize:"26px",color:"#27ae60",fontStyle:"bold"}).setOrigin(0.5));
      const retry=this.makeBtn(cx-86,this.PT+316,150,42,"↻  Rejouer",QC.surfaceContainer,"#1b1b23",()=>this.scene.restart({subject:this.subject,mode:this.mode}),"14px"); this.content.add(retry);
      const out=this.makeBtn(cx+86,this.PT+316,150,42,"Retour au village",hx(v.accent),"#ffffff",()=>this.close(),"14px"); this.content.add(out);
    }
    close(){ if(window.speechSynthesis) window.speechSynthesis.cancel(); this.scene.stop();
      if(root.OdyssiaEngine._cfg && root.OdyssiaEngine._cfg.onClose) root.OdyssiaEngine._cfg.onClose(); }
  }

  /* ---- Façade publique ---- */
  root.OdyssiaEngine = {
    _game:null, _cfg:null, _booted:false,
    init(cfg){ this._cfg=cfg||{};
      this._game=new Phaser.Game({
        type:Phaser.CANVAS, parent:(cfg&&cfg.parent)||"engine-canvas", transparent:true, pixelArt:true, roundPixels:true,
        scale:{ mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH, width:GAME_W, height:GAME_H },
        scene:[ BootScene, MiniGameScene ],
      });
      this._game.events.once("ready",()=>{ this._booted=true; });
      return this._game;
    },
    launch(subject, mode){ if(!this._game) return; SFX.resume(); SFX.enter();
      const start=()=>{ const sm=this._game.scene; if(sm.isActive("MiniGame")) sm.stop("MiniGame"); sm.start("MiniGame",{subject,mode}); };
      if(this._booted) start(); else this._game.events.once("ready",start);
    },
    setMuted(m){ SFX.setMuted(m); },
  };
})(window);
