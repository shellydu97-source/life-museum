/* =========================================================
 * me.js · 「我的」页面、展厅管理、备份导入导出、外观主题与全馆搜索
 * ========================================================= */

/* ---------- 外观与头像控制器（2.2） ---------- */
const museumImageURL=value=>typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
const museumUIEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalizeMuseumUI(value){
 const a=value&&typeof value==='object'?value:{};
 const finite=(value,fallback,min,max)=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?fallback:Math.min(max,Math.max(min,Number(value)));
 return {...a,preset:Object.hasOwn(MUSEUM_PRESETS,a.preset)?a.preset:'dream',bg:museumImageURL(a.bg)?a.bg:'',bgDim:finite(a.bgDim,.45,0,.8),bgBlur:finite(a.bgBlur,0,0,12),stars:a.stars!==false};
}
function appearanceHTML(){
 const ui=normalizeMuseumUI(S.ui);
 return `<section class="me-sec glass" id="museum-appearance"><h2 class="title-font">🎨 外观</h2><p class="hint">选一片喜欢的星空，改变会即时生效并保存。</p>
 <label class="lb">预设主题</label><div class="chips appearance-themes">${Object.entries(MUSEUM_PRESETS).map(([id,p])=>`<button type="button" class="chip ${ui.preset===id?'on':''}" data-museum-preset="${id}" aria-pressed="${ui.preset===id}" onclick="configureMuseumUI('preset','${id}')"><span class="theme-swatch" style="background:${p.background}" aria-hidden="true"></span>${p.name}</button>`).join('')}</div>
 <label class="lb">自定义背景图 <span class="hint">（保存在当前浏览器）</span></label><div class="btn-row"><label class="btn">📷 上传背景图<input id="museum-background-file" type="file" accept="image/*" hidden onchange="uploadMuseumBackground(this)"></label><button type="button" class="btn" id="museum-background-clear" ${ui.bg?'':'disabled'} onclick="clearMuseumBackground()">移除背景图</button></div><p class="hint" id="museum-background-status" role="status" style="margin-top:10px">${ui.bg?'已使用背景照片':'正在使用主题渐变背景'}</p>
 <div class="row appearance-ranges"><div><label class="lb" for="museum-bg-dim">背景遮罩明暗 <output id="museum-bg-dim-value">${Math.round(ui.bgDim*100)}%</output></label><input id="museum-bg-dim" type="range" min="0" max="0.8" step="0.01" value="${ui.bgDim}" oninput="configureMuseumUI('bgDim',this.value)"><p class="hint">向右更暗，照片上的文字更清楚。</p></div><div><label class="lb" for="museum-bg-blur">背景模糊 <output id="museum-bg-blur-value">${ui.bgBlur}px</output></label><input id="museum-bg-blur" type="range" min="0" max="12" step="1" value="${ui.bgBlur}" oninput="configureMuseumUI('bgBlur',this.value)"></div></div>
 <label class="museum-switch appearance-stars"><input id="museum-stars" type="checkbox" ${ui.stars?'checked':''} onchange="configureMuseumUI('stars',this.checked)"><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span>✨ 星空特效</span></label></section>`;
}
let museumUIBackgroundKey='',museumUIBackgroundRevision=0,museumUIBackgroundTimer=0,museumUIBackgroundFrames=[],museumUISaveRevision=0,museumUISaveQueue=Promise.resolve(),museumUICommitted=null,museumUIEpoch=0;
function applyMuseumUI(value,animate=true){
 const ui=normalizeMuseumUI(value),preset=MUSEUM_PRESETS[ui.preset],calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(museumUICommitted===null||!animate){museumUICommitted={...ui};if(!animate){museumUIEpoch++;museumUISaveRevision++}}
 const rootStyle=document.documentElement.style;
 const vars={'--museum-bg':preset.background,'--accent':preset.accent,'--accent2':preset.accent2,'--glass':preset.glass,'--glass-b':preset.glassB,'--text':preset.text,'--sub':preset.sub,'--gold':preset.gold,'--museum-surface':preset.surface,'--museum-nav':preset.nav,'--button-a':preset.buttonA,'--button-b':preset.buttonB,'--button-c':preset.buttonC,'--button-hover-a':preset.buttonHoverA||preset.buttonA,'--button-hover-b':preset.buttonHoverB||preset.buttonB,'--button-hover-c':preset.buttonHoverC||preset.buttonC,'--button-text':preset.buttonText};
 Object.entries(vars).forEach(([key,value])=>rootStyle.setProperty(key,value));
 document.documentElement.dataset.museumPreset=ui.preset;
 let root=document.getElementById('museum-background');
 if(!root){root=document.createElement('div');root.id='museum-background';root.className='museum-background';root.setAttribute('aria-hidden','true');const stack=document.createElement('div');stack.id='museum-bg-stack';stack.className='museum-bg-stack';const shade=document.createElement('div');shade.id='museum-bg-shade';shade.className='museum-bg-dim';root.append(stack,shade);document.body.insertBefore(root,document.body.firstChild)}
 const stack=document.getElementById('museum-bg-stack'),shade=document.getElementById('museum-bg-shade');
 if(!animate)root.classList.add('ui-instant');
 stack.style.filter=`blur(${ui.bg?ui.bgBlur:0}px)`;shade.style.opacity=ui.bg?String(ui.bgDim):'0';
 const key=ui.preset+'|'+ui.bg;
 if(key!==museumUIBackgroundKey||!stack.childElementCount){
  museumUIBackgroundKey=key;const revision=++museumUIBackgroundRevision;
  clearTimeout(museumUIBackgroundTimer);museumUIBackgroundFrames.forEach(cancelAnimationFrame);museumUIBackgroundFrames=[];
  const layer=document.createElement('div');layer.className='museum-bg-layer';layer.style.backgroundImage=ui.bg?`url("${ui.bg}")`:preset.background;
  if(!animate||calm||!stack.childElementCount){layer.classList.add('is-visible');stack.replaceChildren(layer)}
  else{stack.appendChild(layer);layer.classList.add('motion-active');museumUIBackgroundFrames.push(requestAnimationFrame(()=>{if(revision!==museumUIBackgroundRevision)return;museumUIBackgroundFrames.push(requestAnimationFrame(()=>{if(revision!==museumUIBackgroundRevision)return;layer.classList.add('is-visible');museumUIBackgroundTimer=setTimeout(()=>{if(revision!==museumUIBackgroundRevision)return;for(const old of [...stack.children])if(old!==layer)old.remove();layer.classList.remove('motion-active');museumUIBackgroundFrames=[]},620)}))}))}
 }
 if(!animate)requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('ui-instant')));
 if(window.museumSky){if(window.museumSky.setPalette)window.museumSky.setPalette(preset.palette);window.museumSky.setEnabled(ui.stars)}
 updateMuseumUIControls(ui);
}
function updateMuseumUIControls(value){
 const ui=normalizeMuseumUI(value);
 document.querySelectorAll('[data-museum-preset]').forEach(button=>{const on=button.dataset.museumPreset===ui.preset;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on))});
 const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
 set('museum-bg-dim-value',Math.round(ui.bgDim*100)+'%');set('museum-bg-blur-value',ui.bgBlur+'px');set('museum-background-status',ui.bg?'已使用背景照片':'正在使用主题渐变背景');
 const dimInput=document.getElementById('museum-bg-dim'),blur=document.getElementById('museum-bg-blur'),stars=document.getElementById('museum-stars'),clear=document.getElementById('museum-background-clear');
 if(dimInput)dimInput.value=ui.bgDim;if(blur)blur.value=ui.bgBlur;if(stars)stars.checked=ui.stars;if(clear)clear.disabled=!ui.bg;
}
function configureMuseumUI(key,value){
 if(!['preset','bg','bgDim','bgBlur','stars'].includes(key))return Promise.resolve(false);
 const previous=normalizeMuseumUI(S.ui),next=normalizeMuseumUI({...previous,[key]:value}),revision=++museumUISaveRevision,epoch=museumUIEpoch;
 S.ui=next;applyMuseumUI(next,true);
 museumUISaveQueue=museumUISaveQueue.catch(()=>false).then(async()=>{
  if(revision!==museumUISaveRevision||epoch!==museumUIEpoch)return true;
  const snapshot=normalizeMuseumUI(S.ui);let ok=false;
  try{ok=await save()}catch(error){toast('外观暂时未能保存，请稍后再试')}
  if(epoch!==museumUIEpoch)return ok;
  if(ok)museumUICommitted={...snapshot};else if(revision===museumUISaveRevision){S.ui={...(museumUICommitted||previous)};applyMuseumUI(S.ui,true)}
  return ok;
 });return museumUISaveQueue;
}
async function uploadMuseumBackground(input){
 const file=input.files&&input.files[0];input.value='';if(!file)return;
 if(!file.type.startsWith('image/')){toast('请选择一张图片');return}
 if(file.size>20*1024*1024){toast('请选一张 20MB 以内的背景图');return}
 const status=document.getElementById('museum-background-status');if(status)status.textContent='正在准备背景照片…';
 try{const image=await compress(file,1920,.8);if(!museumImageURL(image)){toast('这张图片暂时无法使用');updateMuseumUIControls(S.ui);return}if(await configureMuseumUI('bg',image))toast('✨ 背景图已保存')}
 catch(error){updateMuseumUIControls(S.ui);toast('图片没能读取，换一张试试')}
}
function clearMuseumBackground(){return configureMuseumUI('bg','')}

/* 图片头像和 emoji 都沿用 profile.avatar，不增加第二套头像存储。 */
function avatarHTML(avatar,cls=''){
 const className=String(cls).replace(/[^a-zA-Z0-9 _-]/g,'');
 if(museumImageURL(avatar))return `<img class="museum-avatar-photo ${className}" src="${avatar}" alt="馆主头像" draggable="false">`;
 const emoji=typeof avatar==='string'&&avatar&&!avatar.startsWith('data:')&&avatar.length<40?avatar:'🌙';return museumUIEscape(emoji);
}
function avatarPickerHTML(current){
 const selected=current||'🌙';
 return `<div class="museum-avatar-picker" data-avatar-picker><div class="museum-avatar-preview orb" id="museum-avatar-preview">${avatarHTML(selected)}</div><div class="avatars">${MUSEUM_AVATAR_EMOJIS.map(a=>`<button type="button" class="av ${selected===a?'on':''}" data-museum-avatar="${a}" aria-pressed="${selected===a}" aria-label="选择 ${a} 头像" onclick="pickMuseumAvatar(this,'${a}')">${a}</button>`).join('')}</div><div class="btn-row"><label class="btn">📷 上传照片<input type="file" accept="image/*" hidden onchange="uploadMuseumAvatar(this)"></label><span class="hint" style="align-self:center">照片会压缩并显示为圆形</span></div></div>`;
}
let museumAvatarRevision=0;
function updateMuseumAvatarPicker(){
 const root=document.querySelector('[data-avatar-picker]');if(!root)return;
 root.querySelectorAll('[data-museum-avatar]').forEach(button=>{const on=button.dataset.museumAvatar===SETUP_AV;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on))});
 const preview=root.querySelector('#museum-avatar-preview');if(preview)preview.innerHTML=avatarHTML(SETUP_AV);
}
function pickMuseumAvatar(el,avatar){museumAvatarRevision++;SETUP_AV=avatar;updateMuseumAvatarPicker()}
async function uploadMuseumAvatar(input){
 const file=input.files&&input.files[0],root=input.closest('[data-avatar-picker]'),revision=++museumAvatarRevision;input.value='';if(!file)return;
 if(!file.type.startsWith('image/')){toast('请选择一张头像照片');return}
 if(file.size>20*1024*1024){toast('请选一张 20MB 以内的头像照片');return}
 try{const avatar=await compress(file,300,.85);if(revision!==museumAvatarRevision||!root||!root.isConnected)return;if(!museumImageURL(avatar)){toast('这张照片暂时无法使用');return}SETUP_AV=avatar;updateMuseumAvatarPicker();toast('✨ 头像已选好，记得保存馆主信息')}
 catch(error){if(revision===museumAvatarRevision)toast('头像没能读取，换一张试试')}
}
const museumAvatarImageCache=new Map();
function getMuseumAvatarImage(avatar,onload){
 if(!museumImageURL(avatar))return null;
 let entry=museumAvatarImageCache.get(avatar);
 if(!entry){const image=new Image();entry={image,callbacks:new Set(),failed:false};museumAvatarImageCache.set(avatar,entry);image.onload=()=>{for(const callback of entry.callbacks){try{callback()}catch(error){}}entry.callbacks.clear()};image.onerror=()=>{entry.failed=true;entry.callbacks.clear()};image.src=avatar;if(museumAvatarImageCache.size>8){const oldest=museumAvatarImageCache.keys().next().value;if(oldest!==avatar)museumAvatarImageCache.delete(oldest)}}
 if(entry.failed)return null;if(entry.image.complete&&entry.image.naturalWidth)return entry.image;
 if(typeof onload==='function'&&entry.callbacks.size<4)entry.callbacks.add(onload);return null;
}

/* ---------- 首次设置与入口大厅 ---------- */
function profileFields(p={}){return `
 <label class="lb">你的名字 / 昵称</label><input id="s-name" value="${esc(p.name)}" placeholder="例如：小鹿">
 <label class="lb">出生日期 <span class="hint">（用来自动计算每段回忆发生时你几岁）</span></label><input id="s-birth" type="date" value="${p.birth||''}">
 <label class="lb">一句话人生格言</label><input id="s-motto" value="${esc(p.motto)}" placeholder="写一句代表你的话">
 <div class="chips">${MOTTOS.map((m,i)=>`<span class="chip" onclick="$('s-motto').value=MOTTOS[${i}]">${m}</span>`).join('')}</div>
 <label class="lb">选一个代表你的符号</label>
 ${avatarPickerHTML(SETUP_AV)}`}
function readProfile(){const name=val('s-name').trim();if(!name){toast('先告诉我你的名字吧 🌙');return null}return{...(S.profile||{}),name,birth:val('s-birth'),motto:val('s-motto').trim(),avatar:SETUP_AV}}
function renderSetup(){return `<div class="center-screen"><div class="setup glass">
 <div class="orb float">🏛️</div>
 <h1 class="title-font glow">欢迎来到人生博物馆</h1>
 <p class="sub" style="text-align:center">每一段经历，都值得被温柔地陈列。<br>先告诉我一点关于你的事吧。</p>
 ${profileFields()}
 <div style="text-align:center;margin-top:30px"><button class="btn btn-primary big" onclick="finishSetup()">✨ 建造我的博物馆</button></div>
 <p class="hint" style="text-align:center;margin-top:16px">已经有备份文件？建好后去「⚙️ 我的」里导入就行</p>
</div></div>`}
async function finishSetup(){const p=readProfile();if(!p)return;const old=S.profile;S.profile=p;if(!(await save())){S.profile=old;return}if(window.burst)burst(innerWidth/2,innerHeight/2);go('entrance')}

/* ---- 入口大厅 ---- */
function renderEntrance(){
 const p=S.profile,vis=visibleExhibits();
 const days=p.birth?Math.floor((Date.now()-new Date(p.birth))/864e5):null;
 const open=shownHalls().filter(h=>exhibitsOf(h.id).length).length;
 return `<div class="center-screen">
  <div class="orb big float">${avatarHTML(p.avatar)}</div>
  <p class="eyebrow">LIFE MUSEUM · 人生博物馆</p>
  <h1 class="title-font glow huge">${esc(p.name)} 的人生博物馆</h1>
  ${p.motto?`<p class="motto">“${esc(p.motto)}”</p>`:''}
  <div class="stats">${stat(vis.length,'段珍藏回忆')}${stat(open,'个展厅已开放')}${days!==null&&days>=0?stat(days.toLocaleString(),'天的人生旅程'):''}</div>
  <button class="btn btn-primary big pulse" onclick="go('explore')">✨ 推开大门</button>
  ${UI.visitor?(typeof CLOUD!=='undefined'&&CLOUD.sharedMode?`<button class="btn" style="margin-top:12px" onclick="leaveSharedAndCreateOwn()">🌱 我也要建造自己的人生博物馆</button>`:''):`<div class="btn-row center" style="margin-top:14px"><button class="btn" onclick="openShareModal()">🔗 分享给朋友看</button><button class="btn" onclick="toggleVisitor()">👁 预览访客视角</button></div>`}
 </div>`}

/* ---------- 「我的」页面与展厅管理 ---------- */
function renderMe(){
 SETUP_AV=S.profile.avatar||'🌙';
 const n=S.exhibits.length,imgs=S.exhibits.reduce((a,e)=>a+(e.images||[]).length,0),cnt={};
 S.exhibits.forEach(e=>{cnt[e.hall]=(cnt[e.hall]||0)+1});
 const last=S.lastBackup?new Date(S.lastBackup).toLocaleDateString():'还没有备份过';
 const halls=S.halls.map((h,i)=>`<div class="hall-row ${h.hidden?'off':''}" style="--g1:${h.g[0]};--g2:${h.g[1]}"><span class="h-ico">${esc(h.icon)}</span><span class="h-name">${esc(h.name)} ${h.secret?'<span class="hint">🔐 永远私密</span>':h.private?'<span class="hint">🔒 独家</span>':''}${h.hidden?' <span class="hint">· 已隐藏</span>':''}<small>${esc(h.desc||'')} · ${cnt[h.id]||0} 段回忆</small></span>
  <span class="h-acts"><button class="icon-btn" title="上移" ${i?'':'disabled'} onclick="moveHall('${h.id}',-1)">↑</button><button class="icon-btn" title="下移" ${i<S.halls.length-1?'':'disabled'} onclick="moveHall('${h.id}',1)">↓</button><button class="icon-btn" onclick="openHallEditor('${h.id}')">✏️ 编辑</button>${h.secret?'':`<button class="icon-btn ${h.private?'on':''}" onclick="toggleHall('${h.id}','private')">${h.private?'🔒 独家':'🌍 公开'}</button>`}<button class="icon-btn ${h.hidden?'on':''}" onclick="toggleHall('${h.id}','hidden')">${h.hidden?'👁 显示':'🙈 隐藏'}</button>${h.secret?'':`<button class="icon-btn" title="删除" onclick="delHall('${h.id}')">🗑</button>`}</span></div>`).join('');
 const hidden=S.hiddenPrompts.map((q,i)=>`<div class="hp-row"><span>${esc(q)}</span><button class="icon-btn" onclick="restorePrompt(${i})">↩ 恢复</button></div>`).join('');
 const custom=S.customPrompts.map(p=>`<div class="hp-row"><span>${(TYPES[p.type]||TYPES.event).icon} ${esc(p.q)} <span class="hint">· ${esc(hall(p.hall).name)}</span></span><button class="icon-btn" onclick="delCustomPrompt('${p.id}')">🗑</button></div>`).join('');
 return `<div class="wrap" style="max-width:900px">
 <div class="hero"><p class="eyebrow">MY MUSEUM</p><h1 class="title-font glow">⚙️ 我的博物馆</h1></div>
 ${typeof cloudAccountSectionHTML==='function'?cloudAccountSectionHTML():''}
 <div class="me-sec glass"><h2 class="title-font">🪪 馆主信息</h2>${profileFields(S.profile)}<div class="btn-row"><button class="btn btn-primary" onclick="saveProfile()">保存馆主信息</button></div></div>
 ${appearanceHTML()}
 <div class="me-sec glass"><div class="sec-head"><div><h2 class="title-font">🏛️ 展厅管理</h2><p class="hint">「🙈 隐藏」只是从导览里收起来，里面的回忆还在；「🔒 独家」会让访客看不到整个展厅</p></div><button class="btn btn-primary" onclick="openHallEditor()">＋ 新建展厅</button></div>${halls}</div>
 <div class="me-sec glass"><h2 class="title-font">💭 灵感管理</h2>
  <h3 class="s-h title-font" style="margin-top:14px">✍️ 我出的题（${S.customPrompts.length}）</h3>${custom||'<p class="hint" style="margin-top:6px">在任意展厅的灵感区点「✍️ 出一道自己的题」就能添加</p>'}
  <h3 class="s-h title-font">🙈 已隐藏的灵感（${S.hiddenPrompts.length}）</h3>${hidden||'<p class="hint" style="margin-top:6px">没有隐藏的灵感</p>'}</div>
 <div class="me-sec glass"><h2 class="title-font">💾 备份与恢复</h2><p class="sub" style="font-size:13px">你的回忆除了自动同步云端，也保存在当前浏览器里。你还可以随时导出备份文件留存。<br>目前共 ${n} 段回忆、${imgs} 张照片 · 上次备份：${last}${USE_LS?'<br>（当前为简易存储模式，空间较小，建议少放照片）':''}</p>
  <div class="btn-row"><button class="btn btn-primary" onclick="exportData()">📤 导出备份</button><label class="btn">📥 导入备份<input type="file" accept=".json,application/json" hidden onchange="importData(this)"></label></div></div>
 <div class="me-sec glass"><h2 class="title-font">🌙 危险区域</h2><div class="btn-row"><button class="btn danger" onclick="resetAll()">🗑 清空整座博物馆</button></div></div>
 </div>`}
async function saveProfile(){const p=readProfile();if(!p)return;const old=S.profile;S.profile=p;if(!(await save())){S.profile=old;return}render();toast('✨ 馆主信息已更新')}
async function moveHall(id,d){const i=S.halls.findIndex(h=>h.id===id),j=i+d;if(i<0||j<0||j>=S.halls.length)return;[S.halls[i],S.halls[j]]=[S.halls[j],S.halls[i]];await save();render()}
async function toggleHall(id,k){
 const h=hallOf(id);if(!h)return;
 if(k==='hidden'&&!h.hidden&&S.halls.filter(x=>!x.hidden).length<=1){toast('至少要留一个展厅哦');return}
 h[k]=!h[k];await save();render();
 toast(k==='hidden'?(h.hidden?`🙈「${h.name}」已从导览里收起`:`👁「${h.name}」重新开放`):(h.private?`🔒「${h.name}」已设为独家展厅`:`🌍「${h.name}」已对外开放`))}
async function delHall(id){
 const h=hallOf(id);if(!h)return;const rest=S.halls.filter(x=>x.id!==id);
 if(!rest.some(x=>!x.hidden)){toast('至少要留一个展厅哦');return}
 const target=rest.find(x=>!x.hidden&&!x.secret)||rest.find(x=>!x.hidden),n=S.exhibits.filter(e=>e.hall===id).length;
 if(!confirm(`确定删除「${h.name}」吗？${n?`\n里面的 ${n} 段回忆会移到「${target.name}」，不会丢失。`:''}`))return;
 const locked=hallLocked(h);
 S.exhibits.forEach(e=>{
  if(e.hall===id){e.hall=target.id;if(locked)e.private=true}
  if(Array.isArray(e.halls))e.halls=e.halls.filter(x=>x!==id&&x!==e.hall);
 });
 S.customPrompts=S.customPrompts.filter(p=>p.hall!==id);S.halls=rest;
 await save();render();toast('展厅已删除'+(n?`，回忆已移到「${target.name}」`:''));
}
let HE={};
function openHallEditor(id){
 const h=id?hallOf(id):null;
 HE={id:id||'',g:h?[...h.g]:[...HALL_COLORS[Math.floor(Math.random()*HALL_COLORS.length)]]};MODAL_SOFT=true;
 openModal(`<h2 class="m-title title-font">${h?'✏️ 编辑展厅':'＋ 新建展厅'}</h2>
 <label class="lb">展厅名字</label><input id="h-name" value="${esc(h?h.name:'')}" placeholder="例如：追星馆 / 宠物馆">
 <label class="lb">一句话介绍</label><input id="h-desc" value="${esc(h?h.desc:'')}" placeholder="例如：那些年我追过的光">
 <label class="lb">图标 <span class="hint">（点下面选一个，也可以自己输入 emoji）</span></label><input id="h-icon" value="${esc(h?h.icon:'💫')}" maxlength="8" style="width:110px;font-size:22px;text-align:center">
 <div class="chips">${HALL_ICONS.map(ic=>`<span class="chip" onclick="$('h-icon').value='${ic}'">${ic}</span>`).join('')}</div>
 <label class="lb">颜色</label><div class="palette" id="h-pal">${HALL_COLORS.map((g,i)=>`<span class="pal ${g[0]===HE.g[0]&&g[1]===HE.g[1]?'on':''}" style="--g1:${g[0]};--g2:${g[1]}" onclick="pickPal(${i},this)"></span>`).join('')}</div>
 <div class="m-actions"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveHall()">✨ 保存</button></div>`)}
function pickPal(i,el){HE.g=[...HALL_COLORS[i]];document.querySelectorAll('#h-pal .pal').forEach(p=>p.classList.remove('on'));el.classList.add('on')}
async function saveHall(){
 const name=val('h-name').trim();if(!name){toast('给展厅起个名字吧');return}
 const icon=val('h-icon').trim()||'💫',desc=val('h-desc').trim();
 if(HE.id){const h=hallOf(HE.id);if(h)Object.assign(h,{name,icon,desc,g:HE.g})}
 else S.halls.push({id:'h'+uid(),name,icon,desc,g:HE.g,kind:'theme'});
 await save();closeModal();render();toast(HE.id?'✨ 展厅已更新':`✨「${name}」开馆啦`)}
async function restorePrompt(i){S.hiddenPrompts.splice(i,1);await save();render();toast('↩ 灵感已恢复')}
async function delCustomPrompt(id){S.customPrompts=S.customPrompts.filter(p=>p.id!==id);await save();render();toast('已删除这道题')}

/* ---------- 访客视角 ---------- */
function toggleVisitor(){
 if(typeof CLOUD!=='undefined'&&CLOUD.sharedMode){leaveSharedAndCreateOwn();return}
 motionRouteSerial++;motionLastRoute='';
 UI.visitor=!UI.visitor;closeModal();CONS.sel=null;
 if(UI.visitor){if(['studio','me'].includes(UI.view))UI.view='explore';if(UI.view==='hall'&&hallLocked(hallOf(UI.hall)))UI.view='explore'}
 render();window.scrollTo(0,0);toast(UI.visitor?'👁 现在是访客视角：独家记忆已隐藏':'🔓 欢迎回来，馆长');
}

/* ---------- 备份 / 导入 / 清空 ---------- */
function exportData(){
 const blob=new Blob([JSON.stringify({app:'lifeMuseum',...S})],{type:'application/json'});
 const a=document.createElement('a'),d=new Date(),p=x=>String(x).padStart(2,'0');
 a.href=URL.createObjectURL(blob);a.download=`人生博物馆备份-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}.json`;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 S.lastBackup=Date.now();save().then(()=>{if(UI.view==='me')render()});toast('📤 备份文件已下载，请妥善保存')}
function importData(inp){
 const f=inp.files[0];if(!f)return;const r=new FileReader();
 r.onload=async()=>{
  let d=null;try{d=JSON.parse(r.result)}catch(e){}
  if(!d||!Array.isArray(d.exhibits)){toast('⚠️ 这个文件好像不是博物馆的备份');return}
  if(!confirm(`备份里有 ${d.exhibits.length} 段回忆。\n导入会替换当前博物馆的全部内容，确定吗？`))return;
  const old=S;S=migrate(d);if(!S.profile)S.profile=old.profile;
  if(!(await save())){S=old;return}
  applyMuseumUI(S.ui,false);UI.openStage=null;UI.openTheme=null;
  CONS.pos={};CONS.sel=null;if(S.profile)SETUP_AV=S.profile.avatar||'🌙';
  closeModal();UI.view=S.profile?'explore':'setup';render();toast('📥 导入成功，欢迎回来 ✨')};
 r.readAsText(f);inp.value=''}
async function resetAll(){
 if(!confirm('确定要清空整座博物馆吗？所有回忆都会被删除！'))return;
 if(!confirm('最后确认一次：真的要清空吗？建议先导出备份。'))return;
 S=migrate(null);applyMuseumUI(S.ui,false);UI.openStage=null;UI.openTheme=null;CONS.pos={};CONS.sel=null;SETUP_AV='🌙';await save();closeModal();UI.view='setup';render();toast('博物馆已清空')}

/* ---------- 全馆搜索 ---------- */
function museumSearchMatches(query,type='all'){
 const terms=String(query||'').normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);if(!terms.length)return [];
 const visible=visibleExhibits(),byId=new Map(visible.map(e=>[e.id,e])),linkedNames=new Map(visible.map(e=>[e.id,new Set()]));
 for(const e of visible)for(const id of e.links||[]){const other=byId.get(id);if(!other||other.id===e.id)continue;linkedNames.get(e.id).add(String(other.title||''));linkedNames.get(other.id).add(String(e.title||''))}
 return visible.filter(e=>{
  if(type!=='all'&&TYPES[type]&&e.type!==type)return false;
  const h=S.halls.find(h=>h.id===e.hall),stage=stageOf(e),stageName=stage&&!(UI.visitor&&hallLocked(stage))?stage.name:'';
  const text=[e.title,e.story,e.place,e.people,e.companions,e.nickname,e.quote,e.category,e.country,e.timeText,e.date,e.prompt,h&&h.name,stageName,...linkedNames.get(e.id)].filter(v=>v!==undefined&&v!==null).join(' ').normalize('NFKC').toLocaleLowerCase();
  return terms.every(term=>{if(/^\d{4}$/.test(term))return memoryYear(e)===Number(term);const age=term.match(/^(-?\d{1,3})岁$/);return age?searchMemoryAge(e)===Number(age[1]):text.includes(term)});
 }).sort(memorySort);
}
function museumSearchShortcuts(){
 const visible=visibleExhibits(),people=[...visible].filter(e=>e.type==='person').sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));
 const names=[...new Set(people.map(e=>String(e.title||'').split(/[：:，,]/)[0].trim().slice(0,24)).filter(Boolean))].slice(0,6);
 const years=[...new Set(visible.map(memoryYear).filter(y=>y!==null))].sort((a,b)=>b-a).slice(0,6).map(String);
 return {people:names,years};
}
function renderSearch(){
 const shortcut=museumSearchShortcuts(),filter=UI.searchType||'all';
 return `<div class="wrap"><span class="back" onclick="go('explore')">← 返回逛展</span><div class="hero"><p class="eyebrow">FIND A MEMORY</p><h1 class="title-font glow">🔍 全馆搜索</h1><p class="sub">一个名字、一处地点，或某一年、某一岁</p></div>
 <label class="lb" for="museum-search">搜索回忆</label><div class="search-focus"><input id="museum-search" type="search" maxlength="160" autocomplete="off" value="${esc(UI.query||'')}" placeholder="试试：2019、18岁、外婆，多个词用空格分开" oninput="updateMuseumSearch(this.value)"></div>
 <div class="chips center" id="search-type-chips">${[{id:'all',n:'全部',icon:'🌌'},...TYPE_ORDER.map(id=>({id,...TYPES[id]}))].map(t=>`<button type="button" class="chip ${filter===t.id?'on':''}" data-search-type="${t.id}" aria-pressed="${filter===t.id}" onclick="setMuseumSearchType('${t.id}')">${t.icon} ${t.n}</button>`).join('')}</div>
 <div class="chips center" id="search-shortcuts">${[...shortcut.people,...shortcut.years].map(t=>`<button type="button" class="chip" data-query="${esc(t)}" onclick="useMuseumSearchTag(this.dataset.query)">${esc(t)}</button>`).join('')}<button type="button" class="chip" onclick="useMuseumSearchTag('')">清空</button></div>
 <p id="museum-search-status" class="hint" role="status" aria-live="polite" style="margin-top:20px">${UI.query&&UI.query.trim()?'找到 '+museumSearchMatches(UI.query,filter).length+' 段回忆':''}</p><div id="museum-search-results">${searchResultHTML(UI.query||'')}</div></div>`;
}
function setMuseumSearchType(type){if(type!=='all'&&!TYPES[type])return;UI.searchType=type;const root=$('search-type-chips');if(root)root.querySelectorAll('button').forEach(b=>{const selected=b.dataset.searchType===type;b.classList.toggle('on',selected);b.setAttribute('aria-pressed',String(selected))});updateMuseumSearch(UI.query||'')}
function searchMatchContext(e,query){
 const terms=String(query).normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),lines=[];
 if(terms.some(t=>/^-?\d{1,3}岁$/.test(t))){const age=searchMemoryAge(e);if(age!==null)lines.push(`当时 ${age}岁`)}
 const year=memoryYear(e);if(year!==null&&terms.includes(String(year)))lines.push(`${year}年`);
 const textMatch=value=>{const text=String(value||'').normalize('NFKC').toLocaleLowerCase();return terms.some(t=>!/^\d{4}$/.test(t)&&!/^\d+岁$/.test(t)&&text.includes(t))};
 const linked=relatedOf(e).filter(x=>textMatch(x.title));if(linked.length)lines.push('关联：'+linked.slice(0,2).map(x=>x.title).join('、'));
 const stage=stageOf(e);if(stage&&!(UI.visitor&&hallLocked(stage))&&textMatch(stage.name))lines.push('所属阶段：'+stage.name);
 for(const [label,value]of [['同行',e.companions],['还有谁在',e.people],['名言',e.quote],['灵感',e.prompt]])if(value&&textMatch(value))lines.push(label+'：'+String(value).slice(0,90));
 return lines.length?`<p class="hint search-match-context">${esc(lines.join(' · '))}</p>`:'';
}
function searchResultHTML(query){
 if(!String(query).trim())return '<div class="empty-state">输入关键词，回忆就在这里等你 ✨</div>';
 const list=museumSearchMatches(query,UI.searchType||'all');
 return list.length?`<div class="ex-grid">${list.map(e=>`<div class="search-result-item">${cardHTML(e)}${searchMatchContext(e,query)}</div>`).join('')}</div>`:'<div class="empty-state"><div class="search-empty-icon" style="font-size:56px">🔭</div>没找到，换个词试试</div>';
}
function updateMuseumSearch(query){
 UI.query=String(query).slice(0,160);clearTimeout(motionSearchTimer);const serial=++motionSearchSerial;
 motionSearchTimer=setTimeout(()=>{if(serial!==motionSearchSerial||UI.view!=='search')return;const root=$('museum-search-results');if(!root)return;root.innerHTML=searchResultHTML(UI.query);const status=$('museum-search-status');if(status)status.textContent=UI.query.trim()?`找到 ${museumSearchMatches(UI.query,UI.searchType||'all').length} 段回忆`:'';highlightMuseumSearch(root,UI.query);revealCards(root,30);prepareInteractiveElements(root)},motionCalm()?0:150);
}
function useMuseumSearchTag(query){const input=$('museum-search');if(!input)return;input.value=query;input.focus();updateMuseumSearch(query)}
function highlightMuseumSearch(root,query){
 const words=String(query).normalize('NFKC').trim().split(/\s+/).filter(Boolean).slice(0,8).map(s=>{const age=s.match(/^(-?\d{1,3})岁$/);return age?age[1]+'\\s*岁':s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')});if(!root||!words.length)return;
 const re=new RegExp(words.sort((a,b)=>b.length-a.length).join('|'),'giu'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(node=>{const text=node.nodeValue;re.lastIndex=0;if(!re.test(text))return;re.lastIndex=0;const fragment=document.createDocumentFragment();let from=0;for(const match of text.matchAll(re)){fragment.append(document.createTextNode(text.slice(from,match.index)));const mark=document.createElement('mark');mark.className='search-mark';mark.textContent=match[0];fragment.append(mark);from=match.index+match[0].length}fragment.append(document.createTextNode(text.slice(from)));node.replaceWith(fragment)});
}
