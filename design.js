/* ============================================================
   design.js — OdyssIA · DESSIN PROCÉDURAL (aucune dépendance)
   Fonctionne sur tout objet "graphics-like" exposant l'API Phaser.Graphics
   (le moteur passe un vrai Phaser.Graphics ; l'UI passe un adaptateur Canvas2D).
   Expose : window.QC, window.QCOLOR (darken/brighten),
            window.drawSubjectBuilding, window.drawAvatar,
            window.avatarPalette, window.avatarRng
   ============================================================ */
(function (root) {
  "use strict";

  const QC = {
    primary:0x4343d5, primaryContainer:0x5d5fef, primaryFixed:0xe1e0ff,
    gold:0xfdd404, surface:0xfcf8ff, surfaceContainer:0xefecf9, surfaceContainerHigh:0xe9e6f3,
    onSurface:0x1b1b23, onSurfaceVariant:0x464555, outline:0x767586, outlineVariant:0xc7c4d7,
    green:0x27ae60, error:0xe71d36,
    maths:0x9b51e0, histgeo:0xf2994a, svt:0x27ae60, pc:0x00b4d8, francais:0x4361ee, langues:0xef476f, techno:0x4a4e69,
    varkVisual:0xff9f1c, varkAuditory:0x2ec4b6, varkRead:0xe71d36, varkKinaesthetic:0x4343d5
  };

  /* ---- Couleur : darken/brighten en pur JS (approche HSL, ~ Phaser) ---- */
  function _adjustL(c, deltaPct){
    let r=((c>>16)&255)/255, g=((c>>8)&255)/255, b=(c&255)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b); let h,s,l=(max+min)/2;
    if(max===min){ h=s=0; }
    else { const d=max-min; s=l>0.5? d/(2-max-min) : d/(max+min);
      if(max===r) h=(g-b)/d+(g<b?6:0); else if(max===g) h=(b-r)/d+2; else h=(r-g)/d+4; h/=6; }
    l=Math.max(0,Math.min(1, l+deltaPct/100));
    function h2(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
    let r2,g2,b2;
    if(s===0){ r2=g2=b2=l; }
    else { const q=l<0.5? l*(1+s) : l+s-l*s, p=2*l-q; r2=h2(p,q,h+1/3); g2=h2(p,q,h); b2=h2(p,q,h-1/3); }
    return (Math.round(r2*255)<<16)|(Math.round(g2*255)<<8)|Math.round(b2*255);
  }
  function darken(c, amount){ return _adjustL(c, -amount); }
  function brighten(c, amount){ return _adjustL(c, amount); }
  const _darken = darken, _brighten = brighten;

  function _outline(g){ g.lineStyle(2, QC.onSurface, 0.5); }
  function _groundShadow(g, cx, y, rw, rh){ g.fillStyle(0x000000, 0.18); g.fillEllipse(cx, y, rw, rh); }
  function _door(g, bx, by, bw, bh, wallDark){
    g.fillStyle(wallDark, 1); g.fillRoundedRect(bx-1, by-1, bw+2, bh+2, 3);
    g.fillStyle(0x1a1020, 1); g.fillRoundedRect(bx, by, bw, bh, { tl: bw/2, tr: bw/2, bl:0, br:0 });
  }

  function _drawMaths(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-4,w*0.8,14);
    const tw=Math.round(w*0.35), tx=cx-tw/2;
    g.fillStyle(c.wall,1); g.fillRoundedRect(tx,h*0.3,tw,h*0.7,4);
    g.fillStyle(c.wallDark,1); g.fillRoundedRect(tx-6,h*0.7,tw+12,h*0.3,3);
    g.fillStyle(c.roof,1); g.fillCircle(cx,h*0.3,tw*0.7);
    g.fillStyle(c.roofDark,1); g.fillTriangle(cx,-20,cx-8,h*0.3,cx+8,h*0.3);
    g.fillStyle(QC.gold,1); g.fillCircle(cx,-26,6);
    const sr=10; for(let i=0;i<4;i++){ const a=(i/4)*Math.PI*2;
      g.fillTriangle(cx+Math.cos(a)*sr,-26+Math.sin(a)*sr, cx+Math.cos(a+0.3)*4,-26+Math.sin(a+0.3)*4, cx+Math.cos(a-0.3)*4,-26+Math.sin(a-0.3)*4); }
    g.fillStyle(QC.primaryFixed,1); g.fillCircle(cx,h*0.48,7); g.fillStyle(c.accent,1); g.fillCircle(cx,h*0.48,4);
    const dw=Math.round(tw*0.55), dh=Math.round(h*0.26); _door(g,cx-dw/2,h-dh,dw,dh,c.wallDark);
    _outline(g); g.strokeRoundedRect(tx,h*0.3,tw,h*0.7,4); g.strokeRoundedRect(tx-6,h*0.7,tw+12,h*0.3,3);
  }
  function _drawHistgeo(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-3,w*0.9,12);
    const bw=Math.round(w*0.6), bh=Math.round(h*0.65), bx=cx-bw/2, by=h-bh;
    g.fillStyle(c.wall,1); g.fillRect(bx,by,bw,bh);
    const tw=Math.round(w*0.22), th=Math.round(h*0.78);
    g.fillStyle(c.wallDark,1); g.fillRect(bx-tw+4,h-th,tw,th); g.fillRect(bx+bw-4,h-th,tw,th);
    g.fillStyle(c.roof,1);
    g.fillTriangle(bx-tw+4+tw/2,h-th-20, bx-tw+4,h-th, bx-tw+4+tw,h-th);
    g.fillTriangle(bx+bw-4+tw/2,h-th-20, bx+bw-4,h-th, bx+bw-4+tw,h-th);
    const mW=8,mH=8,mc=4; g.fillStyle(c.wall,1);
    for(let i=0;i<mc;i++){ const mx=bx+4+i*((bw-8)/(mc-1))-mW/2; g.fillRect(mx,by-mH,mW,mH); }
    for(let i=0;i<3;i++){ g.fillRect(bx-tw+4+2+i*(tw/3),h-th-mH,mW-1,mH); g.fillRect(bx+bw-4+2+i*(tw/3),h-th-mH,mW-1,mH); }
    g.fillStyle(QC.primaryFixed,1); const fw=14,fh=22; g.fillRoundedRect(cx-fw/2,by+8,fw,fh,{tl:fw/2,tr:fw/2,bl:2,br:2});
    const dw=Math.round(bw*0.38), dh=Math.round(h*0.3); _door(g,cx-dw/2,h-dh,dw,dh,c.wallDark);
    _outline(g); g.strokeRect(bx,by,bw,bh); g.strokeRect(bx-tw+4,h-th,tw,th); g.strokeRect(bx+bw-4,h-th,tw,th);
  }
  function _drawSvt(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-2,w*0.85,12);
    g.fillStyle(_darken(c.accent,5),1); g.fillRoundedRect(6,h-10,w-12,10,3);
    const trW=Math.round(w*0.2), trH=Math.round(h*0.55), trX=cx-trW/2;
    g.fillStyle(_darken(c.wall,20),1); g.fillRoundedRect(trX,h-10-trH,trW,trH,3);
    g.lineStyle(1,_darken(c.wall,35),0.5);
    for(let i=0;i<3;i++){ const sy=h-10-trH+10+i*14; g.beginPath(); g.moveTo(trX+3,sy); g.lineTo(trX+trW-3,sy+5); g.strokePath(); }
    const layers=[{cy:h-10-trH-8,rw:w*0.75,rh:34,col:_brighten(c.accent,15)},{cy:h-10-trH-24,rw:w*0.62,rh:30,col:c.accent},{cy:h-10-trH-40,rw:w*0.44,rh:24,col:_darken(c.accent,10)}];
    for(const l of layers){ g.fillStyle(l.col,1); g.fillEllipse(cx,l.cy,l.rw,l.rh); }
    g.fillStyle(QC.gold,1); const fy=h-10-trH-26; g.fillCircle(cx-12,fy,4); g.fillCircle(cx,fy-4,4); g.fillCircle(cx+12,fy,4);
    _outline(g); g.strokeRoundedRect(trX,h-10-trH,trW,trH,3);
    for(const l of layers){ g.lineStyle(1.5,QC.onSurface,0.35); g.strokeEllipse(cx,l.cy,l.rw,l.rh); }
  }
  function _drawPc(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-3,w*0.88,12);
    const bw=Math.round(w*0.85), bh=Math.round(h*0.6), bx=cx-bw/2, by=h-bh;
    g.fillStyle(c.wall,1); g.fillRoundedRect(bx,by,bw,bh,4);
    g.fillStyle(c.roof,1); g.fillRoundedRect(bx-4,by-10,bw+8,14,{tl:4,tr:4,bl:0,br:0});
    g.fillStyle(c.accent,0.18); g.fillCircle(cx,by-8,28);
    const colW=12,colH=20,colX=cx-colW/2,colY=by-8-colH-18;
    g.fillStyle(QC.primaryFixed,0.9); g.fillRoundedRect(colX,colY,colW,colH,3);
    const fb=36,fh2=22,fy=colY+colH; g.fillStyle(QC.primaryFixed,0.85); g.fillTriangle(cx-fb/2,fy+fh2,cx+fb/2,fy+fh2,cx,fy-2);
    g.fillStyle(c.accent,0.75); g.fillTriangle(cx-fb/2+4,fy+fh2,cx+fb/2-4,fy+fh2,cx,fy+fh2-10);
    g.fillStyle(c.roofDark,1); g.fillRoundedRect(colX-2,colY-6,colW+4,8,2);
    g.fillStyle(0xffffff,0.6); g.fillCircle(cx-6,fy+fh2-6,3); g.fillCircle(cx+4,fy+fh2-10,2);
    g.fillStyle(QC.primaryFixed,0.8); g.fillRoundedRect(bx+8,by+10,16,14,2); g.fillRoundedRect(bx+bw-24,by+10,16,14,2);
    const dw=Math.round(bw*0.3), dh=Math.round(h*0.3); _door(g,cx-dw/2,h-dh,dw,dh,c.wallDark);
    _outline(g); g.strokeRoundedRect(bx,by,bw,bh,4);
  }
  function _drawFrancais(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-3,w*0.92,12);
    g.fillStyle(c.wallDark,1); g.fillRect(2,h-8,w-4,8); g.fillRect(6,h-16,w-12,8);
    const bw=Math.round(w*0.82), bh=Math.round(h*0.6), bx=cx-bw/2, by=h-16-bh;
    g.fillStyle(c.wall,1); g.fillRect(bx,by,bw,bh);
    g.fillStyle(c.roof,1); g.fillTriangle(cx,by-22,bx-4,by,bx+bw+4,by);
    g.fillStyle(c.roofDark,1); g.fillRect(bx-4,by-2,bw+8,4);
    const colW=9,colH=bh, cps=[bx+8,bx+bw/3,bx+bw*2/3-colW,bx+bw-8-colW];
    for(const cpx of cps){ g.fillStyle(_brighten(c.wall,20),1); g.fillRoundedRect(cpx,by,colW,colH,2);
      g.fillStyle(c.wallDark,1); g.fillRect(cpx-2,by,colW+4,5); g.fillRect(cpx-2,by+colH-5,colW+4,5); }
    const bookY=by-15; g.fillStyle(QC.surface,1);
    g.fillTriangle(cx-12,bookY-3,cx,bookY-8,cx,bookY+3); g.fillTriangle(cx-12,bookY-3,cx-12,bookY+5,cx,bookY+3);
    g.fillTriangle(cx+12,bookY-3,cx,bookY-8,cx,bookY+3); g.fillTriangle(cx+12,bookY-3,cx+12,bookY+5,cx,bookY+3);
    g.fillStyle(c.accent,1); g.fillRect(cx-1,bookY-8,2,11);
    const dw=Math.round(bw*0.32), dh=Math.round(h*0.32); _door(g,cx-dw/2,h-16-dh,dw,dh,c.wallDark);
    _outline(g); g.strokeRect(bx,by,bw,bh);
  }
  function _drawLangues(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-3,w*0.88,12);
    const bw=Math.round(w*0.78), bh=Math.round(h*0.58), bx=cx-bw/2, by=h-bh;
    g.fillStyle(c.wall,1); g.fillRoundedRect(bx,by,bw,bh,3);
    g.fillStyle(c.roof,1); g.fillTriangle(cx,by-28,bx-8,by,bx+bw+8,by);
    g.fillStyle(c.roofDark,1); g.fillRect(bx-10,by-4,bw+20,6);
    g.lineStyle(3,_darken(c.wall,30),0.9); g.strokeRect(bx+4,by+4,bw-8,bh-4);
    g.beginPath(); g.moveTo(bx+4,by+4); g.lineTo(bx+bw/2,by+bh/2); g.strokePath();
    g.beginPath(); g.moveTo(bx+bw-4,by+4); g.lineTo(bx+bw/2,by+bh/2); g.strokePath();
    g.beginPath(); g.moveTo(bx+4,by+bh/2); g.lineTo(bx+bw-4,by+bh/2); g.strokePath();
    g.fillStyle(QC.primaryFixed,0.85); g.fillRoundedRect(bx+8,by+10,18,14,2);
    g.lineStyle(1,c.wallDark,0.6); g.beginPath(); g.moveTo(bx+17,by+10); g.lineTo(bx+17,by+24); g.strokePath();
    g.beginPath(); g.moveTo(bx+8,by+17); g.lineTo(bx+26,by+17); g.strokePath();
    g.fillStyle(QC.primaryFixed,0.85); g.fillRoundedRect(bx+bw-26,by+10,18,14,2);
    g.lineStyle(1,c.wallDark,0.6); g.beginPath(); g.moveTo(bx+bw-17,by+10); g.lineTo(bx+bw-17,by+24); g.strokePath();
    g.beginPath(); g.moveTo(bx+bw-26,by+17); g.lineTo(bx+bw-8,by+17); g.strokePath();
    const sx=bx+bw-2, sy=by-20; g.lineStyle(2,_darken(c.wall,25),1);
    g.beginPath(); g.moveTo(sx,by-4); g.lineTo(sx,sy); g.lineTo(sx+22,sy); g.strokePath();
    g.fillStyle(c.accent,1); g.fillRoundedRect(sx+2,sy+2,28,16,3); g.fillStyle(QC.surface,0.7); g.fillRoundedRect(sx+5,sy+5,22,10,2);
    const dw=Math.round(bw*0.35), dh=Math.round(h*0.3); _door(g,cx-dw/2,h-dh,dw,dh,c.wallDark);
    _outline(g); g.strokeRoundedRect(bx,by,bw,bh,3);
  }
  function _drawTechno(g,w,h,c){ const cx=w/2; _groundShadow(g,cx,h-3,w*0.92,12);
    const bw=Math.round(w*0.9), bh=Math.round(h*0.62), bx=cx-bw/2, by=h-bh;
    g.fillStyle(c.wall,1); g.fillRect(bx,by,bw,bh);
    const sheds=4, shedW=bw/sheds, shedH=18;
    for(let i=0;i<sheds;i++){ const sx=bx+i*shedW;
      g.fillStyle(c.roof,1); g.fillTriangle(sx,by,sx+shedW,by,sx+shedW,by-shedH);
      g.fillStyle(c.roofDark,1); g.fillRect(sx,by-shedH,4,shedH);
      g.fillStyle(_brighten(c.accent,40),0.7); g.fillRect(sx+4,by-shedH+2,shedW-8,shedH-4); }
    const gx=cx, gy=by+bh*0.42, gr=Math.round(w*0.18), tc=10, tH=5;
    g.fillStyle(c.accent,1);
    for(let i=0;i<tc;i++){ const a=(i/tc)*Math.PI*2; const t1x=gx+Math.cos(a)*gr, t1y=gy+Math.sin(a)*gr, t2x=gx+Math.cos(a)*(gr+tH), t2y=gy+Math.sin(a)*(gr+tH), px=Math.cos(a+Math.PI/2)*3, py=Math.sin(a+Math.PI/2)*3;
      g.fillTriangle(t1x-px,t1y-py,t1x+px,t1y+py,t2x,t2y); }
    g.fillStyle(c.accent,1); g.fillCircle(gx,gy,gr);
    g.fillStyle(c.wallDark,1); g.fillCircle(gx,gy,Math.round(gr*0.45));
    g.fillStyle(c.accentDark,1); g.fillCircle(gx,gy,Math.round(gr*0.2));
    g.lineStyle(1.5,QC.onSurface,0.4); g.strokeCircle(gx,gy,gr);
    const chW=12,chH=22,chX=bx+bw-22; g.fillStyle(c.wallDark,1); g.fillRoundedRect(chX,by-chH,chW,chH,2);
    g.fillStyle(0xcccccc,0.45); g.fillCircle(chX+chW/2,by-chH-8,8); g.fillCircle(chX+chW/2+4,by-chH-16,5);
    const dw=Math.round(bw*0.28), dh=Math.round(h*0.28); _door(g,cx-dw/2,h-dh,dw,dh,c.wallDark);
    _outline(g); g.strokeRect(bx,by,bw,bh);
  }
  function drawSubjectBuilding(g, subjectKey, w, h, c){
    switch(subjectKey){
      case 'maths': _drawMaths(g,w,h,c); break;
      case 'histgeo': _drawHistgeo(g,w,h,c); break;
      case 'svt': _drawSvt(g,w,h,c); break;
      case 'pc': _drawPc(g,w,h,c); break;
      case 'francais': _drawFrancais(g,w,h,c); break;
      case 'langues': _drawLangues(g,w,h,c); break;
      case 'techno': _drawTechno(g,w,h,c); break;
      default: g.fillStyle(c.wall,1); g.fillRoundedRect(8,8,w-16,h-16,4);
    }
  }

  /* ---- Avatar procédural seedé évolutif ---- */
  function avatarRng(seed){ let s=seed>>>0; return function(){ s+=0x6d2b79f5; let z=s; z=Math.imul(z^(z>>>15),z|1); z^=z+Math.imul(z^(z>>>7),z|61); z=(z^(z>>>14))>>>0; return z/0x100000000; }; }
  function avatarPalette(seed){ const rng=avatarRng(seed);
    const skinTones=[0xffdab9,0xf5cba7,0xd4956a,0x8d5524]; const skin=skinTones[Math.floor(rng()*skinTones.length)];
    const hairColors=[0x1a0a00,0x3b1f0a,0x8b5e3c,0xf0c040,0xe8274b,0x4343d5,0x27ae60]; const hair=hairColors[Math.floor(rng()*hairColors.length)];
    const outfitColors=[QC.primary,QC.primaryContainer,QC.gold,QC.maths,QC.histgeo,QC.svt,QC.pc,QC.francais,QC.langues,QC.techno]; const outfit=outfitColors[Math.floor(rng()*outfitColors.length)];
    const eyeColors=[0x3a6baf,0x4a7c59,0x7b4e2d]; const eyes=eyeColors[Math.floor(rng()*eyeColors.length)];
    return { skin, hair, outfit, eyes };
  }
  function drawAvatar(g,seed,level){
    const rng=avatarRng(seed), pal=avatarPalette(seed);
    const cx=32, headR=14, headY=26, bustY=headY+headR;
    if(level>=3){ const hc=(level>=5)?QC.gold:QC.primary; g.fillStyle(hc,0.22); g.fillCircle(cx,headY,headR+10); g.fillStyle(hc,0.12); g.fillCircle(cx,headY,headR+18); }
    if(level>=6){ const sps=[{x:cx-22,y:headY-18},{x:cx+22,y:headY-18},{x:cx-26,y:headY+4},{x:cx+26,y:headY+4},{x:cx-18,y:headY-28},{x:cx+18,y:headY-28}]; g.fillStyle(QC.gold,1); for(const sp of sps){ const sr=4; g.fillTriangle(sp.x,sp.y-sr,sp.x-sr,sp.y,sp.x,sp.y+sr); g.fillTriangle(sp.x,sp.y-sr,sp.x+sr,sp.y,sp.x,sp.y+sr); } }
    const bustW=34,bustH=24,bustX=cx-bustW/2;
    g.fillStyle(_darken(pal.outfit,15),1); g.fillRoundedRect(bustX-3,bustY+2,bustW+6,bustH,{tl:4,tr:4,bl:6,br:6});
    g.fillStyle(pal.outfit,1); g.fillRoundedRect(bustX,bustY+4,bustW,bustH-2,{tl:3,tr:3,bl:6,br:6});
    g.fillStyle(_darken(pal.outfit,25),1); g.fillRoundedRect(bustX+bustW*0.3,bustY+3,bustW*0.4,5,2);
    if(level>=5){ g.fillStyle(QC.gold,1); g.fillRoundedRect(bustX-10,bustY+2,12,8,3); g.fillRoundedRect(bustX+bustW-2,bustY+2,12,8,3); g.lineStyle(1.5,_darken(QC.gold,20),0.8); g.strokeRoundedRect(bustX-10,bustY+2,12,8,3); g.strokeRoundedRect(bustX+bustW-2,bustY+2,12,8,3); }
    if(level>=2){ const bx2=cx+6,by2=bustY+10,br=6; g.fillStyle(QC.gold,1); g.fillTriangle(bx2,by2-br,bx2-br,by2,bx2,by2+br); g.fillTriangle(bx2,by2-br,bx2+br,by2,bx2,by2+br); g.lineStyle(1,_darken(QC.gold,20),0.9); g.strokeTriangle(bx2,by2-br,bx2-br,by2,bx2,by2+br); g.strokeTriangle(bx2,by2-br,bx2+br,by2,bx2,by2+br); }
    g.fillStyle(pal.skin,1); g.fillRect(cx-5,headY+headR-2,10,8);
    g.fillStyle(pal.skin,1); g.fillCircle(cx,headY,headR);
    g.lineStyle(1.5,QC.onSurface,0.4); g.strokeCircle(cx,headY,headR);
    const eoy=headY-1, es=5;
    g.fillStyle(0xffffff,1); g.fillEllipse(cx-es,eoy,7,5); g.fillEllipse(cx+es,eoy,7,5);
    g.fillStyle(pal.eyes,1); g.fillCircle(cx-es,eoy,2.5); g.fillCircle(cx+es,eoy,2.5);
    g.fillStyle(0x111111,1); g.fillCircle(cx-es,eoy,1.2); g.fillCircle(cx+es,eoy,1.2);
    g.fillStyle(0xffffff,0.9); g.fillCircle(cx-es+1,eoy-1,0.8); g.fillCircle(cx+es+1,eoy-1,0.8);
    const bs=Math.floor(rng()*3); g.lineStyle(2,_darken(pal.skin,35),0.85); const by=eoy-4;
    if(bs===0){ g.beginPath(); g.moveTo(cx-es-3,by); g.lineTo(cx-es+3,by); g.strokePath(); g.beginPath(); g.moveTo(cx+es-3,by); g.lineTo(cx+es+3,by); g.strokePath(); }
    else if(bs===1){ g.beginPath(); g.moveTo(cx-es-3,by+1); g.lineTo(cx-es+3,by-1); g.strokePath(); g.beginPath(); g.moveTo(cx+es-3,by-1); g.lineTo(cx+es+3,by+1); g.strokePath(); }
    else { g.beginPath(); g.moveTo(cx-es-3,by+1); g.lineTo(cx-es+3,by-2); g.strokePath(); g.beginPath(); g.moveTo(cx+es-3,by-2); g.lineTo(cx+es+3,by+1); g.strokePath(); }
    const my=headY+7, ms=Math.floor(rng()*2); g.lineStyle(1.5,_darken(pal.skin,30),0.8);
    if(ms===0){ g.beginPath(); g.moveTo(cx-4,my); g.lineTo(cx-1,my+2); g.lineTo(cx+1,my+2); g.lineTo(cx+4,my); g.strokePath(); }
    else { g.beginPath(); g.moveTo(cx-5,my-1); g.lineTo(cx-2,my+2); g.lineTo(cx+2,my+2); g.lineTo(cx+5,my-1); g.strokePath(); }
    g.fillStyle(0xffb3b3,0.4); g.fillEllipse(cx-9,headY+4,8,5); g.fillEllipse(cx+9,headY+4,8,5);
    _drawAvatarHair(g,rng,pal.hair,cx,headY,headR);
    if(level>=4) _drawAvatarHat(g,seed,cx,headY,headR,pal);
    g.lineStyle(1.5,QC.onSurface,0.35); g.strokeRoundedRect(bustX-3,bustY+2,bustW+6,bustH,{tl:4,tr:4,bl:6,br:6});
  }
  function _drawAvatarHair(g,rng,hairColor,cx,headY,headR){
    const hs=Math.floor(rng()*3); g.fillStyle(hairColor,1);
    if(hs===0){ g.fillEllipse(cx,headY-headR*0.3,headR*1.9,headR*1.1); }
    else if(hs===1){ g.fillEllipse(cx,headY-headR*0.3,headR*1.95,headR*1.1); g.fillRoundedRect(cx-headR-4,headY-4,8,14,3); g.fillRoundedRect(cx+headR-4,headY-4,8,14,3); }
    else { const bp=[{dx:-headR+2,dy:-headR+2},{dx:0,dy:-headR-2},{dx:headR-2,dy:-headR+2},{dx:-headR-2,dy:0},{dx:headR+2,dy:0}]; for(const b of bp) g.fillCircle(cx+b.dx,headY+b.dy,6); g.fillEllipse(cx,headY-headR*0.2,headR*1.8,headR*1.0); }
    g.lineStyle(1,_darken(hairColor,15),0.5); g.strokeEllipse(cx,headY-headR*0.3,headR*1.9,headR*1.1);
  }
  function _drawAvatarHat(g,seed,cx,headY,headR,pal){
    const hr=avatarRng(seed+9999), st=Math.floor(hr()*2);
    if(st===0){ g.fillStyle(_darken(pal.outfit,10),1); g.fillRoundedRect(cx-10,headY-headR-14,20,10,2);
      g.fillStyle(_darken(pal.outfit,20),1); g.fillRect(cx-16,headY-headR-16,32,4);
      g.fillStyle(QC.gold,1); g.fillCircle(cx+8,headY-headR-18,4); g.lineStyle(2,QC.gold,0.9); g.beginPath(); g.moveTo(cx,headY-headR-14); g.lineTo(cx+8,headY-headR-18); g.strokePath();
      g.lineStyle(1.5,QC.onSurface,0.4); g.strokeRect(cx-16,headY-headR-16,32,4); }
    else { const cy=headY-headR-10,cw=24,cxx=cx-cw/2; g.fillStyle(QC.gold,1); g.fillRect(cxx,cy,cw,8);
      g.fillTriangle(cxx,cy,cxx+4,cy-8,cxx+8,cy); g.fillTriangle(cxx+8,cy,cxx+cw/2,cy-10,cxx+cw-8,cy); g.fillTriangle(cxx+cw-8,cy,cxx+cw-4,cy-8,cxx+cw,cy);
      g.fillStyle(QC.error,1); g.fillCircle(cx,cy+4,3); g.lineStyle(1.5,_darken(QC.gold,20),0.8); g.strokeRect(cxx,cy,cw,8); }
  }

  root.QC = QC;
  root.QCOLOR = { darken, brighten };
  root.drawSubjectBuilding = drawSubjectBuilding;
  root.drawAvatar = drawAvatar;
  root.avatarPalette = avatarPalette;
  root.avatarRng = avatarRng;
})(window);
