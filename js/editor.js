/* =========================================================
 * editor.js · 回忆编辑器、顺藤摸瓜、收藏台（记忆唤醒 / 速记 / 待补充）与自定义出题
 * ========================================================= */

/* ---------- 自定义心情（新3.1 第3段） ---------- */
const BASE_MOODS=MOODS.filter(m=>!String(m.id).startsWith('cm'));
const CUSTOM_MOOD_PICK=['🌈','🎈','🫶','🥰','😌','🤯','😭','😤','🫠','🌙','☀️','🔥','💤','🍀','🎉','💪'];
let customMoodOpen=false;
function syncCustomMoods(all){const list=Array.isArray(S.customMoods)?S.customMoods:[];MOODS.length=0;MOODS.push(...BASE_MOODS,...list.filter(m=>all||!m.hidden))}
function customMoodBoxHTML(){
 const mine=(S.customMoods||[]).filter(m=>!m.hidden);
 return `<div class="mood-box" id="cm-box"><div class="mood-row"><input id="cm-e" maxlength="4" placeholder="🙂"><input id="cm-n" maxlength="6" placeholder="心情的名字，例如：释怀" onkeydown="if(event.key==='Enter')moodAdd33()"><button type="button" class="btn btn-primary sm" onclick="moodAdd33()">✨ 添加</button><button type="button" class="btn sm" onclick="moodToggle33()">收起</button></div><div class="mood-pick">${CUSTOM_MOOD_PICK.map(x=>`<span onclick="$('cm-e').value='${x}'">${x}</span>`).join('')}</div>${mine.length?`<div class="mood-mine"><b class="hint">我加过的：</b>${mine.map(m=>`<span>${esc(m.e)} ${esc(m.n)}<i title="收起" onclick="moodDel33('${m.id}')">✕</i></span>`).join('')}</div>`:''}<p class="hint" style="margin-top:10px">💡 加好之后，以后每段回忆都能选到它</p></div>`;
}
function moodToggle33(){edSync();customMoodOpen=!customMoodOpen;rerenderEditor();if(customMoodOpen)setTimeout(()=>{const i=$('cm-e');if(i)i.focus()},80)}
async function moodAdd33(){
 const e=val('cm-e').trim()||'💭',n=val('cm-n').trim();
 if(!n){toast('给这个心情起个名字吧 ✨');return}
 edSync();
 const b=BASE_MOODS.find(x=>x.n===n);if(b){ED.mood=b.id;customMoodOpen=false;rerenderEditor();toast('已经有「'+n+'」啦，帮你选上了');return}
 const list=Array.isArray(S.customMoods)?S.customMoods:(S.customMoods=[]);
 let m=list.find(x=>x.n===n&&x.e===e),isNew=!m;
 if(m)m.hidden=false;else{m={id:'cm'+Date.now().toString(36),e,n};list.push(m)}
 if(!(await save())){if(isNew)list.pop();return}
 syncCustomMoods(true);ED.mood=m.id;customMoodOpen=false;rerenderEditor();toast(e+' '+n+' 已加入心情');
}
async function moodDel33(id){
 const m=(S.customMoods||[]).find(x=>x.id===id);
 if(!m||!confirm(`不再显示「${m.e} ${m.n}」这个心情吗？\n已经用过它的回忆不受影响。`))return;
 edSync();m.hidden=true;if(!(await save())){m.hidden=false;return}
 rerenderEditor();toast('已收起这个心情');
}

/* ---------- 展厅多选与阶段提示（新3.1 第1～2段） ---------- */
function editorStageHint(){
 if(ED.stage){const h=stageHalls().find(h=>h.id===ED.stage);if(h)return '手动指定：'+h.name}
 const candidate={...ED,stage:''},stage=stageOf(candidate),age=memoryAge(candidate);
 if(stage)return '自动：'+stage.name+(age!==null?' · '+age+' 岁':'');
 if(memoryYear(candidate)!==null&&museumBirthYear()===null)return '填写馆主生日后可按年份自动归入，也可以手动选择。';
 return '暂时记不清也没关系，会先收在「🌫️ 某段时光」。';
}
function updateEditorStageHint(){const text=$('e-stage-hint');if(text)text.textContent=editorStageHint()}
function riverBlock31(){
 return `<div class="f31-h title-font">🌱 人生阶段 <small>（决定它流进长河的哪一段）</small></div>
 <select id="e-stage" onchange="ED.stage=this.value;updateEditorStageHint()"><option value="">✨ 自动（按日期 / 年龄判断）</option>${stageHalls().map(h=>`<option value="${h.id}" ${ED.stage===h.id?'selected':''}>${esc(h.icon)} ${esc(h.name)}</option>`).join('')}</select>
 <p class="hint" id="e-stage-hint" style="margin-top:8px">${esc(editorStageHint())}</p>
 <label class="museum-switch"><input id="e-timeline" type="checkbox" ${ED.river===true?'checked':''} onchange="ED.river=this.checked;ED._riverTouched=true"><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span>⏳ 放进时光长河 <span class="hint">（关掉也没关系，它仍在展厅里）</span></span></label>`;
}
function hallChips32(){
 const sel=[ED.hall,...extras(ED)],list=S.halls.filter(h=>!h.hidden||sel.includes(h.id));
 const chip=h=>`<span class="chip ${sel.includes(h.id)?'on':''}" onclick="hallPick32('${h.id}')">${esc(h.icon)} ${esc(h.name)}${h.id===ED.hall?'<b class="hc-main">主</b>':''}</span>`;
 const th=list.filter(h=>h.kind!=='stage'),sg=list.filter(h=>h.kind==='stage');
 return `<label class="lb">🏛️ 放进哪些展厅 <span class="hint">（可以多选，再点一下取消；带「主」的决定卡片颜色）</span></label><div class="chips">${th.map(chip).join('')}</div>${sg.length?`<p class="hint" style="margin-top:10px">🌱 阶段展厅 <span class="hint">（一般不用选，阶段在上面「🌱 人生阶段」里设置就好）</span></p><div class="chips">${sg.map(chip).join('')}</div>`:''}`;
}
function hallPick32(id){
 edSync();const ex=extras(ED);
 if(id===ED.hall){if(!ex.length){toast('至少要放进一个展厅哦');return}ED.halls=ex.slice(1);edHall(ex[0]);return}
 if(ex.includes(id))ED.halls=ex.filter(x=>x!==id);
 else{ED.halls=[...ex,id];if(hall(id).secret&&!ED.private){ED.private=true;toast('🔐 放进秘密花园的回忆，已自动设为独家')}}
 rerenderEditor();
}

/* ---------- 亲密度选择（新3.1 第4段） ---------- */
const editorIntimacyText=()=>ED.intimacy?INTIMACY_NAMES[ED.intimacy]:'还没选 · 先按中间的距离放';
function intim34(k){ED.intimacy=ED.intimacy===k?0:k;document.querySelectorAll('#e-intim span').forEach((s,i)=>s.classList.toggle('on',i<ED.intimacy));const t=$('e-intim-t');if(t)t.textContent=editorIntimacyText()}

/* ---------- 编辑器主体 ---------- */
function defaultHall(type,linkId){
 const ok=id=>{const h=hallOf(id);return h&&!h.hidden};
 if(linkId&&!['fav','travel'].includes(type)){const l=S.exhibits.find(x=>x.id===linkId);if(l&&ok(l.hall))return l.hall}
 if(ok(TYPE_HALL[type]))return TYPE_HALL[type];
 return (S.halls.find(h=>!h.hidden)||S.halls[0]).id}
function quickAdd(hid){openEditor({hall:hid||(UI.view==='hall'?UI.hall:'')})}
let PICK={};
function openTypePicker(o){PICK=o;MODAL_SOFT=true;
 openModal(`<h2 class="m-title title-font">✨ 想收藏哪一种回忆？</h2><p class="sub">不同的回忆，用不同的卡片。选错了也没关系，之后还能换。</p>${o.q?`<div class="prompt-banner" style="margin-top:14px">💭 ${esc(o.q)}</div>`:''}<div class="type-grid">${TYPE_ORDER.map(t=>{const T=TYPES[t];return `<div class="type-opt" style="--c:${T.c}" onclick="openEditor({...PICK,type:'${t}'})"><span class="t-icon">${T.icon}</span><span class="t-name title-font">${T.n}</span><span class="t-desc">${T.desc}<br>${T.ex}</span></div>`}).join('')}</div>`,true)}
function blankED(){return{type:'event',hall:'',prompt:'',title:'',date:'',timeText:'',place:'',people:'',story:'',endDate:'',country:'',companions:'',mood:null,rating:0,images:[],private:false,star:false,river:false,stage:'',links:[],relation:'friend',nickname:'',quote:'',category:'',whereNow:'',pending:false,newLinks:[]}}
function openEditor(o={}){
 if(UI.visitor)return;
 if(o.id){const e=S.exhibits.find(x=>x.id===o.id);if(!e)return;
  ED={...blankED(),...JSON.parse(JSON.stringify(e))};
  const back=S.exhibits.filter(x=>x.id!==e.id&&(x.links||[]).includes(e.id)).map(x=>x.id);
  ED.links=[...new Set([...(ED.links||[]),...back])].filter(i=>S.exhibits.some(x=>x.id===i));ED.newLinks=[];ED._open=true}
 else{if(!o.type||!TYPES[o.type]){openTypePicker(o);return}
  ED={...blankED(),type:o.type,prompt:o.q||'',title:o.title||'',links:o.link?[o.link]:[]};
  ED.hall=o.hall&&hallOf(o.hall)?o.hall:defaultHall(o.type,o.link);
  ED.river=typeof o.river==='boolean'?o.river:hall(ED.hall).kind==='stage';ED.stage=o.stage||'';
  if(hall(ED.hall).secret)ED.private=true;
  ED._open=!!o.link}
 ED0=edSnap();MODAL_SOFT=false;openModal(editorHTML(),true);
}
const privHint=()=>ED.private?'只有你自己能看到，「访客视角」下会被隐藏':'切换到「访客视角」时也能看到';
function thumbsHTML(){return ED.images.map((src,i)=>`<div class="thumb" style="background-image:url('${src}')" onclick="setCover(${i})" title="点击设为封面">${i===0?`<b>${ED.type==='person'?'头像':'封面'}</b>`:''}<i onclick="event.stopPropagation();rmImg(${i})">✕</i></div>`).join('')}
function linksHTML(){
 const a=ED.links.map(id=>{const x=S.exhibits.find(y=>y.id===id);if(!x)return '';return `<span class="link-chip">${(TYPES[x.type]||TYPES.event).icon} ${esc(x.title)}<i onclick="rmLink('${id}')">✕</i></span>`});
 const b=ED.newLinks.map((n,i)=>`<span class="link-chip">${TYPES[n.type].icon} ${esc(n.title)} <span class="hint">新建</span><i onclick="rmNewLink(${i})">✕</i></span>`);
 const all=[...a,...b].join('');return all||'<span class="hint">还没有关联</span>'}

function editorHTML(){
 syncCustomMoods(false);
 try{
  const t=ED.type,T=TYPES[t],h=hall(ED.hall),[tl,tp]=TITLE_LB[t];
  const f=(id,label,v,ph,type='text')=>`<div><label class="lb">${label}</label><input id="${id}" type="${type}" value="${esc(v)}" placeholder="${esc(ph)}"></div>`;
  const timeRow=(dl,tl2,tph)=>`<div class="row">${f('e-date',dl,ED.date,'','date')}${f('e-time',tl2,ED.timeText,tph)}</div>`;
  const tip=`<p class="hint" style="margin-top:6px">💡 日期、时间都可以不填；填了会自动算出你当时几岁、属于哪个阶段</p>`;
  let main='',whenFields='';
  if(t==='person'){
   main=`<label class="lb">💞 ta 是你的</label><div class="chips" id="e-rel">${RELS.map(r=>`<span class="chip ${ED.relation===r.id?'on':''}" data-v="${r.id}" onclick="setRel('${r.id}')"><i style="--c:${r.c}"></i>${r.n}</span>`).join('')}</div><label class="lb">💞 亲密程度 <span class="hint">（越亲密，星座图里离你越近）</span></label><div class="intim34" id="e-intim">${[1,2,3,4,5].map(k=>`<span class="${k<=(ED.intimacy||0)?'on':''}" onclick="intim34(${k})">💗</span>`).join('')}<em id="e-intim-t">${editorIntimacyText()}</em></div>`;
   whenFields=`<div class="row">${f('e-nick','🏷️ 昵称 / 外号',ED.nickname,'例如：老林')}${f('e-time','🌱 什么时候认识的',ED.timeText,'例如：初一开学那天')}</div><div class="row">${f('e-date','📅 认识的日期 <span class="hint">（知道的话）</span>',ED.date,'','date')}${f('e-place','📍 在哪里认识的',ED.place,'例如：初中教室')}</div>${f('e-quote','💬 ta 说过让你难忘的一句话',ED.quote,'例如：别怕，有我在')}`}
  else if(t==='fav'){
   main=`<label class="lb">🏷️ 属于哪一类</label><div class="chips" id="e-cat">${FAV_CATS.map(c=>`<span class="chip ${ED.category===c?'on':''}" data-v="${esc(c)}" onclick="setCat(this)">${esc(c)}</span>`).join('')}</div>`;
   whenFields=timeRow('📅 开始喜欢的日期','💗 从什么时候开始喜欢','例如：初二那年的夏天')+tip}
  else if(t==='item'){
   whenFields=timeRow('📅 得到它的日期','🕰️ 什么时候得到的','例如：十岁生日')+tip+`<div class="row">${f('e-where','📦 它现在在哪里',ED.whereNow,'例如：老家的抽屉里')}${f('e-people','👥 和谁有关',ED.people,'例如：外婆')}</div>`}
  else if(t==='travel'){
   main=`<div class="row">${f('e-place','📍 目的地城市',ED.place,'例如：京都')}${f('e-country','🌍 国家/地区',ED.country,'例如：日本')}</div>`;
   whenFields=`<div class="row">${f('e-date','🛫 出发日期',ED.date,'','date')}${f('e-end','🛬 返程日期',ED.endDate,'','date')}</div>${tip}<div class="row">${f('e-comp','🧳 和谁一起',ED.companions,'例如：大学室友 / 一个人')}${f('e-time','🕰️ 大概时间',ED.timeText,'例如：大三寒假')}</div><label class="lb">⭐ 心动指数</label><div class="rating" id="e-rating">${[1,2,3,4,5].map(n=>`<span class="${n<=(ED.rating||0)?'on':''}" onclick="setRating(${n})">★</span>`).join('')}</div>`}
  else if(t==='note'){whenFields=timeRow('📅 日期','🕰️ 大概时间','例如：大三的某个深夜')+tip}
  else{whenFields=timeRow('📅 日期','🕰️ 或者写个大概时间','例如：小学三年级的夏天')+tip+`<div class="row">${f('e-place','📍 地点',ED.place,'例如：奶奶家的院子')}${f('e-people','👥 当时身边的人',ED.people,'例如：妈妈、同桌小林')}</div>`}
  const moodHTML=t==='person'?'':`<label class="lb">🎨 这段回忆的心情</label><div class="chips" id="e-moods">${MOODS.map(m=>`<span class="chip ${ED.mood===m.id?'on':''}" data-m="${m.id}" onclick="setMood('${m.id}')">${m.e} ${m.n}</span>`).join('')}<span class="chip mood-add" onclick="moodToggle33()">＋ 自定义</span></div>${customMoodOpen?customMoodBoxHTML():''}`;
  const priv=h.secret?`<div class="prompt-banner">🔐 秘密花园里的回忆，永远只有你自己能看到</div>`:h.private?`<div class="prompt-banner">🔒「${esc(h.name)}」是独家展厅，里面的回忆访客都看不到</div>`:`<div class="seg" id="e-priv"><button type="button" class="${ED.private?'':'on'}" onclick="setPriv(false)">🌍 对外展示</button><button type="button" class="${ED.private?'on':''}" onclick="setPriv(true)">🔒 独家记忆</button></div><p class="hint" style="margin-top:8px" id="e-priv-hint">${privHint()}</p>`;
  return `<h2 class="m-title title-font">${ED.id?'✏️ 编辑回忆':'✨ 收藏一段新回忆'}</h2>
  <div class="type-pill">${T.icon} 卡片类型 <select id="e-type" onchange="edType(this.value)" style="width:auto;padding:6px 14px;border-radius:999px;font-size:13px">${TYPE_ORDER.map(x=>`<option value="${x}" ${x===t?'selected':''}>${TYPES[x].icon} ${TYPES[x].n}</option>`).join('')}</select></div>
  ${ED.prompt?`<div class="prompt-banner" style="margin-top:10px">💭 ${esc(ED.prompt)}<br><span class="hint">慢慢想，不用写得很完美。哪怕只记得一个画面，也值得被收藏。</span></div>`:''}
  ${ED.pending&&ED.id?`<div class="prompt-banner" style="margin-top:10px">⏳ 这是速记下来的回忆，补充点故事或照片吧<br><span class="hint">写了故事或加了照片，它就会离开「待补充」清单</span></div>`:''}
  ${f('e-title',tl,ED.title,tp)}
  ${main}
  <div class="f31" id="e-when"><div class="f31-h title-font">🕰️ 时间 · 地点 <small>（记得多少写多少）</small></div>${whenFields}${riverBlock31()}</div><label class="lb">${STORY_LB[t]} <span class="hint">（可以先空着）</span></label>
  <textarea id="e-story" placeholder="想到什么就写什么～ 不知道怎么开头，就点下面的小提示">${esc(ED.story)}</textarea>
  <div class="chips"><span class="hint" style="align-self:center">✍️ 点一下插入：</span>${STORY_HINTS[t].map((x,i)=>`<span class="chip" onmousedown="event.preventDefault()" onclick="insertHint(${i})">${x[0]} ${x[1].replace('：','')}</span>`).join('')}</div>
  <label class="lb">📷 照片 <span class="hint">${t==='person'?'（第一张会当作头像）':'（可多选，也可以直接拖进来；第一张是封面，点其他照片可设为封面）'}</span></label>
  <div class="photo-upload-wrap"><label class="drop" ondragover="event.preventDefault();this.style.borderColor='#ffb6e6'" ondragleave="this.style.borderColor=''" ondrop="event.preventDefault();this.style.borderColor='';addImgs(event.dataTransfer.files)">＋ 点击添加照片（相册 / 拍照）<input type="file" accept="image/*" multiple hidden onchange="addImgs(this.files);this.value=''"></label><label class="btn cam-btn">📸 直接拍照<input type="file" accept="image/*" capture="environment" hidden onchange="addImgs(this.files);this.value=''"></label></div>
  <div class="thumbs" id="e-thumbs">${thumbsHTML()}</div>
  <label class="lb">🔐 谁可以看到这段回忆？</label>${priv}
  <div class="f31"><div class="f31-h title-font">💫 更多 <small>（都可以不填）</small></div>
   ${moodHTML}
   <label class="lb">🔗 关联其他回忆 <span class="hint">（比如把「演唱会」关联到「周杰伦」和「闺蜜」，打开任意一张都能看到彼此）</span></label>
   <div class="links-box" id="e-links">${linksHTML()}</div>
   <div class="link-search"><input id="e-lq" autocomplete="off" placeholder="搜索已有的回忆，或输入名字新建（例如：周杰伦）" oninput="linkSearch()" onfocus="linkSearch()" onblur="setTimeout(hideLinkDrop,180)"><div class="link-drop" id="e-ld" style="display:none"></div></div>
   ${hallChips32()}
   <label class="star-check"><input type="checkbox" id="e-star" ${ED.star?'checked':''}> ✨ 设为「镇馆之宝」<span class="hint">（会在逛展页最上方发光展示）</span></label>
  </div>
  <div class="m-actions"><button class="btn" onclick="tryClose()">取消</button><button class="btn btn-primary" id="e-save" onclick="saveExhibit()">✨ ${ED.id?'保存修改':'收藏进博物馆'}</button></div>`;
 }finally{syncCustomMoods(true)}
}

function edSync(){
 const set=(k,id)=>{const el=$(id);if(el)ED[k]=el.value};
 [['type','e-type'],['hall','e-hall'],['title','e-title'],['date','e-date'],['timeText','e-time'],['place','e-place'],['people','e-people'],['story','e-story'],['endDate','e-end'],['country','e-country'],['companions','e-comp'],['nickname','e-nick'],['quote','e-quote'],['whereNow','e-where']].forEach(([k,id])=>set(k,id));
 if($('e-timeline'))ED.river=$('e-timeline').checked;if($('e-stage'))ED.stage=$('e-stage').value;
 if($('e-star'))ED.star=$('e-star').checked;if($('e-more'))ED._open=$('e-more').classList.contains('detail-open')}
function rerenderEditor(){const m=$('modal'),st=m.scrollTop;openModal(editorHTML(),true);m.scrollTop=st}
function edType(t){edSync();ED.type=t;rerenderEditor()}
function edHall(id){edSync();ED.hall=id;if(!ED.id&&!ED._riverTouched)ED.river=hall(id).kind==='stage';if(hall(id).secret)ED.private=true;rerenderEditor()}
function setRel(id){ED.relation=id;document.querySelectorAll('#e-rel .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===id))}
function setCat(el){const c=el.dataset.v;ED.category=ED.category===c?'':c;document.querySelectorAll('#e-cat .chip').forEach(x=>x.classList.toggle('on',x.dataset.v===ED.category))}
function setMood(id){ED.mood=ED.mood===id?null:id;document.querySelectorAll('#e-moods .chip').forEach(c=>c.classList.toggle('on',c.dataset.m===ED.mood))}
function setPriv(b){ED.private=b;document.querySelectorAll('#e-priv button').forEach((x,i)=>x.classList.toggle('on',(i===1)===b));const hn=$('e-priv-hint');if(hn)hn.textContent=privHint()}
function setRating(n){ED.rating=ED.rating===n?0:n;document.querySelectorAll('#e-rating span').forEach((s,i)=>s.classList.toggle('on',i<ED.rating))}
function insertHint(i){const t=$('e-story'),txt=STORY_HINTS[ED.type][i][1],focused=document.activeElement===t;const s=focused?t.selectionStart:t.value.length,en=focused?t.selectionEnd:s;const before=t.value.slice(0,s),pre=before&&!before.endsWith('\n')?'\n':'';t.value=before+pre+txt+t.value.slice(en);const pos=(before+pre+txt).length;t.focus();t.setSelectionRange(pos,pos)}
/* ---- 关联 ---- */
function refreshLinks(){const b=$('e-links');if(b)b.innerHTML=linksHTML()}
function hideLinkDrop(){const d=$('e-ld');if(d){d.innerHTML='';d.style.display='none'}}
function linkSearch(){
 const raw=val('e-lq').trim(),q=raw.toLowerCase(),d=$('e-ld');if(!d)return;
 const pool=S.exhibits.filter(x=>x.id!==ED.id&&!ED.links.includes(x.id));
 let list=q?pool.filter(x=>(x.title||'').toLowerCase().includes(q)||(x.nickname||'').toLowerCase().includes(q)):pool.filter(x=>x.type==='person'||x.type==='fav').sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 let html=list.slice(0,8).map(x=>`<div class="link-opt" onmousedown="event.preventDefault();addLink('${x.id}')">${(TYPES[x.type]||TYPES.event).icon} ${esc(x.title)} <span class="hint">${esc(hall(x.hall).name)}</span></div>`).join('');
 if(raw&&!S.exhibits.some(x=>x.title===raw)&&!ED.newLinks.some(n=>n.title===raw))html+=['person','fav','event','item'].map(t=>`<div class="link-opt new" onmousedown="event.preventDefault();addNewLink('${t}')">＋ 新建${TYPES[t].icon}${TYPES[t].n}卡片「${esc(raw)}」</div>`).join('');
 if(!html)html=`<div class="link-opt hint" style="cursor:default">输入名字搜索，或者新建一张卡片</div>`;
 d.innerHTML=html;d.style.display='block'}
function addLink(id){if(!ED.links.includes(id))ED.links.push(id);$('e-lq').value='';refreshLinks();hideLinkDrop()}
function addNewLink(t){const raw=val('e-lq').trim();if(!raw)return;ED.newLinks.push({type:t,title:raw});$('e-lq').value='';refreshLinks();hideLinkDrop();toast(`保存后会新建「${raw}」这张卡片 ✨`)}
function rmLink(id){ED.links=ED.links.filter(x=>x!==id);refreshLinks()}
function rmNewLink(i){ED.newLinks.splice(i,1);refreshLinks()}
/* ---- 照片 ---- */
async function addImgs(files){files=[...files].filter(f=>f.type.startsWith('image/'));if(!files.length)return;const room=12-ED.images.length;if(room<=0){toast('每段回忆最多放 12 张照片');return}toast(files.length>room?`最多还能放 ${room} 张，多出的已略过`:'📷 正在冲洗照片…');for(const f of files.slice(0,room)){try{ED.images.push(await compress(f))}catch(err){toast('有一张照片读取失败了（可能是格式不支持）')}}refreshThumbs()}
function refreshThumbs(){const t=$('e-thumbs');if(t)t.innerHTML=thumbsHTML()}
function rmImg(i){ED.images.splice(i,1);refreshThumbs()}
function setCover(i){if(!i)return;const [im]=ED.images.splice(i,1);ED.images.unshift(im);refreshThumbs();toast('已设为封面 ✨')}

/* ---------- 保存回忆（合并基础保存 + 动效粒子 + 多展厅 halls + 人物亲密度 intimacy） ---------- */
async function saveExhibit(){
 if(motionSaving)return;
 motionSaving=true;
 const point=saveButtonPoint(),button=$('e-save');
 if(button)button.disabled=true;
 try{
  const saveModalSerial=motionModalSerial;
  edSync();const title=(ED.title||'').trim();
  if(!title){toast('先给它起个名字吧 ✨');$('e-title').focus();return}
  const t=ED.type,isNew=!ED.id,h=hall(ED.hall),tr=k=>(ED[k]||'').trim();
  if(t==='travel'&&ED.date&&ED.endDate&&ED.endDate<ED.date){toast('返程日期比出发日期还早，检查一下吧');return}
  const id=ED.id||uid(),now=Date.now();
  const wantHalls=[...new Set(ED.halls||[])].filter(x=>x!==h.id&&hallOf(x));
  const e={...(S.exhibits.find(x=>x.id===id)||{}),id,type:t,hall:h.id,halls:wantHalls,title,prompt:ED.prompt||'',date:ED.date||'',timeText:tr('timeText'),place:tr('place'),people:tr('people'),story:ED.story||'',mood:ED.mood||null,images:ED.images||[],private:h.secret?true:!!ED.private,star:!!ED.star,river:ED.river===true,stage:ED.stage||'',createdAt:ED.createdAt||now,updatedAt:now};
  e.pending=!!ED.pending&&!e.story.trim()&&!e.images.length;
  if(t==='person'){
   e.relation=ED.relation||'friend';e.nickname=tr('nickname');e.quote=tr('quote');
   const k=+ED.intimacy||0;if(k)e.intimacy=k;else delete e.intimacy;
  }
  if(t==='fav')e.category=ED.category||'';
  if(t==='item')e.whereNow=tr('whereNow');
  if(t==='travel'){e.endDate=ED.endDate||'';e.country=tr('country');e.companions=tr('companions');e.rating=ED.rating||0}
  const favOk=hallOf('fav')&&!hallOf('fav').hidden;
  const created=(ED.newLinks||[]).map((n,i)=>{const c={id:uid()+i,type:n.type,hall:n.type==='fav'&&favOk?'fav':h.id,title:n.title,prompt:'',date:'',timeText:'',place:'',people:'',story:'',mood:null,images:[],private:e.private,star:false,river:hall(n.type==='fav'&&favOk?'fav':h.id).kind==='stage',stage:'',pending:true,links:[id],createdAt:now,updatedAt:now};if(n.type==='person')Object.assign(c,{relation:'friend',nickname:'',quote:''});return c});
  const links=[...new Set([...(ED.links||[]).filter(x=>S.exhibits.some(y=>y.id===x)),...created.map(c=>c.id)])];
  e.links=links;
  let list=isNew?[...S.exhibits,e]:S.exhibits.map(x=>x.id===id?e:x);
  list=[...list,...created].map(x=>{if(x.id===id)return x;const cur=x.links||[],has=cur.includes(id),want=links.includes(x.id);if(want&&!has)return{...x,links:[...cur,id]};if(!want&&has)return{...x,links:cur.filter(y=>y!==id)};return x});
  const old=S.exhibits;S.exhibits=list;
  if(!(await save())){S.exhibits=old;return}
  if(saveModalSerial===motionModalSerial){
   MODAL_SOFT=true;render();
   if(isNew)openFollow(id,true);else{closeModal();toast('✨ 回忆已更新'+(created.length?`，并新建了 ${created.length} 张卡片`:''))}
  }else render();
  motionSaveParticles(point);
  if(isNew)toast('✨ 已收藏进博物馆');
 }finally{
  motionSaving=false;if(button&&button.isConnected)button.disabled=false;
 }
}

/* ---------- 顺藤摸瓜、收藏台、自己出题 ---------- */
function openFollow(id,fresh){
 const e=S.exhibits.find(x=>x.id===id);if(!e)return;
 const opts=FOLLOW[e.type]||FOLLOW.event,cnt=answerCount();
 const next=promptsOf(e.hall).filter(p=>!cnt[p.q]&&p.q!==e.prompt)[0];UI.followNext=next||null;
 const pend=S.exhibits.filter(x=>x.pending&&x.id!==id&&(x.links||[]).includes(id));
 MODAL_SOFT=true;
 openModal(`<div style="text-align:center"><div class="orb float" style="width:90px;height:90px;font-size:42px">🧶</div><h2 class="m-title title-font">${fresh?`✨「${esc(e.title)}」已入馆收藏`:'🧶 顺着这段，继续回忆'}</h2><p class="sub">回忆就像毛线团，拉住一头，就能牵出更多。要不要顺着继续？</p></div>
 ${pend.map(p=>`<div class="follow-opt" onclick="openEditor({id:'${p.id}'})"><b>⏳</b><span>补充一下「${esc(p.title)}」<br><span class="hint">刚刚新建的${TYPES[p.type].n}卡片，还空着呢</span></span></div>`).join('')}
 ${opts.map(([t,ic,q])=>`<div class="follow-opt" onclick="openEditor({type:'${t}',link:'${id}'})"><b>${ic}</b><span>${q}<br><span class="hint">会新建一张${TYPES[t].n}卡片，并自动和「${esc(e.title)}」关联</span></span></div>`).join('')}
 ${next?`<div class="follow-opt" onclick="openEditor({hall:UI.followNext.hall,type:UI.followNext.type,q:UI.followNext.q})"><b>💭</b><span>${esc(next.q)}<br><span class="hint">「${esc(hall(e.hall).name)}」里的下一个灵感</span></span></div>`:''}
 <div class="m-actions"><button class="btn" onclick="go('studio')">🎴 去记忆唤醒</button><button class="btn btn-primary" onclick="closeModal()">先到这里 ✨</button></div>`);
}

/* ============ 收藏台：记忆唤醒 / 速记 / 待补充 ============ */
function pickAwaken(){const cnt=answerCount();let pool=allPrompts().filter(p=>!cnt[p.q]);if(UI.awHall!=='all')pool=pool.filter(p=>p.hall===UI.awHall);if(!pool.length)return null;let c,n=0;do{c=pool[Math.floor(Math.random()*pool.length)];n++}while(pool.length>1&&UI.aw&&c.q===UI.aw.q&&n<20);return c}
function nextAwaken(){UI.aw=pickAwaken();render()}
function setAwHall(id){UI.awHall=id;UI.aw=null;render()}
function writeAwaken(){const a=UI.aw;if(a)openEditor({hall:a.hall,type:a.type,q:a.q})}
async function hideAwaken(){const a=UI.aw;if(!a)return;if(!S.hiddenPrompts.includes(a.q))S.hiddenPrompts.push(a.q);await save();UI.aw=pickAwaken();render();toast('🙈 已隐藏，可以在「⚙️ 我的」里恢复')}
function renderStudio(){
 const cnt=answerCount(),halls=S.halls.filter(h=>!h.hidden);
 if(UI.awHall!=='all'&&!halls.some(h=>h.id===UI.awHall))UI.awHall='all';
 const a0=UI.aw;
 if(!a0||cnt[a0.q]||S.hiddenPrompts.includes(a0.q)||!hallOf(a0.hall)||(UI.awHall!=='all'&&a0.hall!==UI.awHall))UI.aw=pickAwaken();
 const a=UI.aw,h=a?hall(a.hall):null,T=a?TYPES[a.type]:null;
 const pend=S.exhibits.filter(e=>e.pending).sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0));
 const chips=[{id:'all',icon:'🌌',name:'全部'},...halls].map(x=>`<span class="chip ${UI.awHall===x.id?'on':''}" onclick="setAwHall('${x.id}')">${esc(x.icon)} ${esc(x.name)}</span>`).join('');
 const card=a?`<div class="aw-card" style="--g1:${h.g[0]};--g2:${h.g[1]}"><div class="aw-icon">${esc(h.icon)}</div><div class="aw-tag">${esc(h.name)} · ${T.icon} ${T.n}</div><div class="aw-q title-font">${esc(a.q)}</div><p class="hint">闭上眼睛想一想，哪怕只记得一个画面也很好</p><div class="btn-row" style="justify-content:center;margin-top:22px"><button class="btn btn-primary" onclick="writeAwaken()">✍️ 写下这段回忆</button><button class="btn" onclick="nextAwaken()">🔄 换一个</button><button class="btn" onclick="hideAwaken()">🙈 不适合我</button></div></div>`
  :`<div class="aw-card"><div class="aw-icon">🎉</div><div class="aw-q title-font">${UI.awHall==='all'?'灵感库里的问题都写过啦！':'这个展厅的灵感都写过啦'}</div><p class="sub">去展厅里「✍️ 出一道自己的题」，或者直接自由收藏吧 ✨</p>${UI.awHall!=='all'?`<div class="btn-row" style="justify-content:center"><button class="btn btn-primary" onclick="setAwHall('all')">看看其他展厅</button></div>`:''}</div>`;
 return `<div class="wrap"><div class="hero"><p class="eyebrow">MEMORY STUDIO</p><h1 class="title-font glow">✍️ 收藏台</h1><p class="sub">你已经收藏了 <b>${S.exhibits.length}</b> 段回忆 · 想到什么，就从这里开始</p></div>
 <div class="studio">
  <div class="panel glass"><h2 class="title-font">💫 记忆唤醒</h2><p class="sub" style="font-size:13px">我来提问，你来回忆。想不起来就换一个，没关系～</p><div class="chips">${chips}</div>${card}</div>
  <div>
   <div class="panel glass"><h2 class="title-font">＋ 收藏一段回忆</h2><p class="sub" style="font-size:13px">已经想好要写什么？直接选卡片类型</p><div class="mini-types">${TYPE_ORDER.map(t=>`<div class="mini-type" style="--c:${TYPES[t].c}" onclick="openEditor({type:'${t}'})"><b>${TYPES[t].icon}</b>${TYPES[t].n}</div>`).join('')}</div></div>
   <div class="panel glass" style="margin-top:22px"><h2 class="title-font">⚡ 30 秒速记</h2><p class="sub" style="font-size:13px">突然想起什么？先记个名字，之后慢慢补充</p><div class="quick"><input id="q-title" placeholder="例如：初中门口的炸串摊" onkeydown="if(event.key==='Enter')quickSave()"><select id="q-type">${TYPE_ORDER.map(t=>`<option value="${t}" ${t===(UI.qType||'event')?'selected':''}>${TYPES[t].icon} ${TYPES[t].n}</option>`).join('')}</select><button class="btn btn-primary" onclick="quickSave()">存一下</button></div></div>
   <div class="panel glass" style="margin-top:22px"><h2 class="title-font">⏳ 待补充 <span class="hint">（${pend.length}）</span></h2>${pend.length?pend.slice(0,15).map(e=>`<div class="pending" onclick="openEditor({id:'${e.id}'})"><span class="pi">${(TYPES[e.type]||TYPES.event).icon}</span><span class="pt">${esc(e.title)}<small>${esc(hall(e.hall).name)} · 点击补充细节</small></span><button class="icon-btn" title="不用补充了" onclick="event.stopPropagation();donePending('${e.id}')">✓ 不用了</button></div>`).join(''):'<p class="sub" style="font-size:13px;margin-top:8px">暂时没有需要补充的回忆 ✨</p>'}</div>
  </div>
 </div></div>`}
async function quickSave(){
 const title=val('q-title').trim(),t=val('q-type')||'event';UI.qType=t;
 if(!title){toast('写个名字就能存 ✨');return}
 const h=hall(defaultHall(t)),now=Date.now();
 const e={id:uid(),type:t,hall:h.id,title,prompt:'',date:'',timeText:'',place:'',people:'',story:'',mood:null,images:[],private:!!h.secret,star:false,river:h.kind==='stage',stage:'',pending:true,links:[],createdAt:now,updatedAt:now};
 if(t==='person')Object.assign(e,{relation:'friend',nickname:'',quote:''});
 const old=S.exhibits;S.exhibits=[...old,e];if(!(await save())){S.exhibits=old;return}
 render();toast(`⚡「${title}」已存进待补充`);setTimeout(()=>{const q=$('q-title');if(q)q.focus()},50)}
async function donePending(id){const e=S.exhibits.find(x=>x.id===id);if(!e)return;e.pending=false;await save();render();toast('✓ 已移出待补充清单')}

/* ============ 自己出题 ============ */
function openAddPrompt(hid){
 const h=hall(hid);MODAL_SOFT=true;
 openModal(`<h2 class="m-title title-font">✍️ 给「${esc(h.name)}」出一道题</h2><p class="sub">想记录、但灵感库里没有的，都可以自己出题。比如「我追星的那些年」「第一次养猫」。</p>
 <label class="lb">你的问题</label><input id="np-q" placeholder="例如：我追过的第一个偶像是谁？" onkeydown="if(event.key==='Enter')saveCustomPrompt('${hid}')">
 <label class="lb">回答它的时候，用哪种卡片？</label><select id="np-t">${TYPE_ORDER.map(t=>`<option value="${t}" ${t===(HALL_TYPE[hid]||'event')?'selected':''}>${TYPES[t].icon} ${TYPES[t].n}</option>`).join('')}</select>
 <div class="m-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveCustomPrompt('${hid}')">✨ 加入灵感库</button></div>`);
 setTimeout(()=>{const i=$('np-q');if(i)i.focus()},300)}
async function saveCustomPrompt(hid){
 const q=val('np-q').trim();if(!q){toast('先写下你的问题吧');return}
 if(promptsOf(hid,true).some(p=>p.q===q)){toast('这个问题已经在灵感库里了');return}
 S.customPrompts.push({id:uid(),hall:hid,q,type:val('np-t')});S.hiddenPrompts=S.hiddenPrompts.filter(x=>x!==q);
 await save();closeModal();render();toast('✨ 已加入灵感库')}
