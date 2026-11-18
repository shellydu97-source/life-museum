/* =========================================================
 * timeline.js · 时光长河（发光的河 + 阶段条 + 「时间之外」星球）
 * ========================================================= */

function motionTimelineModel(){
 const visible=visibleExhibits(),main=visible.filter(e=>e.river===true),age=museumCurrentAge(),birth=museumBirthYear();
 /* “隐藏展厅”仅从导览收起；人生阶段仍保留，私人阶段在访客模式下除外。 */
 const stages=stageHalls().filter(h=>!(UI.visitor&&hallLocked(h))).map(h=>{
  const items=main.filter(e=>{const stage=stageOf(e);return stage&&stage.id===h.id}).sort(memorySort);
  const current=age!==null&&(h.id==='origin'?age<0:age>=h.ageFrom&&age<h.ageTo);
  return {hall:h,id:h.id,min:h.ageFrom,max:h.ageTo,age:h.id==='origin'?'出生前—出生':`${h.ageFrom}—${h.ageTo} 岁`,items,current,
   future:age!==null&&h.ageFrom>age&&items.length===0,
   yearRange:birth===null?'':h.id==='origin'?`${birth} · 出生`:`${birth+h.ageFrom}—${birth+h.ageTo}`};
 });
 const themes=themeHalls(true).map(h=>({hall:h,items:visible.filter(e=>inHall(e,h.id)).sort(memorySort)}));
 const unknown=main.filter(e=>stageOf(e)===null).sort(memorySort);
 if(UI.openStage==='unknown'){if(!unknown.length)UI.openStage=null}
 else if(UI.openStage&&!stages.some(s=>s.id===UI.openStage&&!s.future))UI.openStage=null;
 if(UI.openTheme&&!themes.some(g=>g.hall.id===UI.openTheme))UI.openTheme=null;
 return {stages,themes,unknown,main,selected:main,age,birthYear:birth};
}

function motionTimelineItems(items){
 const records=[...items].sort(memorySort),groups=new Map();records.forEach(e=>{const year=memoryYear(e);if(!groups.has(year))groups.set(year,[]);groups.get(year).push(e)});
 const count=records.length+groups.size,gap=Math.min(70,Math.floor(600/Math.max(1,count-1)));let step=0,cardIndex=0,html='';
 for(const [year,group]of groups){const age=year===null||museumBirthYear()===null?null:year-museumBirthYear(),label=year===null?'🌫️ 这段时光里，记不清哪年':String(year)+(age===null?'':age<0?' · 出生前 '+(-age)+' 年':' · '+age+' 岁');
  html+=`<div class="tl-year stage-year" style="--item-delay:${step++*gap}ms"><span>${label}</span></div>`;
  for(const e of group){
   const h=hall(e.hall),T=TYPES[e.type]||TYPES.event,meta=metaLine(e),thematic=h.kind==='theme';
   const rvOut=UI.visitor?'':`<button type="button" class="rv-out" title="移出长河（回忆不会删除）" onclick="event.stopPropagation();riverToggle31('${e.id}',true)">🌊 移出</button>`;
   html+=`<div class="tl-item stage-memory ${cardIndex++%2?'right':'left'}" style="--item-delay:${step++*gap}ms"><div class="tl-dot stage-node" aria-hidden="true" style="color:${h.g[1]};background:${h.g[1]}"></div><div class="tl-card glass tilt ${e.star?'star':''}" data-exhibit-id="${esc(e.id)}" role="button" tabindex="0" onclick="openExhibit('${e.id}')"><div class="tl-thumb" style="${thumbStyle(e)}">${thumbIcon(e)}</div><div class="tl-info"><div class="tl-hall">${T.icon} ${T.n} ${thematic?`<span class="source-hall">来自 ${esc(h.icon)} ${esc(h.name)}</span>`:' · '+esc(h.name)}${e.private&&!UI.visitor?' · 🔒':''}${e.star?' · ✨':''}</div><h4>${esc(e.title)}</h4>${meta?`<p class="ex-meta">${esc(meta)}</p>`:''}</div>${rvOut}</div></div>`}
 }return html;
}

function rvShort(h){return String(h.name||'').split('·')[0].trim().replace(/馆$/,'')||h.name}
function rvStageHTML(s,i,unknown){
 const h=unknown?{id:'unknown',name:'某段时光',icon:'🌫️',g:['#b9b0d6','#6f6797']}:s.hall,id=h.id,open=UI.openStage===id,items=s.items;
 const birth=museumBirthYear(),last=!unknown&&h.ageTo>=200;
 const age=unknown?'记不清在哪个阶段':id==='origin'?'出生':last?h.ageFrom+' 岁以后':h.ageFrom+'–'+h.ageTo+' 岁';
 const yr=unknown||birth===null?'':id==='origin'?String(birth):last?(birth+h.ageFrom)+' 以后':(birth+h.ageFrom)+'–'+(birth+h.ageTo);
 const cls=['motion-stage','rv-stage',open?'stage-open':'',s.current?'stage-current':'',s.future?'stage-future':''].join(' ');
 const thumbs=items.slice(0,3).map(e=>`<i style="${thumbStyle(e)}">${thumbIcon(e)}</i>`).join('');
 const body=items.length?`<div class="tl stage-flow">${motionTimelineItems(items)}</div>`:`<div class="stage-empty empty-state"><div class="empty-icon">🌫️</div>这里还空着，等你想起${UI.visitor?'':`<div class="btn-row center"><button class="btn btn-primary" onclick="openEditor({type:'event',hall:'${id}',river:true})">✍️ 去写一段</button></div>`}</div>`;
 const count=s.future?'🔒 还未抵达':items.length?items.length+' 段':'还空着';
 return `<section class="${cls}" data-stage="${id}" style="--g1:${h.g[0]};--g2:${h.g[1]};--d:${i*70}ms"><div class="stage-row"><span class="rv-node">${esc(h.icon)}</span><button type="button" class="stage-head rv-card glass" aria-expanded="${open}" onclick="toggleMotionStage('${id}',this)"><span class="rv-name title-font">${esc(unknown?h.name:rvShort(h))}</span><span class="rv-age">${age}${yr?' · '+yr:''}</span><span class="rv-count">${count}</span>${s.current?'<span class="rv-here">✨ 你在这里</span>':''}<span class="rv-end"><span class="rv-thumbs">${thumbs}</span><span class="stage-arrow">⌄</span></span></button></div><div class="stage-panel" aria-hidden="${!open}" ${open?'':'inert'}><div class="stage-panel-inner">${body}</div></div></section>`;
}
function rvThemeBody(id){
 return withHall(id,()=>{
  const h=hallOf(id);if(!h)return '';
  const items=visibleExhibits().filter(e=>e.hall===id).sort(memorySort);
  const grid=items.length?`<div class="ex-grid theme-grid ${id==='travel'?'postcards':''}">${items.map((e,i)=>`<div class="theme-reveal" style="--enter-delay:${Math.min(i,11)*40}ms">${cardHTML(e)}</div>`).join('')}</div>`:`<div class="stage-empty empty-state"><div class="empty-icon">${esc(h.icon)}</div>这个展厅还空空的${UI.visitor?'':`<div class="btn-row center"><button class="btn btn-primary" onclick="quickAdd('${id}')">✍️ 去写一段</button></div>`}</div>`;
  return `<div class="rv-phead glass"><span style="font-size:34px">${esc(h.icon)}</span><div><h3 class="title-font">${esc(h.name)}</h3><p class="hint">${esc(h.desc||'')} · ${items.length} 段回忆</p></div><button class="btn sm hall-enter" onclick="go('hall','${id}')">进入展厅 <span class="enter-arrow">→</span></button></div><div class="theme-content">${grid}</div>`;
 });
}
function rvPlanet(id){
 const sec=$('rv-psec'),panel=$('rv-ppanel'),body=$('rv-pbody');if(!sec)return;
 const next=UI.openTheme===id?null:id;UI.openTheme=next;
 document.querySelectorAll('.rv-planet').forEach(b=>b.classList.toggle('on',b.dataset.pid===next));
 if(next){body.innerHTML=rvThemeBody(next);prepareInteractiveElements(body)}
 panel.style.setProperty('--fold-duration',(next?450:250)+'ms');
 sec.classList.toggle('theme-open',!!next);panel.inert=!next;panel.setAttribute('aria-hidden',String(!next));
 if(next)setTimeout(()=>sec.scrollIntoView({block:'nearest',behavior:motionCalm()?'instant':'smooth'}),150);
}
function toggleMotionStage(id,button){
 const row=button.closest('.motion-stage');if(row.classList.contains('stage-future')){motionOnce(row,'shake',480);toast('还没走到这里哦');return}
 const next=UI.openStage===id?null:id;UI.openStage=next;
 $('motion-stages').querySelectorAll('.motion-stage').forEach(section=>{const open=section.dataset.stage===next;if(section.classList.contains('stage-open')!==open)animateMotionFold(section,open,'stage',open?button:null)});
}
async function riverToggle31(id,fromRiver){
 const e=S.exhibits.find(x=>x.id===id);if(!e)return;
 e.river=!e.river;if(!(await save())){e.river=!e.river;return}
 render();if(!fromRiver)openExhibit(id);
 const s=stageOf(e);
 toast(e.river?`⏳ 已放进长河 · ${s?s.name:'某段时光'}`:`🌊 已移出长河，回忆还在「${hall(e.hall).name}」里`);
}
function renderTimeline(){
 const m=motionTimelineModel(),ot=UI.openTheme,lit=m.stages.filter(s=>s.items.length).length;
 const planets=m.themes.map((g,i)=>{const h=g.hall,n=g.items.length;return `<button type="button" class="rv-planet ${ot===h.id?'on':''} ${n?'':'empty'}" data-pid="${esc(h.id)}" style="--g1:${h.g[0]};--g2:${h.g[1]};--d:${i*50}ms" onclick="rvPlanet('${h.id}')"><span class="rv-fl" style="--fd:${-(i%5)*0.9}s"><span class="rv-orb">${esc(h.icon)}${n?`<b>${n}</b>`:''}</span></span><span class="rv-pname title-font">${esc(h.name)}</span></button>`}).join('');
 return `<div class="wrap motion-timeline rv"><span class="back" onclick="go('explore')">← 返回逛展</span><div class="hero"><p class="eyebrow">RIVER OF TIME</p><h1 class="title-font glow">⏳ 时光长河</h1><p class="sub">沿着时间，重新走一遍自己的人生</p><p class="hint" style="margin-top:6px">${m.main.length} 段回忆流进了长河 · 点亮了 ${lit} 个人生阶段</p></div>
 <div class="rv-river" id="motion-stages"><i class="rv-line"></i>${m.stages.map((s,i)=>rvStageHTML(s,i)).join('')}${m.unknown.length?rvStageHTML({items:m.unknown},m.stages.length,true):''}</div>
 <h2 class="section-title title-font" style="justify-content:center">🌫️ 时间之外</h2><p class="sub" style="text-align:center">不按时间排列的记忆，像星球一样各自发光 · 点一颗看看</p>
 <div class="rv-planets">${planets}</div>
 <section class="rv-psec ${ot?'theme-open':''}" id="rv-psec"><div class="theme-panel" id="rv-ppanel" aria-hidden="${!ot}" ${ot?'':'inert'}><div class="stage-panel-inner" id="rv-pbody">${ot?rvThemeBody(ot):''}</div></div></section></div>`;
}
