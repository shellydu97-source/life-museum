/* =========================================================
 * render-explore.js · 通用工具、逛展页、展厅页、卡片与详情弹窗
 * ========================================================= */

/* ---------- 3.0 时间与年龄计算（支持模糊日期 YYYY / YYYY-MM / YYYY-MM-DD 及人生框架 period） ---------- */
const fwOf=id=>(S.framework||[]).find(f=>f.id===id);
function birthY(){const b=S.profile&&S.profile.birth;return b&&/^\d{4}/.test(b)?+b.slice(0,4):null}
function fmtFuzzy(d){const m=String(d||'').match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);if(!m)return '';return m[3]?`${m[1]}.${m[2]}.${m[3]}`:m[2]?`${m[1]} 年 ${+m[2]} 月`:`${m[1]} 年`}
function validMemoryYear(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const time=Date.parse(date+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date?Number(date.slice(0,4)):null;
}
function memoryYear(e){if(!e)return null;const m=String(e.date||'').match(/^(\d{4})(?:-\d{2}){0,2}$/);if(m)return +m[1];if(e.period)return null;const t=String(e.timeText||'').normalize('NFKC').match(/(?:^|[^\d])(\d{4})(?!\d)/);return t?+t[1]:null}
function museumBirthYear(){return birthY()}
function memoryAge(e){const year=memoryYear(e),birth=museumBirthYear();return year!==null&&birth!==null?year-birth:null}
function searchMemoryAge(e){
 if(validMemoryYear(e&&e.date)===null||museumBirthYear()===null)return memoryAge(e);
 const date=e.date.split('-').map(Number),birth=S.profile.birth.split('-').map(Number);let age=date[0]-birth[0];
 if(date[1]<birth[1]||(date[1]===birth[1]&&date[2]<birth[2]))age--;
 return age;
}
function museumCurrentAge(){
 if(museumBirthYear()===null)return null;
 const now=new Date(),birth=S.profile.birth.split('-').map(Number);let age=now.getFullYear()-birth[0];
 if(now.getMonth()+1<birth[1]||(now.getMonth()+1===birth[1]&&now.getDate()<birth[2]))age--;
 return age;
}
function ageAt(d){const b=S.profile&&S.profile.birth;if(!b||!d)return null;const m=String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);if(!m)return null;const bm=+b.slice(5,7)||1,bd=+b.slice(8,10)||1;let a=+m[1]-(+b.slice(0,4));if(m[2]){const mm=+m[2];if(mm<bm||(mm===bm&&m[3]&&+m[3]<bd))a--}return a}
function timeLabel(e){
 if(e.period){const f=fwOf(e.period);if(f){const b=birthY(),to=f.to||f.from;let t=f.label+(f.name?'·'+f.name:'')+' 时';if(b&&f.from)t+=` · ${f.from-b}–${to-b} 岁`;return e.timeText?e.timeText+' · '+t:t}}
 let t=e.timeText||fmtFuzzy(e.date);
 if(e.type==='travel'&&e.date&&e.endDate&&e.endDate!==e.date&&!e.timeText)t=fmtFuzzy(e.date)+' - '+fmtFuzzy(e.endDate);
 const a=ageAt(e.date);if(a!==null&&a>=0)t+=(t?' · ':'')+a+' 岁';return t}
function metaLine(e){
 const p=[],t=timeLabel(e);
 if(e.type==='person'){if(t)p.push('相识于 '+t)}
 else if(e.type==='fav'){if(e.category)p.push(e.category);if(t)p.push('从 '+t+' 开始喜欢')}
 else{if(t)p.push(t);if(e.place)p.push('📍'+e.place)}
 return p.join(' · ')}
const isVisible=e=>!UI.visitor||(!e.private&&!hallLocked(hallOf(e.hall)));
const visibleExhibits=()=>S.exhibits.filter(isVisible);
const shownHalls=()=>S.halls.filter(h=>!h.hidden&&!(UI.visitor&&hallLocked(h)));
function byDate(a,b){if(a.date&&b.date)return a.date.localeCompare(b.date);if(a.date)return -1;if(b.date)return 1;return(a.createdAt||0)-(b.createdAt||0)}
const exhibitsOf=hid=>visibleExhibits().filter(e=>e.hall===hid).sort(byDate);
function relatedOf(e){return visibleExhibits().filter(x=>x.id!==e.id&&((e.links||[]).includes(x.id)||(x.links||[]).includes(e.id)))}
function parseP(s,hid){const i=s.indexOf('|'),t=i>0?s.slice(0,i):'';return TYPES[t]?{q:s.slice(i+1),type:t,hall:hid}:{q:s,type:HALL_TYPE[hid]||'event',hall:hid}}
function promptsOf(hid,withHidden){
 const base=(PROMPTS[hid]||[]).map(s=>parseP(s,hid));
 const cus=S.customPrompts.filter(p=>p.hall===hid).map(p=>({q:p.q,type:TYPES[p.type]?p.type:(HALL_TYPE[hid]||'event'),hall:hid,custom:p.id}));
 const all=[...base,...cus];return withHidden?all:all.filter(p=>!S.hiddenPrompts.includes(p.q))}
function answerCount(){const m={};S.exhibits.forEach(e=>{if(e.prompt)m[e.prompt]=(m[e.prompt]||0)+1});return m}
const allPrompts=()=>S.halls.filter(h=>!h.hidden).flatMap(h=>promptsOf(h.id));
function travelStats(list){const c=new Set(),k=new Set();let days=0;list.forEach(e=>{if(e.place)c.add(e.place.trim());if(e.country)k.add(e.country.trim());if(e.date){const end=e.endDate&&e.endDate>=e.date?e.endDate:e.date;days+=Math.round((new Date(end)-new Date(e.date))/864e5)+1}});return{trips:list.length,cities:c.size,countries:k.size,days}}
function thumbStyle(e){const h=hall(e.hall),img=e.images&&e.images[0];return img?`background-image:url('${img}')`:`background:linear-gradient(135deg,${h.g[0]},${h.g[1]})`}
function thumbIcon(e){if(e.images&&e.images[0])return '';if(e.type==='person')return esc(Array.from(e.title||'?')[0]);const m=mood(e.mood);return m?m.e:(TYPES[e.type]||TYPES.event).icon}
function compress(file,max=1100,q=.75){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;const s=Math.min(1,max/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',q))};img.onerror=rej;img.src=r.result};r.onerror=rej;r.readAsDataURL(file)})}

function stageHalls(visibleOnly=false){return S.halls.filter(h=>h.kind==='stage'&&(!visibleOnly||(!h.hidden&&!(UI.visitor&&hallLocked(h)))))}
function themeHalls(visibleOnly=false){return S.halls.filter(h=>h.kind==='theme'&&(!visibleOnly||(!h.hidden&&!(UI.visitor&&hallLocked(h)))))}
/* 阶段归属（最终生效版）：手动指定 stage > 人生框架 period > 日期年龄 > 所在阶段展厅 */
function stageOf(e){
 if(!e)return null;
 const st=id=>S.halls.find(h=>h.id===id&&h.kind==='stage');
 if(e.stage&&st(e.stage))return st(e.stage);
 const b=birthY(),f=e.period&&fwOf(e.period);let a=null;
 if(f&&f.from&&b!==null)a=Math.floor((f.from+(f.to||f.from))/2)-b;else a=memoryAge(e);
 if(a!==null){if(a<0)return st('origin')||null;const h=S.halls.find(h=>h.kind==='stage'&&h.id!=='origin'&&Number.isFinite(h.ageFrom)&&a>=h.ageFrom&&a<h.ageTo);if(h)return h}
 const own=hallOf(e.hall);return own&&own.kind==='stage'?own:null;
}
function memorySort(a,b){
 const ay=memoryYear(a),by=memoryYear(b);if(ay!==null&&by!==null&&ay!==by)return ay-by;if(ay!==null&&by===null)return -1;if(ay===null&&by!==null)return 1;
 const ad=validMemoryYear(a.date)!==null?a.date:'',bd=validMemoryYear(b.date)!==null?b.date:'';
 if(ad&&bd&&ad!==bd)return ad.localeCompare(bd);if(ad&&!bd)return -1;if(!ad&&bd)return 1;
 return (Number(a.createdAt)||0)-(Number(b.createdAt)||0);
}

/* ---------- 多展厅共享辅助（新3.1 第2段） ---------- */
const inHall=(e,id)=>e.hall===id||(Array.isArray(e.halls)&&e.halls.includes(id));
const extras=e=>(e.halls||[]).filter(x=>x!==e.hall&&hallOf(x));
function withHall(id,fn){
 const real=S.exhibits;
 S.exhibits=real.map(e=>e.hall!==id&&inHall(e,id)&&isVisible(e)?{...e,hall:id,_home:e.hall}:e);
 try{return fn()}finally{S.exhibits=real}
}

/* ---------- 展厅门卡片（人生阶段 = 拱门 arch37；时间之外 = 金色画框 frame37 + 四角 ✦） ---------- */
function doorHTML(h,i){
 return withHall(h.id,()=>{
  const n=exhibitsOf(h.id).length,cnt=answerCount(),left=UI.visitor?0:promptsOf(h.id).filter(p=>!cnt[p.q]).length;
  const lock=h.secret?'🔒 仅自己可见':h.private?'🔒 独家展厅':'';
  const isStage=h.kind==='stage';
  const cls=isStage?'d37 arch37':'d37 frame37 d38';
  const deco=isStage
   ?'<i class="k37 in37"></i><i class="k37 gem37"></i><i class="k37 col37 l"></i><i class="k37 col37 r"></i><i class="k37 step37"></i>'
   :'<i class="k37 cn37 a">✦</i><i class="k37 cn37 b">✦</i><i class="k37 cn37 c">✦</i><i class="k37 cn37 d">✦</i>';
  return `<div class="door tilt ${cls}" style="--g1:${h.g[0]};--g2:${h.g[1]};animation-delay:${i*.05}s" onclick="go('hall','${h.id}')">${deco}
  ${lock?`<div class="lock-tag">${lock}</div>`:''}
  <div class="door-icon">${esc(h.icon)}</div><h3 class="title-font">${esc(h.name)}</h3><p>${esc(h.desc||'')}</p>
  <div class="door-meta"><span>🖼️ ${n} 段回忆</span>${UI.visitor?'':`<span>💭 ${left?'还有 '+left+' 个灵感':'可以自由添加'}</span>`}</div>
 </div>`;
 });
}

/* ---------- 回忆卡片（6 种样式 + 多展厅 +N 馆标识） ---------- */
function cardHTML(e){
 const h=hall(e.hall),T=TYPES[e.type]||TYPES.event,img=e.images&&e.images[0],meta=metaLine(e);
 const allHalls=[...new Set([e._home||e.hall,...(e.halls||[])])].filter(x=>x!==e.hall).map(hallOf).filter(x=>x&&!(UI.visitor&&hallLocked(x)));
 const moreHalls=allHalls.length?` <span class="hint">+${allHalls.length} 馆</span>`:'';
 const badges=`<div class="badges">${e.private&&!UI.visitor?'<span class="badge">🔒 独家</span>':''}${e.star?'<span class="badge gold">✨ 镇馆之宝</span>':''}${e.pending&&!UI.visitor?'<span class="badge">⏳ 待补充</span>':''}</div>`;
 const top=`<div class="ex-hall">${T.icon} ${T.n} · ${esc(h.icon)} ${esc(h.name)}${moreHalls}</div>`;
 const ex=n=>e.story?`<p class="ex-excerpt">${esc(e.story.slice(0,n))}${e.story.length>n?'…':''}</p>`:'';
 const cls=`ex-card tilt ${e.star?'star':''}`,click=`data-exhibit-id="${esc(e.id)}" onclick="openExhibit('${e.id}')"`;
 if(e.type==='person'){const r=relOf(e.relation);
  return `<div class="${cls} person" style="--c:${r.c}" ${click}>${badges}<div class="p-avatar" style="${img?`background-image:url('${img}')`:''}">${img?'':thumbIcon(e)}</div><div class="ex-body">${top}<h4>${esc(e.title)}</h4><span class="p-rel">${r.n}${e.nickname?' · '+esc(e.nickname):''}</span>${meta?`<p class="ex-meta" style="margin-top:8px">${esc(meta)}</p>`:''}${ex(40)}</div></div>`}
 if(e.type==='note'&&!img)
  return `<div class="${cls} note" ${click}>${badges}<div class="ex-body"><span class="note-q">“</span>${top}<h4>${esc(e.title)}</h4>${ex(90)}${meta?`<p class="ex-meta" style="margin-top:10px">${esc(meta)}</p>`:''}</div></div>`;
 const pc=e.type==='travel';
 const cover=img?`<div class="ex-cover" style="background-image:url('${img}')"></div>`:`<div class="ex-cover empty" style="--g1:${h.g[0]};--g2:${h.g[1]}">${thumbIcon(e)}</div>`;
 return `<div class="${cls} ${pc?'postcard':''}" ${click}>${badges}${pc?`<div class="stamp">${esc(e.country||'✈ TRAVEL')}</div>`:''}${cover}<div class="ex-body">${top}<h4>${esc(e.title)}</h4>${meta?`<p class="ex-meta">${esc(meta)}</p>`:''}${ex(56)}</div></div>`}

/* ---------- 逛展首页（含镇馆之宝聚光灯 spot35/sp35） ---------- */
function renderExplore(){
 if(UI.view==='onboard'&&typeof renderOnboard==='function')return renderOnboard();
 const p=S.profile,vis=visibleExhibits(),halls=shownHalls(),stages=halls.filter(h=>h.kind==='stage'),themes=halls.filter(h=>h.kind==='theme');
 const ts=travelStats(vis.filter(e=>e.type==='travel')),people=vis.filter(e=>e.type==='person').length,stars=vis.filter(e=>e.star).sort(memorySort),open=halls.filter(h=>exhibitsOf(h.id).length).length;
 const guide=!UI.visitor&&S.exhibits.length<3?`<div class="guide glass"><div class="guide-icon float">🧚</div><div><h3 class="title-font">馆长小精灵：嗨，欢迎来到你的博物馆！</h3><p class="sub">不知道从哪里开始？试试这几种方式 👇</p><div class="btn-row"><button class="btn btn-primary" onclick="go('studio')">💫 我来提问，帮你回忆</button><button class="btn" onclick="openEditor({type:'person'})">👤 先记录一个重要的人</button><button class="btn" onclick="quickAdd()">＋ 直接收藏一段回忆</button></div></div></div>`:'';
 return `<div class="wrap"><div class="hero"><div class="orb float">${avatarHTML(p.avatar)}</div><h1 class="title-font glow">${esc(p.name)} 的人生博物馆</h1>${p.motto?`<p class="motto" style="margin-bottom:0">“${esc(p.motto)}”</p>`:''}<div class="stats">${stat(vis.length,'段回忆')}${stat(open,'个展厅已开放')}${stat(people,'位重要的人')}${stat(ts.cities,'座城市足迹')}</div></div>${guide}
 <div class="mode-grid" style="grid-template-columns:minmax(0,1fr);max-width:560px;margin:28px auto"><div class="mode-card tilt" style="--g1:#ffb6e6;--g2:#8ec5ff" onclick="go('timeline')"><span class="m-icon">⏳</span><h3 class="title-font">时光长河</h3><p>沿着时间线，慢慢打开人生的每一章</p></div></div>
 ${stars.length?`<h2 class="section-title title-font">✨ 镇馆之宝</h2><div class="ex-grid spot35">${stars.map(e=>`<div class="sp35">${cardHTML(e)}</div>`).join('')}</div>`:''}
 <h2 class="section-title title-font">🌱 人生阶段</h2><div class="halls">${stages.map(doorHTML).join('')}</div>
 <h2 class="section-title title-font">🌫️ 时间之外</h2><div class="halls">${themes.map(doorHTML).join('')}</div></div>`;
}

/* ---------- 展厅页（含丝绒围栏 rope35、灵感卡换一批；已去除拱门头、铭牌与书架隔板） ---------- */
function usePrompt(i){const p=UI.plist[i];if(p)openEditor({hall:p.hall,type:p.type,q:p.q})}
async function hidePromptAt(i){const p=UI.plist[i];if(!p)return;if(!S.hiddenPrompts.includes(p.q))S.hiddenPrompts.push(p.q);await save();render();toast('🙈 已隐藏，可以在「⚙️ 我的」里恢复')}
const PROMPT_BATCH_SIZE=6;
function applyPromptBatch(anim){
 if(UI.view!=='hall')return;
 const list=document.querySelector('.prompt-list');if(!list)return;
 const add=list.querySelector('.prompt.add');
 const cards=[...list.querySelectorAll('.prompt:not(.add)')];
 cards.sort((a,b)=>(a.querySelector('.p-done')?1:0)-(b.querySelector('.p-done')?1:0));
 cards.forEach(c=>list.insertBefore(c,add));
 const pages=Math.max(1,Math.ceil(cards.length/PROMPT_BATCH_SIZE));
 const p=(UI.pb[UI.hall]||0)%pages;UI.pb[UI.hall]=p;
 cards.forEach((c,i)=>{
  const on=Math.floor(i/PROMPT_BATCH_SIZE)===p;
  c.classList.toggle('pb-off',!on);
  if(on&&anim){c.classList.add('pb-in');setTimeout(()=>c.classList.remove('pb-in'),500)}
 });
 const head=document.querySelector('.prompts-head');if(!head)return;
 let btn=head.querySelector('.pb-btn');
 if(pages<2){if(btn)btn.remove();return}
 if(!btn){
  btn=document.createElement('button');
  btn.className='btn pb-btn';
  btn.onclick=nextPromptBatch;
  head.insertBefore(btn,head.lastElementChild);
 }
 btn.innerHTML='🔄 换一批 <span class="pb-info">'+(p+1)+'/'+pages+'</span>';
}
function nextPromptBatch(){UI.pb[UI.hall]=(UI.pb[UI.hall]||0)+1;applyPromptBatch(true)}

function renderHall(id){
 return withHall(id,()=>{
  const h=hallOf(id);
  if(!h)return `<div class="wrap empty-state">这个展厅不存在了<br><button class="btn" style="margin-top:16px" onclick="go('explore')">← 返回逛展</button></div>`;
  if(UI.visitor&&hallLocked(h))return `<div class="wrap empty-state"><div style="font-size:70px">🔐</div>这里是馆主的私人展厅，访客止步～<br><button class="btn" style="margin-top:16px" onclick="go('explore')">← 返回逛展</button></div>`;
  const all=exhibitsOf(id),types=TYPE_ORDER.filter(t=>all.some(e=>e.type===t));
  if(UI.hallType!=='all'&&!types.includes(UI.hallType))UI.hallType='all';
  const list=UI.hallType==='all'?all:all.filter(e=>e.type===UI.hallType);
  const rope=hallLocked(h)&&!UI.visitor?`<div class="rope35"><em>${h.secret?'🔐 秘密花园 · 仅馆主':'🔒 独家展厅 · 访客止步'}</em></div>`:'';
  let html=`<div class="wrap" style="--g1:${h.g[0]};--g2:${h.g[1]}">
   <span class="back" onclick="go('explore')">← 返回逛展</span>
   <div class="hall-head"><div class="icon float">${esc(h.icon)}</div><h1 class="title-font">${esc(h.name)}</h1><p class="sub">${esc(h.desc||'')}</p>
   ${hallLocked(h)&&!UI.visitor?`<p class="hint" style="margin-top:6px">🔒 ${h.secret?'这个展厅里的所有回忆，永远只有你自己能看到':'这是独家展厅，访客看不到里面的回忆'}</p>`:''}${rope}</div>`;
  if(id==='travel'){const t=travelStats(all.filter(e=>e.type==='travel'));html+=`<div class="stats">${stat(t.trips,'次旅行')}${stat(t.cities,'座城市')}${stat(t.countries,'个国家/地区')}${stat(t.days,'天在路上')}</div>`}
  if(!UI.visitor){
   const ps=promptsOf(id),cnt=answerCount();UI.plist=ps;
   html+=`<div class="prompts glass"><div class="prompts-head"><span>💭 回忆灵感 · 点一张就能开始写 <span class="hint">（不适合你的，点右上角 ✕ 就能隐藏）</span></span><button class="btn btn-primary" onclick="quickAdd('${id}')">＋ 自由添加</button></div>
   <div class="prompt-list">${ps.map((p,i)=>{const T=TYPES[p.type];return `<div class="prompt" onclick="usePrompt(${i})"><button class="p-hide" title="不适合我" onclick="event.stopPropagation();hidePromptAt(${i})">✕</button><span class="p-type">${T.icon} ${T.n}${p.custom?' · 我出的题':''}</span>${esc(p.q)}${cnt[p.q]?`<br><span class="p-done">✓ 已写 ${cnt[p.q]} 段 · 还可以再写</span>`:''}</div>`}).join('')}<div class="prompt add" onclick="openAddPrompt('${id}')">✍️ 出一道<br>自己的题</div></div></div>`}
  if(types.length>1)html+=`<div class="chips center" style="margin-bottom:22px">${[{id:'all',icon:'🌌',n:'全部'},...types.map(t=>({id:t,...TYPES[t]}))].map(t=>`<span class="chip ${UI.hallType===t.id?'on':''}" onclick="UI.hallType='${t.id}';render()">${t.icon} ${t.n}</span>`).join('')}</div>`;
  html+=list.length?`<div class="ex-grid ${id==='travel'?'postcards':''}">${list.map(cardHTML).join('')}</div>`:`<div class="empty-state"><div style="font-size:64px" class="float">${esc(h.icon)}</div>这个展厅还空空的${UI.visitor?'':'<br>从上面的灵感卡片里挑一个，开始收藏吧 ✨'}</div>`;
  return html+'</div>';
 });
}

/* ---------- 弹窗控制 ---------- */
let ED0='';
const edSnap=()=>JSON.stringify(ED,(k,v)=>(k==='_open'||k==='_riverTouched')?undefined:v);
function tryClose(){if(!MODAL_SOFT){edSync();if(edSnap()!==ED0&&!confirm('这段回忆还没保存，确定要关闭吗？'))return}closeModal()}
function openModal(html,wide=false){
 clearTimeout(motionModalTimer);const serial=++motionModalSerial,m=$('modal');
 if(!m.classList.contains('show'))motionReturnFocus=document.activeElement;
 m.innerHTML=`<div class="modal-box glass ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="博物馆对话框" tabindex="-1"><button class="modal-x" aria-label="关闭弹窗" onclick="tryClose()">✕</button>${html}</div>`;
 m.classList.remove('closing');m.classList.add('show');m.scrollTop=0;document.body.style.overflow='hidden';$('view').inert=true;$('nav').inert=true;
 enhanceDetails(m);prepareInteractiveElements(m);[['e-date','date'],['e-time','timeText']].forEach(([id,key])=>{const field=$(id);if(field)field.addEventListener('input',()=>{ED[key]=field.value;updateEditorStageHint()})});
 const box=m.querySelector('.modal-box');box.classList.add('motion-active');
 requestAnimationFrame(()=>{if(serial!==motionModalSerial)return;box.focus({preventScroll:true})});
 setTimeout(()=>{if(serial===motionModalSerial)box.classList.remove('motion-active')},motionCalm()?0:320);
}
function closeModal(immediate=false){
 const m=$('modal');if(!m)return;clearTimeout(motionModalTimer);const serial=++motionModalSerial;MODAL_SOFT=true;
 const finish=()=>{if(serial!==motionModalSerial)return;m.classList.remove('show','closing');m.replaceChildren();document.body.style.overflow='';$('view').inert=false;$('nav').inert=false;if(motionReturnFocus&&motionReturnFocus.isConnected)motionReturnFocus.focus({preventScroll:true});motionReturnFocus=null};
 if(immediate||motionCalm()||!m.classList.contains('show')){finish();return}
 m.classList.add('closing');motionModalTimer=setTimeout(finish,200);
}

/* ---------- 回忆详情弹窗（含阶段、长河开关、多展厅、亲密度与博物馆展签 label35） ---------- */
const INTIMACY_NAMES=['','点头之交','普通朋友','亲近','很亲密','最重要的人'];
const intimacyHearts=k=>'💗'.repeat(k)+'🤍'.repeat(5-k);
const dotsHTML=()=>CUR.imgs.map((_,i)=>`<i class="${i===CUR.i?'on':''}"></i>`).join('');
function carMove(delta){const serial=++motionCarSerial,n=CUR.imgs.length;if(n<2)return;CUR.i=(CUR.i+delta+n)%n;const image=$('c-img'),source=CUR.imgs[CUR.i];if(!image)return;image.style.opacity='0';setTimeout(()=>{if(serial!==motionCarSerial||!image.isConnected)return;image.src=source;image.style.opacity='1'},motionCalm()?0:150);const dots=$('c-dots');if(dots)dots.innerHTML=dotsHTML()}

function openExhibit(id){
 const e=S.exhibits.find(x=>x.id===id);if(!e||!isVisible(e))return;
 const h=hall(e.hall),T=TYPES[e.type]||TYPES.event,m=mood(e.mood),imgs=e.images||[],isP=e.type==='person',t=timeLabel(e);
 CUR={imgs,i:0};
 const car=imgs.length?`<div class="carousel"><img id="c-img" src="${imgs[0]}" alt="">${imgs.length>1?`<button class="cbtn l" onclick="carMove(-1)">‹</button><button class="cbtn r" onclick="carMove(1)">›</button><div class="dots" id="c-dots">${dotsHTML()}</div>`:''}</div>`:'';
 let top;
 if(isP&&imgs.length<2){const r=relOf(e.relation);top=`<div class="d-person" style="--c:${r.c}"><div class="p-avatar big" style="${imgs[0]?`background-image:url('${imgs[0]}')`:''}">${imgs[0]?'':thumbIcon(e)}</div></div>`}
 else top=car||`<div class="d-hero" style="--g1:${h.g[0]};--g2:${h.g[1]}"><span class="float" style="display:inline-block">${thumbIcon(e)}</span></div>`;
 const chips=[];
 if(isP){chips.push('💞 '+relOf(e.relation).n);if(e.nickname)chips.push('🏷️ 也叫 '+e.nickname);if(t)chips.push('🌱 相识于 '+t);if(e.place)chips.push('📍 '+e.place)}
 else if(e.type==='fav'){if(e.category)chips.push('🏷️ '+e.category);if(t)chips.push('💗 从 '+t+' 开始喜欢')}
 else if(e.type==='item'){if(t)chips.push('🕰️ '+t);if(e.whereNow)chips.push('📦 现在在：'+e.whereNow);if(e.people)chips.push('👥 '+e.people)}
 else if(e.type!=='travel'){if(t)chips.push('🕰️ '+t);if(e.place)chips.push('📍 '+e.place);if(e.people)chips.push('👥 '+e.people)}
 else{if(t)chips.push('🕰️ '+t);if(e.place)chips.push('📍 '+e.place)}
 if(m)chips.push(m.e+' '+m.n);
 if(!UI.visitor)chips.push(e.private||hallLocked(h)?'🔒 独家记忆':'🌍 对外展示');
 const s=stageOf(e);
 if(s&&!(UI.visitor&&hallLocked(s)))chips.push('🌱 '+s.name+(e.river?' · 在长河里':''));
 const metaExtra=isP&&e.intimacy?`<span class="hearts34">${intimacyHearts(e.intimacy)} ${INTIMACY_NAMES[e.intimacy]}</span>`:'';
 const others=extras(e).map(hallOf).filter(x=>x&&!(UI.visitor&&hallLocked(x)));
 const alsoHTML=others.length?`<span class="hint"> · 也在 ${others.map(x=>esc(x.icon+' '+x.name)).join('、')}</span>`:'';
 let info='';
 if(e.type==='travel'){const days=e.date?Math.round(((e.endDate&&e.endDate>=e.date?new Date(e.endDate):new Date(e.date))-new Date(e.date))/864e5)+1:0;
  const rows=[e.country&&`🌍 国家/地区：${esc(e.country)}`,days&&`🗓️ 旅程：${days} 天`,e.companions&&`🧳 同行：${esc(e.companions)}`,e.rating&&`⭐ 心动指数：${'★'.repeat(e.rating)}${'☆'.repeat(5-e.rating)}`].filter(Boolean);
  if(rows.length)info=`<div class="d-info">${rows.map(r=>`<div>${r}</div>`).join('')}</div>`}
 const quote=isP&&e.quote?`<div class="d-quote">💬 “${esc(e.quote)}”</div>`:'';
 const rel=relatedOf(e).sort(byDate);
 const relHTML=rel.length?`<div class="related"><h4>${isP?`💫 和 ${esc(e.title)} 有关的回忆`:'🔗 相关的回忆'}（${rel.length}）</h4><div class="rel-list">${rel.map(x=>`<div class="rel-item" onclick="openExhibit('${x.id}')"><span class="rel-thumb" style="${thumbStyle(x)}">${thumbIcon(x)}</span>${(TYPES[x.type]||TYPES.event).icon} ${esc(x.title)}</div>`).join('')}</div></div>`
  :(isP&&!UI.visitor?`<div class="related"><p class="hint">还没有和 ta 有关的回忆。点下面的「🧶 顺着继续回忆」，写一件你们之间的事吧 ✨</p></div>`:'');
 const sib=exhibitsOf(e.hall),k=sib.findIndex(x=>x.id===id),pv=sib[k-1],nx=sib[k+1];
 const nav=pv||nx?`<div class="btn-row" style="justify-content:space-between;margin-top:22px">${pv?`<button class="btn" onclick="openExhibit('${pv.id}')">← ${esc(pv.title.slice(0,10))}</button>`:'<span></span>'}${nx?`<button class="btn" onclick="openExhibit('${nx.id}')">${esc(nx.title.slice(0,10))} →</button>`:''}</div>`:'';
 const no=[...S.exhibits].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).findIndex(x=>x.id===id)+1,fmtD=t=>new Date(t).toLocaleDateString('zh-CN');
 const labelHTML=`<div class="label35"><b>LIFE MUSEUM · No.${String(no).padStart(4,'0')}</b><span>${T.icon} ${T.n}${e.createdAt?' · 入馆 '+fmtD(e.createdAt):''}${e.updatedAt&&e.updatedAt-(e.createdAt||0)>6e4?' · 修订 '+fmtD(e.updatedAt):''}</span></div>`;
 const acts=UI.visitor?'':`<div class="d-actions"><button class="btn btn-primary" onclick="openEditor({id:'${e.id}'})">✏️ 编辑</button><button class="btn" onclick="openFollow('${e.id}',false)">🧶 顺着继续回忆</button><button class="btn" onclick="riverToggle31('${e.id}')">${e.river?'🌊 移出长河':'⏳ 放进长河'}</button>${hallLocked(h)?'':`<button class="btn" onclick="toggleField('${e.id}','private')">${e.private?'🌍 改为对外展示':'🔒 改为独家'}</button>`}<button class="btn" onclick="toggleField('${e.id}','star')">${e.star?'取消镇馆之宝':'✨ 设为镇馆之宝'}</button><button class="btn danger" onclick="delExhibit('${e.id}')">🗑 删除</button></div>`;
 MODAL_SOFT=true;
 openModal(`${top}<div class="d-hall">${T.icon} ${T.n} · ${esc(h.icon)} ${esc(h.name)}${e.star?' · ✨ 镇馆之宝':''}${alsoHTML}</div><h2 class="d-title title-font">${esc(e.title)}</h2><div class="d-meta">${chips.map(c=>`<span>${esc(c)}</span>`).join('')}${metaExtra}</div>${e.prompt?`<div class="d-prompt">💭 ${esc(e.prompt)}</div>`:''}${info}${quote}<div class="d-story">${esc(e.story)||'<span class="hint">这段回忆还没有写下故事…</span>'}</div>${relHTML}${nav}${labelHTML}${acts}`);
}

async function toggleField(id,k){const e=S.exhibits.find(x=>x.id===id);if(!e)return;e[k]=!e[k];await save();render();openExhibit(id);toast(k==='private'?(e.private?'🔒 已设为独家记忆，访客看不到':'🌍 已设为对外展示'):(e.star?'✨ 已设为镇馆之宝':'已取消镇馆之宝'))}
async function delExhibit(id){
 if(motionDeleting.has(id))return;const e=S.exhibits.find(x=>x.id===id);if(!e||!confirm(`确定要把「${e.title}」移出博物馆吗？\n删除后无法恢复哦。`))return;
 motionDeleting.add(id);const old=S.exhibits,box=$('modal').querySelector('.modal-box');
 try{S.exhibits=old.filter(x=>x.id!==id).map(x=>(x.links||[]).includes(id)?{...x,links:x.links.filter(y=>y!==id)}:x);if(!(await save())){S.exhibits=old;return}
  const cards=[...document.querySelectorAll('[data-exhibit-id]')].filter(el=>el.dataset.exhibitId===id);if(box)cards.push(box);cards.forEach(el=>el.classList.add('motion-delete','motion-active'));await motionDelay(200);
  if($('modal').querySelector('.modal-box')===box)closeModal(true);render();toast('回忆已移出博物馆');
 }finally{motionDeleting.delete(id)}
}
