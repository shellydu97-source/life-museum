/* =========================================================
 * constellation.js · 人生星座图（含亲密度轨道、多选同看与拖拽调亲密度）
 * ========================================================= */

const CONS={raf:0,off:[],on:[],sels:[],multi:false,pos:{},sel:null,tx:0,ty:0,sc:1,imgs:{},nodes:[]};
let consOverlayRaf=0;
const relId=e=>relOf(e.relation).id;
const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
const consRadiusOf=k=>120+(5-k)*55;
const consIntimacyOf=e=>Math.min(5,Math.max(1,+e.intimacy||3));
const consMultiLabel=()=>CONS.multi?'📌 多选中 · 点这里结束':'📌 多选几位一起看';

function renderStars(){
 const people=visibleExhibits().filter(e=>e.type==='person');
 const head=`<div class="wrap"><div class="hero"><p class="eyebrow">CONSTELLATION</p><h1 class="title-font glow">🌌 人生星座图</h1><p class="sub">你是中心的太阳，生命里重要的人像星星一样围绕着你<br><span class="hint">越亲密离你越近 · 一起的回忆越多，星星越亮</span></p></div>`;
 if(!people.length)return head+`<div class="empty-state"><div style="font-size:64px" class="float">🌌</div>这片星空还空空的…${UI.visitor?'':`<br>先记录一个对你很重要的人吧<br><button class="btn btn-primary" style="margin-top:16px" onclick="openEditor({type:'person'})">👤 记录一个重要的人</button>`}</div></div>`;
 const used=RELS.filter(r=>people.some(p=>relId(p)===r.id));
 CONS.on=CONS.on.filter(id=>used.some(r=>r.id===id));
 const chips=`<div class="chips center"><span class="chip ${CONS.on.length?'':'on'}" onclick="consRel34('all')">🌌 全部 · ${people.length}</span>${used.map(r=>`<span class="chip ${CONS.on.includes(r.id)?'on':''}" onclick="consRel34('${r.id}')"><i style="--c:${r.c}"></i>${r.n} · ${people.filter(p=>relId(p)===r.id).length}</span>`).join('')}</div>`;
 return head+chips+`
 <div class="btn-row center">${UI.visitor?'':`<button class="btn btn-primary" onclick="openEditor({type:'person'})">👤 添加人物</button>`}<button class="btn" onclick="consReset()">✨ 重新排列</button><button class="btn ${CONS.multi?'on34':''}" id="cons-multi" onclick="consMulti34()">${consMultiLabel()}</button></div>
 <p class="hint cons-legend">💞 把星星拖到里圈或外圈，就能调整亲密程度，位置会自动记住</p><div class="cons-wrap" id="cons-wrap"><canvas id="cons"></canvas><canvas id="cons-ov" class="cons-ov"></canvas><div class="cons-tip">🖱️ 拖动星星或空白处 · 滚轮缩放 · 点击星星看回忆 · 拖到别的圈可改亲密程度</div><div class="cons-panel" id="cons-panel"></div></div></div>`;
}

function consRel34(id){CONS.on=id==='all'?[]:CONS.on.includes(id)?CONS.on.filter(x=>x!==id):[...CONS.on,id];CONS.sel=null;CONS.sels=[];render()}
function consMulti34(){CONS.multi=!CONS.multi;consClose();const b=$('cons-multi');if(b){b.classList.toggle('on34',CONS.multi);b.textContent=consMultiLabel()}toast(CONS.multi?'📌 现在点星星，可以把几位放在一起看':'已回到单选：点下一位，上一位会收起')}
async function consReset(){
 if(!UI.visitor&&S.consPos&&Object.keys(S.consPos).length){const o=S.consPos;S.consPos={};if(!(await save())){S.consPos=o;return}}
 CONS.sel=null;CONS.sels=[];render();toast('✨ 已按亲密程度重新排列');
}
function consPanel(html){const p=$('cons-panel');if(!p)return;p.innerHTML=`<button class="modal-x" onclick="consClose()">✕</button>`+html;p.classList.add('show');p.scrollTop=0}
function consClose(){CONS.sels=[];CONS.sel=null;const p=$('cons-panel');if(p)p.classList.remove('show')}
function consPick(id){const n=CONS.nodes.find(x=>x.id===id);if(n)consSelect(n)}
function consUnpick34(id){CONS.sels=CONS.sels.filter(x=>x!==id);CONS.sel=CONS.sels[CONS.sels.length-1]||null;CONS.sels.length?consMultiPanel():consClose()}

function consMultiPanel(){
 const ns=CONS.sels.map(id=>CONS.nodes.find(n=>n.id===id)).filter(Boolean),set=new Set(ns.map(n=>n.id)),rs=ns.map(n=>new Set(relatedOf(n.e).map(r=>r.id)));
 const common=visibleExhibits().filter(x=>!set.has(x.id)&&rs.filter(s=>s.has(x.id)).length>=2).sort(memorySort);
 const item=x=>`<div class="rel-item" onclick="openExhibit('${x.id}')"><span class="rel-thumb" style="${thumbStyle(x)}">${thumbIcon(x)}</span>${(TYPES[x.type]||TYPES.event).icon} ${esc(x.title)}</div>`;
 consPanel(`<h3 class="title-font" style="font-size:22px">📌 一起看 · ${ns.length} 位</h3><p class="hint">继续点星星可以加人，再点一次就移出</p>${ns.map((n,i)=>{const e=n.e,r=relOf(e.relation);return `<div class="m34-row" style="--c:${r.c};animation-delay:${i*40}ms"><span class="rel-thumb" style="${thumbStyle(e)}">${thumbIcon(e)}</span><div><b>${esc(e.title)}</b><small>${r.n} · ${rs[i].size} 段回忆</small><span class="hearts34">${intimacyHearts(consIntimacyOf(e))}</span></div><button class="icon-btn" title="查看" onclick="openExhibit('${e.id}')">📖</button><i title="移出" onclick="consUnpick34('${e.id}')">✕</i></div>`}).join('')}${ns.length>1?`<h4 style="font-size:14px;color:var(--sub);font-weight:normal;margin:18px 0 10px">🔗 你们共同的回忆（${common.length}）</h4>${common.length?`<div class="rel-list">${common.map(item).join('')}</div>`:'<p class="hint">还没有同时关联他们的回忆</p>'}`:''}`);
}

function consSelect(n){
 if(CONS.multi&&n&&!n.sun){
  CONS.sels=CONS.sels.includes(n.id)?CONS.sels.filter(x=>x!==n.id):[...CONS.sels,n.id];
  CONS.sel=CONS.sels[CONS.sels.length-1]||null;
  CONS.sels.length?consMultiPanel():consClose();
  return;
 }
 if(n.sun){
  CONS.sel=null;const ppl=CONS.nodes.slice().sort((a,b)=>b.n-a.n);
  consPanel(`<div style="text-align:center"><div class="orb" style="width:90px;height:90px;font-size:42px">${avatarHTML(S.profile.avatar)}</div><h3 class="title-font" style="font-size:24px">${esc(S.profile.name)}</h3><p class="sub" style="font-size:13px">你的星空里有 ${ppl.length} 颗星星</p></div>
  ${RELS.map(r=>{const c=ppl.filter(p=>relId(p.e)===r.id).length;return c?`<div class="hp-row"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.c};margin-right:8px;box-shadow:0 0 8px ${r.c}"></span>${r.n}</span>${c} 位</div>`:''}).join('')}
  ${ppl.some(p=>p.n)?`<h4 style="font-size:14px;color:var(--sub);font-weight:normal;margin:18px 0 10px">💫 一起回忆最多的人</h4><div class="rel-list">${ppl.filter(p=>p.n).slice(0,5).map(p=>`<div class="rel-item" onclick="consPick('${p.id}')"><span class="rel-thumb" style="${thumbStyle(p.e)}">${thumbIcon(p.e)}</span>${esc(p.e.title)} · ${p.n}</div>`).join('')}</div>`:''}`);
  return;
 }
 const e=n.e,r=relOf(e.relation),rel=relatedOf(e).sort(byDate),img=e.images&&e.images[0],t=timeLabel(e);
 CONS.sel=n.id;
 consPanel(`<div style="text-align:center;--c:${r.c}"><div class="p-avatar" style="${img?`background-image:url('${img}')`:''}">${img?'':thumbIcon(e)}</div><h3 class="title-font" style="font-size:24px;margin-top:14px">${esc(e.title)}</h3><span class="p-rel">${r.n}${e.nickname?' · '+esc(e.nickname):''}</span><p class="hearts34" style="margin-top:8px">${intimacyHearts(consIntimacyOf(e))} <span class="hint">${e.intimacy?INTIMACY_NAMES[e.intimacy]:'还没设亲密程度'}</span></p>${t?`<p class="hint" style="margin-top:8px">🌱 相识于 ${esc(t)}</p>`:''}</div>
 ${e.quote?`<div class="d-quote" style="margin-top:16px;font-size:16px">💬 “${esc(e.quote)}”</div>`:''}
 <h4 style="font-size:14px;color:var(--sub);font-weight:normal;margin:18px 0 10px">💫 一起的回忆（${rel.length}）</h4>
 ${rel.length?`<div class="rel-list">${rel.map(x=>`<div class="rel-item" onclick="openExhibit('${x.id}')"><span class="rel-thumb" style="${thumbStyle(x)}">${thumbIcon(x)}</span>${(TYPES[x.type]||TYPES.event).icon} ${esc(x.title)}</div>`).join('')}</div>`:'<p class="hint">还没有和 ta 有关的回忆</p>'}
 <div class="btn-row"><button class="btn btn-primary sm" onclick="openExhibit('${e.id}')">📖 查看卡片</button>${UI.visitor?'':`<button class="btn sm" onclick="openEditor({type:'event',link:'${e.id}'})">📅 写一件你们的事</button>`}</div>`);
}

async function consDropped(snap){
 if(UI.visitor||!snap)return;let b;try{b=JSON.parse(snap)}catch(e){return}
 const id=Object.keys(CONS.pos).find(k=>{const p=b[k],q=CONS.pos[k];return p&&q&&(p[0]!==q[0]||p[1]!==q[1])});if(!id)return;
 const p=CONS.pos[id],rec=S.exhibits.find(e=>e.id===id);if(!rec)return;
 const k=Math.min(5,Math.max(1,Math.round(5-(Math.hypot(p[0],p[1])-120)/55)));
 S.consPos=S.consPos||{};const oP=S.consPos[id],oK=rec.intimacy;S.consPos[id]=[Math.round(p[0]),Math.round(p[1])];rec.intimacy=k;
 if(!(await save())){if(oP)S.consPos[id]=oP;else delete S.consPos[id];rec.intimacy=oK;return}
 if(oK!==k)toast(`💞 ${rec.title}：${intimacyHearts(k)} ${INTIMACY_NAMES[k]}`);
 if(CONS.multi&&CONS.sels.includes(id))consMultiPanel();else if(CONS.sel===id){const n=CONS.nodes.find(z=>z.id===id);if(n)consSelect(n)}
}

function initConsOverlay(){
 cancelAnimationFrame(consOverlayRaf);const ov=$('cons-ov'),cv=$('cons'),wrap=$('cons-wrap');if(!ov||!cv)return;
 const x=ov.getContext('2d'),dpr=Math.min(window.devicePixelRatio||1,2);let dragging=false,snap='',t=0,pts=new Set();
 cv.addEventListener('pointerdown',ev=>{pts.add(ev.pointerId);if(pts.size===1){dragging=true;snap=JSON.stringify(CONS.pos)}else{dragging=false;snap=''}});
 const endPt=ev=>{pts.delete(ev.pointerId);if(pts.size===0){if(dragging)consDropped(snap);dragging=false;snap=''}};
 cv.addEventListener('pointerup',endPt);
 cv.addEventListener('pointercancel',ev=>{pts.delete(ev.pointerId);if(pts.size===0){dragging=false;snap=''}});
 (function draw(){
  if(!ov.isConnected)return;consOverlayRaf=requestAnimationFrame(draw);if(document.hidden)return;
  const W=wrap.clientWidth,H=wrap.clientHeight,sc=CONS.sc;
  if(ov.width!==Math.round(W*dpr)||ov.height!==Math.round(H*dpr)){ov.width=W*dpr;ov.height=H*dpr}
  t+=motionCalm()?0:.03;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  x.setTransform(dpr*sc,0,0,dpr*sc,dpr*CONS.tx,dpr*CONS.ty);x.lineWidth=1/sc;x.textAlign='center';x.font=`${12/sc}px sans-serif`;
  for(let k=5;k>=1;k--){x.setLineDash([2,8]);x.strokeStyle=`rgba(255,182,230,${dragging?.45:.12})`;x.beginPath();x.arc(0,0,consRadiusOf(k),0,6.283);x.stroke();if(dragging){x.fillStyle='rgba(255,226,154,.85)';x.fillText('♥'.repeat(k),0,-consRadiusOf(k)-6/sc)}}
  x.setLineDash([]);const sel=CONS.sels.map(id=>CONS.nodes.find(n=>n.id===id)).filter(Boolean);
  if(sel.length>1){x.strokeStyle='rgba(255,226,154,.55)';x.lineWidth=1.5/sc;x.setLineDash([6,6]);x.beginPath();sel.forEach((n,i)=>i?x.lineTo(n.x,n.y):x.moveTo(n.x,n.y));x.stroke();x.setLineDash([])}
  sel.forEach(n=>{x.strokeStyle='#ffe29a';x.globalAlpha=.55+Math.sin(t*2)*.35;x.lineWidth=2.5/sc;x.beginPath();x.arc(n.x,n.y,n.r*1.25+14,0,6.283);x.stroke();x.globalAlpha=1});
 })();
}

function initCons(){
 CONS.off=CONS.on.length?RELS.map(r=>r.id).filter(id=>!CONS.on.includes(id)):[];
 const relOrder=RELS.map(r=>r.id),ppl0=visibleExhibits().filter(e=>e.type==='person'&&!CONS.off.includes(relId(e)));
 ppl0.sort((a,b)=>relOrder.indexOf(relId(a))-relOrder.indexOf(relId(b))||consIntimacyOf(b)-consIntimacyOf(a));
 const saved=S.consPos||{},N0=ppl0.length;CONS.pos={};
 ppl0.forEach((e,i)=>{const p=saved[e.id];if(Array.isArray(p)){CONS.pos[e.id]=[+p[0],+p[1]];return}const a=i/Math.max(N0,1)*Math.PI*2-Math.PI/2,R=consRadiusOf(consIntimacyOf(e))+(N0>10&&i%2?26:0);CONS.pos[e.id]=[Math.cos(a)*R,Math.sin(a)*R]});
 const keep=CONS.multi?CONS.sels.slice():null;if(keep)CONS.sel=null;

 cancelAnimationFrame(CONS.raf);
 const cv=$('cons');if(!cv)return;
 const wrap=$('cons-wrap'),x=cv.getContext('2d'),dpr=Math.min(window.devicePixelRatio||1,2);
 const ppl=visibleExhibits().filter(e=>e.type==='person'&&!CONS.off.includes(relId(e)));
 const order=RELS.map(r=>r.id);
 const info=ppl.map(e=>{const rel=relatedOf(e);return{e,rel:new Set(rel.map(r=>r.id)),n:rel.length}});
 info.sort((a,b)=>order.indexOf(relId(a.e))-order.indexOf(relId(b.e))||b.n-a.n);
 const N=info.length;
 const nodes=info.map((o,i)=>{
  const k=Math.min(o.n,8),ang=i/Math.max(N,1)*Math.PI*2-Math.PI/2;
  const R=Math.max(120,300-k*22)+(N>10&&i%2?55:0);
  const p=CONS.pos[o.e.id],r=relOf(o.e.relation),img=o.e.images&&o.e.images[0];
  let im=null;if(img){const c=CONS.imgs[o.e.id];if(c&&c.src===img)im=c.im;else{im=new Image();im.src=img;CONS.imgs[o.e.id]={src:img,im}}}
  return{id:o.e.id,e:o.e,n:o.n,rel:o.rel,c:r.c,x:p?p[0]:Math.cos(ang)*R,y:p?p[1]:Math.sin(ang)*R,r:9+Math.min(o.n,6)*2,im,ph:Math.random()*6.28,label:o.e.title||''}});
 CONS.nodes=nodes;
 const sun={sun:true,x:0,y:0,r:38};
 const pairs=[];
 for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const a=nodes[i],b=nodes[j],direct=a.rel.has(b.id);let shared=0;a.rel.forEach(id=>{if(b.rel.has(id))shared++});if(direct||shared)pairs.push([a,b,Math.max(1,shared)])}
 let W=0,H=0,t=0;
 function size(){W=wrap.clientWidth;H=wrap.clientHeight;cv.width=W*dpr;cv.height=H*dpr}
 size();
 const maxR=Math.max(200,...nodes.map(n=>Math.hypot(n.x,n.y)+n.r+40));
 CONS.sc=Math.min(1.15,Math.max(.35,(Math.min(W,H)/2-30)/maxR));CONS.tx=W/2;CONS.ty=H/2;
 const bg=Array.from({length:70},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.2+.3,p:Math.random()*6.28}));
 const sp=n=>({x:n.x+Math.sin(t*.9+n.ph)*3,y:n.y+Math.cos(t*.7+n.ph)*3});
 function frame(){
  if(!document.body.contains(cv)||document.hidden)return;
  if(wrap.clientWidth!==W||wrap.clientHeight!==H)size();
  t+=motionCalm()?0:.016;
  x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  bg.forEach(s=>{x.fillStyle=`rgba(255,240,255,${.15+(Math.sin(t*1.5+s.p)+1)*.2})`;x.beginPath();x.arc(s.x*W,s.y*H,s.r,0,6.283);x.fill()});
  x.setTransform(dpr*CONS.sc,0,0,dpr*CONS.sc,dpr*CONS.tx,dpr*CONS.ty);
  x.setLineDash([4,6]);
  pairs.forEach(([a,b,w])=>{const pa=sp(a),pb=sp(b),g=x.createLinearGradient(pa.x,pa.y,pb.x,pb.y);g.addColorStop(0,a.c);g.addColorStop(1,b.c);x.strokeStyle=g;x.globalAlpha=.25+Math.min(w,4)*.08;x.lineWidth=1+Math.min(w,4)*.3;x.beginPath();x.moveTo(pa.x,pa.y);x.lineTo(pb.x,pb.y);x.stroke()});
  x.setLineDash([]);
  nodes.forEach(n=>{const p=sp(n),k=Math.min(n.n,6),sel=CONS.sel===n.id;x.globalAlpha=sel?.95:.18+k*.11;x.strokeStyle=n.c;x.lineWidth=(1+k*.6)*(sel?1.6:1);x.beginPath();x.moveTo(0,0);x.lineTo(p.x,p.y);x.stroke()});
  x.globalAlpha=1;
  const sg=x.createRadialGradient(0,0,0,0,0,110);sg.addColorStop(0,'rgba(255,240,200,.9)');sg.addColorStop(.3,'rgba(255,200,150,.45)');sg.addColorStop(1,'rgba(255,154,213,0)');
  x.fillStyle=sg;x.beginPath();x.arc(0,0,110+Math.sin(t*2)*6,0,6.283);x.fill();
  x.fillStyle='#fff6e0';x.beginPath();x.arc(0,0,34,0,6.283);x.fill();
  x.textAlign='center';x.textBaseline='middle';x.font='34px sans-serif';const avatarImage=getMuseumAvatarImage(S.profile.avatar);if(avatarImage){x.save();x.beginPath();x.arc(0,0,39,0,6.283);x.clip();const scale=Math.max(78/avatarImage.naturalWidth,78/avatarImage.naturalHeight);x.drawImage(avatarImage,-avatarImage.naturalWidth*scale/2,-avatarImage.naturalHeight*scale/2,avatarImage.naturalWidth*scale,avatarImage.naturalHeight*scale);x.restore()}else x.fillText(museumImageURL(S.profile.avatar)?'🌙':(S.profile.avatar||'🌙'),0,2);
  x.font='bold 14px "Microsoft YaHei",sans-serif';x.fillStyle='#fff';x.fillText(S.profile.name,0,58);
  nodes.forEach(n=>{
   const p=sp(n),sel=CONS.sel===n.id,tw=.75+Math.sin(t*2+n.ph)*.25,R=n.r*(sel?1.25:1);
   const g=x.createRadialGradient(p.x,p.y,0,p.x,p.y,R*3.2);g.addColorStop(0,hexA(n.c,.55*tw));g.addColorStop(1,hexA(n.c,0));x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,R*3.2,0,6.283);x.fill();
   if(n.im&&n.im.complete&&n.im.naturalWidth){x.save();x.beginPath();x.arc(p.x,p.y,R+5,0,6.283);x.clip();const iw=n.im.naturalWidth,ih=n.im.naturalHeight,s=Math.max((R+5)*2/iw,(R+5)*2/ih);x.drawImage(n.im,p.x-iw*s/2,p.y-ih*s/2,iw*s,ih*s);x.restore();x.strokeStyle=n.c;x.lineWidth=2.5;x.beginPath();x.arc(p.x,p.y,R+5,0,6.283);x.stroke()}
   else{x.fillStyle=n.c;x.beginPath();x.arc(p.x,p.y,R,0,6.283);x.fill();x.fillStyle='#fff';x.globalAlpha=.85;x.beginPath();x.arc(p.x,p.y,R*.45,0,6.283);x.fill();x.globalAlpha=1}
   if(sel){x.strokeStyle='#fff';x.globalAlpha=.6+Math.sin(t*4)*.3;x.lineWidth=2;x.beginPath();x.arc(p.x,p.y,R+12,0,6.283);x.stroke();x.globalAlpha=1}
   x.font='13px "Microsoft YaHei",sans-serif';x.fillStyle='#f3eeff';x.textBaseline='top';x.fillText(n.label.length>8?n.label.slice(0,8)+'…':n.label,p.x,p.y+R+(n.im?10:8));x.textBaseline='middle'});
  CONS.raf=motionCalm()?0:requestAnimationFrame(frame)}
 CONS.resume=()=>{cancelAnimationFrame(CONS.raf);if(cv.isConnected&&!document.hidden)frame()};
 getMuseumAvatarImage(S.profile.avatar,()=>{if(CONS.resume&&cv.isConnected&&!document.hidden)CONS.resume()});
 frame();
 const loc=ev=>{const b=cv.getBoundingClientRect();return{x:ev.clientX-b.left,y:ev.clientY-b.top}};
 const hit=ev=>{const l=loc(ev),pad=(ev.pointerType==='touch'?22:12)/CONS.sc,wx=(l.x-CONS.tx)/CONS.sc,wy=(l.y-CONS.ty)/CONS.sc;for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];if(Math.hypot(n.x-wx,n.y-wy)<n.r+pad)return n}if(Math.hypot(wx,wy)<42+pad*.4)return sun;return null};
 let drag=null,pinch=null;
 const pointers=new Map();
 function startPinch(){
  const [p1,p2]=[...pointers.values()],mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,dist=Math.max(10,Math.hypot(p1.x-p2.x,p1.y-p2.y));
  if(drag&&drag.n&&!drag.n.sun){drag.n.x=drag.ox;drag.n.y=drag.oy;CONS.pos[drag.n.id]=[drag.ox,drag.oy]}
  drag=null;pinch={dist,sc:CONS.sc,wx:(mx-CONS.tx)/CONS.sc,wy:(my-CONS.ty)/CONS.sc};
 }
 cv.addEventListener('pointerdown',ev=>{
  const l=loc(ev);pointers.set(ev.pointerId,l);
  try{cv.setPointerCapture(ev.pointerId)}catch(e){}
  if(pointers.size>=2){startPinch();return}
  const n=hit(ev),node=n&&!n.sun;
  drag={id:ev.pointerId,n,sx:ev.clientX,sy:ev.clientY,ox:node?n.x:CONS.tx,oy:node?n.y:CONS.ty,moved:false};
  cv.style.cursor='grabbing';
 });
 cv.addEventListener('pointermove',ev=>{
  if(pointers.has(ev.pointerId))pointers.set(ev.pointerId,loc(ev));
  if(pointers.size>=2&&pinch){
   const [p1,p2]=[...pointers.values()],mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,dist=Math.max(10,Math.hypot(p1.x-p2.x,p1.y-p2.y));
   const ns=Math.min(2.5,Math.max(.3,pinch.sc*(dist/pinch.dist)));
   CONS.sc=ns;CONS.tx=mx-pinch.wx*ns;CONS.ty=my-pinch.wy*ns;return;
  }
  if(!drag||drag.id!==ev.pointerId){cv.style.cursor=hit(ev)?'pointer':'grab';return}
  const dx=ev.clientX-drag.sx,dy=ev.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;if(!drag.moved)return;
  if(drag.n&&!drag.n.sun){drag.n.x=drag.ox+dx/CONS.sc;drag.n.y=drag.oy+dy/CONS.sc;CONS.pos[drag.n.id]=[drag.n.x,drag.n.y]}
  else{CONS.tx=drag.ox+dx;CONS.ty=drag.oy+dy}
 });
 const up=ev=>{
  pointers.delete(ev.pointerId);
  if(pinch){if(pointers.size<2)pinch=null;return}
  if(drag&&drag.id===ev.pointerId){if(!drag.moved){drag.n?consSelect(drag.n):consClose()}drag=null;cv.style.cursor='grab'}
 };
 cv.addEventListener('pointerup',up);
 cv.addEventListener('pointercancel',ev=>{pointers.delete(ev.pointerId);if(pointers.size<2)pinch=null;drag=null});
 cv.addEventListener('wheel',ev=>{ev.preventDefault();const l=loc(ev),k=ev.deltaY<0?1.1:1/1.1,ns=Math.min(2.5,Math.max(.3,CONS.sc*k));CONS.tx=l.x-(l.x-CONS.tx)*ns/CONS.sc;CONS.ty=l.y-(l.y-CONS.ty)*ns/CONS.sc;CONS.sc=ns},{passive:false});
 if(motionCalm()){cv.addEventListener('pointermove',()=>CONS.resume());cv.addEventListener('pointerup',()=>CONS.resume());cv.addEventListener('wheel',()=>CONS.resume(),{passive:true})}
 if(CONS.sel){const n=nodes.find(z=>z.id===CONS.sel);if(n)consSelect(n);else CONS.sel=null}

 if(keep){CONS.sels=keep.filter(id=>CONS.nodes.some(n=>n.id===id));CONS.sel=CONS.sels[CONS.sels.length-1]||null;if(CONS.sels.length)consMultiPanel()}
 initConsOverlay();
}
