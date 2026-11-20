/* =========================================================
 * cloud.js · 云端账号（邮箱验证注册 / 登录 / 找回密码）、云端同步与免登录访客分享
 * 基于 Supabase Auth + Postgres REST 接口，零第三方 CDN 依赖，国内免 VPN 直连。
 * ========================================================= */

/* ---------- 云端配置（已连接你的 Supabase 云数据库） ---------- */
const DEFAULT_CLOUD_CONFIG={
 url:'https://juyavmauxvfmgpberoqa.supabase.co',
 anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eWF2bWF1eHZmbWdwYmVyb3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5ODU4MDksImV4cCI6MjExMDU2MTgwOX0.UlCsduZNO36IZTfCq8-bt5NWb5xLRjz54S849OQPxCg'
};

function getCloudConfig(){
 const winCfg=window.MUSEUM_CLOUD_CONFIG||{};
 let localCfg={};
 try{
  const raw=localStorage.getItem('lifeMuseum_cloudConfig');
  if(raw){
   localCfg=JSON.parse(raw)||{};
   if(localCfg.url&&localCfg.url.includes('omsutejzszuqhlddkljk')){
    localStorage.removeItem('lifeMuseum_cloudConfig');
    localStorage.removeItem('lifeMuseum_authSession_v1');
    localStorage.removeItem('lifeMuseum_lastOwnerId_v1');
    localCfg={};
   }
  }
 }catch(e){}
 const url=String(winCfg.url||localCfg.url||DEFAULT_CLOUD_CONFIG.url||'').trim().replace(/\/+$/,'');
 const anonKey=String(winCfg.anonKey||localCfg.anonKey||DEFAULT_CLOUD_CONFIG.anonKey||'').trim();
 return {url,anonKey,enabled:typeof fetch==='function'&&!!(url&&anonKey&&!url.includes('YOUR_PROJECT'))};
}

/* ---------- 云端运行状态 ---------- */
const CLOUD={
 user:null,          // 当前登录用户 {id, email}
 session:null,       // 当前会话 {access_token, refresh_token, expires_at, user}
 shareId:'',         // 当前博物馆的公开分享码
 isPublic:true,      // 是否允许通过分享链接免登录参观
 sharedMode:false,   // 当前是否为「朋友点开分享链接」的免登录只读参观模式
 sharedCode:'',      // 正在参观的分享码
 syncState:'idle',   // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
 lastSyncAt:0,
 authMode:'login',   // 'login' | 'register' | 'verify' | 'forgot' | 'reset'
 pendingEmail:'',    // 等待验证码/重置的邮箱
 syncTimer:0,
 pulling:false
};

const SESSION_KEY='lifeMuseum_authSession_v2';
const OWNER_ID_KEY='lifeMuseum_lastOwnerId_v2';

/* ---------- 生成唯一分享短码 ---------- */
function genShareId(){
 const chars='23456789abcdefghjkmnpqrstuvwxyz';
 let out='m_';
 for(let i=0;i<10;i++)out+=chars[Math.floor(Math.random()*chars.length)];
 return out;
}

/* ---------- 生成物理脱敏的「公开访客数据快照」（剔除秘密花园、独家展厅与独家回忆） ---------- */
function buildPublicSnapshot(state){
 if(!state||typeof state!=='object')return {};
 const halls=Array.isArray(state.halls)?state.halls:[];
 const lockedHallIds=new Set(halls.filter(h=>h&&(h.secret||h.private)).map(h=>h.id));
 const publicHalls=halls.filter(h=>h&&!h.secret&&!h.private&&!h.hidden).map(h=>({...h}));
 const publicExhibits=(Array.isArray(state.exhibits)?state.exhibits:[]).filter(e=>{
  if(!e||e.private||e.pending)return false;
  if(lockedHallIds.has(e.hall))return false;
  return true;
 }).map(e=>{
  const copy={...e};
  if(Array.isArray(copy.halls))copy.halls=copy.halls.filter(id=>!lockedHallIds.has(id));
  return copy;
 });
 return {
  version:state.version||3,
  v22:true,
  profile:state.profile?{...state.profile}:null,
  halls:publicHalls,
  exhibits:publicExhibits,
  framework:Array.isArray(state.framework)?state.framework:[],
  kids:Array.isArray(state.kids)?state.kids:[],
  consPos:state.consPos||{},
  ui:state.ui||{}
 };
}

/* ---------- 底层 Supabase HTTP 请求封装 ---------- */
async function supaFetch(path,opts={}){
 const cfg=getCloudConfig();
 if(!cfg.enabled)throw new Error('云端服务尚未配置');
 const headers={'apikey':cfg.anonKey,'Content-Type':'application/json',...(opts.headers||{})};
 if(opts.token)headers['Authorization']='Bearer '+opts.token;
 else if(CLOUD.session&&CLOUD.session.access_token&&opts.useAuth!==false)headers['Authorization']='Bearer '+CLOUD.session.access_token;
 const timeoutMs=opts.timeoutMs||(path.startsWith('/auth/v1/')?20000:0);
 const controller=timeoutMs?new AbortController():null;
 const timer=controller&&setTimeout(()=>controller.abort(),timeoutMs);
 let res,text;
 try{
  res=await fetch(cfg.url+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,signal:controller?.signal});
  text=await res.text();
 }catch(e){
  if(controller?.signal.aborted)throw new Error('连接超时，请检查网络后重试。如果刚刚请求了邮件，请先查收邮箱。');
  if(e instanceof TypeError)throw new Error('暂时连不上云端服务，请检查网络后重试。');
  throw e;
 }finally{clearTimeout(timer)}
 let data=null;
 try{data=text?JSON.parse(text):null}catch(e){data=text}
 if(!res.ok){
  const msg=(data&&(data.msg||data.error_description||data.message||data.error))||('请求失败 ('+res.status+')');
  const error=new Error(translateSupaError(msg,data?.error_code));
  error.code=data?.error_code;
  throw error;
 }
 return data;
}

function translateSupaError(msg,code){
 const s=String(msg||'');
 if(code==='email_address_not_authorized')return '邮件服务暂时无法向这个地址发送邮件，请联系网站管理员。';
 if(/Error sending (confirmation|recovery) email/i.test(s))return '邮件服务发送失败，请稍后再试。如果一直收不到，请联系网站管理员。';
 if(/Invalid login credentials/i.test(s))return '邮箱或密码不正确，请再检查一下';
 if(/Email not confirmed/i.test(s))return '这个邮箱还没完成验证哦，请先去邮箱点验证链接或输入验证码';
 if(/User already registered|already been registered/i.test(s))return '这个邮箱已经注册过了，请直接登录，或点「忘记密码」找回';
 if(/Password should be at least/i.test(s))return '密码至少需要 6 位字符';
 if(/rate limit|For security purposes/i.test(s))return '请求次数已达限制，请稍后再试。如果已请求过邮件，请先查收邮箱。';
 if(/Token has expired or is invalid|otp_expired/i.test(s))return '验证码或链接已过期，请重新发送一次';
 if(/Unable to validate email address|invalid format/i.test(s))return '请输入正确的邮箱地址';
 return s;
}

/* ---------- 会话持久化与自动刷新 ---------- */
function saveSession(sess){
 if(!sess||!sess.access_token){
  CLOUD.session=null;CLOUD.user=null;
  try{localStorage.removeItem(SESSION_KEY)}catch(e){}
  return;
 }
 const expiresAt=sess.expires_at||(Math.floor(Date.now()/1000)+(Number(sess.expires_in)||3600));
 CLOUD.session={...sess,expires_at:expiresAt};
 CLOUD.user=sess.user||null;
 try{localStorage.setItem(SESSION_KEY,JSON.stringify(CLOUD.session))}catch(e){}
}

function loadSavedSession(){
 try{
  const raw=localStorage.getItem(SESSION_KEY);
  if(!raw)return null;
  const s=JSON.parse(raw);
  if(s&&s.access_token&&s.user){CLOUD.session=s;CLOUD.user=s.user;return s}
 }catch(e){}
 return null;
}

async function ensureValidSession(){
 const cfg=getCloudConfig();
 if(!cfg.enabled||!CLOUD.session)return false;
 const now=Math.floor(Date.now()/1000);
 if(CLOUD.session.expires_at&&CLOUD.session.expires_at-now>90)return true;
 if(!CLOUD.session.refresh_token)return false;
 try{
  const refreshed=await supaFetch('/auth/v1/token?grant_type=refresh_token',{
   method:'POST',useAuth:false,body:{refresh_token:CLOUD.session.refresh_token}
  });
  if(refreshed&&refreshed.access_token){saveSession(refreshed);return true}
 }catch(e){
  saveSession(null);
 }
 return false;
}

/* ---------- 检查 URL 中的邮件验证回调 / 密码重置回调 / 访客分享参数 ---------- */
function parseUrlAuthAndShare(){
 const url=new URL(location.href),query=url.searchParams,hash=new URLSearchParams(url.hash.slice(1));
 const result={recovery:false,session:null,error:'',share:(query.get('share')||query.get('u')||'').trim()};
 const param=name=>hash.get(name)||query.get(name);
 const authKeys=['access_token','refresh_token','error','error_code','error_description'];
 if(!authKeys.some(key=>hash.has(key)||query.has(key)))return result;
 if(param('error')||param('error_code')||param('error_description')){
  result.error=/expired|invalid|already.used/i.test([param('error_code'),param('error_description')].join(' '))
   ?'这个邮件链接已过期或已使用。已验证的邮箱可以直接登录，也可以重新申请邮件。'
   :'邮件链接验证失败。请使用最新一封邮件里的链接，或返回登录。';
 }else if(param('access_token')&&param('refresh_token')){
  result.session={
   access_token:param('access_token'),refresh_token:param('refresh_token'),
   expires_in:Number(param('expires_in'))||3600
  };
  result.recovery=param('type')==='recovery';
 }else{
  result.error='邮件链接不完整。请从最新一封邮件重新打开完整链接，或尝试登录。';
 }
 const keys=[...authKeys,'expires_in','expires_at','token_type','type'];
 for(const params of [query,hash]){
  if(!authKeys.some(key=>params.has(key)))continue;
  for(const key of keys)params.delete(key);
  if(params===hash)url.hash=params.toString();
 }
 try{history.replaceState(history.state,'',url.pathname+url.search+url.hash)}catch(e){}
 return result;
}

/* ---------- 云端读取与保存当前用户的博物馆 ---------- */
async function fetchCloudMuseum(){
 if(!(await ensureValidSession())||!CLOUD.user)throw new Error('登录已过期，请重新登录。');
 if(!CLOUD.user.id||CLOUD.user.id==='pending'){
  const u=await supaFetch('/auth/v1/user');
  if(!u||!u.id)throw new Error('无法确认账号');
  CLOUD.session.user=u;saveSession(CLOUD.session);
 }
 const rows=await supaFetch(`/rest/v1/museums?user_id=eq.${encodeURIComponent(CLOUD.user.id)}&select=user_id,share_id,is_public,owner_data,updated_at`,{timeoutMs:30000});
 return Array.isArray(rows)&&rows[0]?rows[0]:null;
}

async function pushCloudMuseum(immediate=false){
 const cfg=getCloudConfig();
 if(!cfg.enabled||CLOUD.sharedMode||!CLOUD.user||!CLOUD.session)return false;
 if(!immediate){
  clearTimeout(CLOUD.syncTimer);
  CLOUD.syncTimer=setTimeout(()=>pushCloudMuseum(true),600);
  return true;
 }
 if(CLOUD.pulling)return false;
 try{
  if(!(await ensureValidSession()))return false;
  CLOUD.syncState='syncing';updateCloudBadges();
  if(!S.shareId)S.shareId=CLOUD.shareId||genShareId();
  CLOUD.shareId=S.shareId;
  if(typeof S.isPublicShare==='boolean')CLOUD.isPublic=S.isPublicShare;
  else S.isPublicShare=CLOUD.isPublic;
  const pubSnap=buildPublicSnapshot(S);
  const nowIso=new Date().toISOString();
  const payload={
   user_id:CLOUD.user.id,
   email:CLOUD.user.email||'',
   share_id:CLOUD.shareId,
   is_public:CLOUD.isPublic!==false,
   owner_data:S,
   public_data:pubSnap,
   updated_at:nowIso
  };
  await supaFetch('/rest/v1/museums?on_conflict=user_id',{
   method:'POST',
   headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
   body:payload
  });
  await supaFetch('/rest/v1/shared_museums?on_conflict=user_id',{
   method:'POST',
   headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
   body:{
    share_id:CLOUD.shareId,
    user_id:CLOUD.user.id,
    is_public:CLOUD.isPublic!==false,
    public_data:pubSnap,
    updated_at:nowIso
   }
  });
  CLOUD.syncState='synced';CLOUD.lastSyncAt=Date.now();updateCloudBadges();
  return true;
 }catch(e){
  CLOUD.syncState='error';updateCloudBadges();
  return false;
 }
}

/* ---------- 免登录读取他人分享的公开博物馆 ---------- */
async function loadSharedMuseumByCode(shareCode){
 const cfg=getCloudConfig();
 if(!cfg.enabled)throw new Error('云端尚未配置');
 const rows=await supaFetch(`/rest/v1/shared_museums?share_id=eq.${encodeURIComponent(shareCode)}&is_public=is.true&select=public_data,updated_at`,{
  method:'GET',useAuth:false
 });
 const row=Array.isArray(rows)&&rows[0]?rows[0]:null;
 const data=row&&row.public_data;
 if(!data||typeof data!=='object'||!data.profile)return null;
 return data;
}

/* ---------- 登录后的数据合并与多账号本地隔离 ---------- */
async function syncAfterLogin(){
 const cfg=getCloudConfig();
 if(!cfg.enabled||!CLOUD.user)return;
 CLOUD.pulling=true;
 CLOUD.syncState='syncing';updateCloudBadges();
 let message='';
 try{
  const remote=await fetchCloudMuseum();
  const lastOwnerId=localStorage.getItem(OWNER_ID_KEY)||'';
  const sameOwner=!lastOwnerId||lastOwnerId===CLOUD.user.id;
  if(remote&&remote.owner_data&&typeof remote.owner_data==='object'&&(remote.owner_data.profile||Array.isArray(remote.owner_data.exhibits))){
   CLOUD.shareId=remote.share_id||remote.owner_data.shareId||genShareId();
   CLOUD.isPublic=remote.is_public!==false;
   const rTime=Number(remote.owner_data._storageUpdatedAt)||Date.parse(remote.updated_at||'')||0;
   const lTime=sameOwner?(Number(S&&S._storageUpdatedAt)||0):0;
   if(!sameOwner||rTime>=lTime||!S||!S.profile){
    S=migrate(remote.owner_data);
    S.shareId=CLOUD.shareId;
    S.isPublicShare=CLOUD.isPublic;
    await saveLocalOnly();
   }else{
    S.shareId=CLOUD.shareId;
    S.isPublicShare=CLOUD.isPublic;
   }
   localStorage.setItem(OWNER_ID_KEY,CLOUD.user.id);
   CLOUD.syncState='synced';CLOUD.lastSyncAt=Date.now();
  }else{
   /* 云端还是空的新账号：如果是同一台设备首次注册且本地已有回忆，自动迁入新账号；如果是切换了第二个新账号，则初始化空白馆 */
   if(!sameOwner){
    S=migrate(null);
   }
   CLOUD.shareId=S.shareId||genShareId();
   CLOUD.isPublic=true;
   S.shareId=CLOUD.shareId;
   S.isPublicShare=true;
   localStorage.setItem(OWNER_ID_KEY,CLOUD.user.id);
   await saveLocalOnly();
   await pushCloudMuseum(true);
  }
  applyMuseumUI(S.ui,false);
  if(S.profile)SETUP_AV=S.profile.avatar||'🌙';
  UI.visitor=false;CLOUD.sharedMode=false;
  UI.view=S.profile?'entrance':'setup';
 }catch(e){
  CLOUD.syncState='error';
  UI.visitor=false;CLOUD.sharedMode=false;
  saveSession(null);
  CLOUD.authMode='login';UI.view='auth';
  message='暂时无法读取这个账号的博物馆。请稍后重新登录。';
 }finally{
  CLOUD.pulling=false;
  updateCloudBadges();
  render();
  if(message)showAuthMessage(message);
 }
}

/* ---------- 仅写本地存储（供云端拉取后落地，避免循环触发上传） ---------- */
async function saveLocalOnly(){
 const previous=S._storageUpdatedAt;S._storageUpdatedAt=Date.now();
 try{
  if(USE_LS)localStorage.setItem('lifeMuseum',JSON.stringify(S));
  else{try{await DB.set('state',S)}catch(error){localStorage.setItem('lifeMuseum',JSON.stringify(S));USE_LS=true}}
  return true;
 }catch(error){if(previous===undefined)delete S._storageUpdatedAt;else S._storageUpdatedAt=previous;return false}
}

/* ---------- 包装全局 save()：本地秒存 + 自动异步同步到云端 ---------- */
const _origLocalSave=save;
save=async function(){
 if(CLOUD.sharedMode){toast('👁 当前是访客参观模式，不能修改馆主的数据哦');return false}
 const ok=await _origLocalSave();
 if(ok&&getCloudConfig().enabled&&CLOUD.user){
  pushCloudMuseum(false);
 }
 return ok;
};

/* ---------- 认证界面（登录 / 注册验证 / 忘记密码找回 / 重置密码） ---------- */
function renderAuthScreen(){
 const cfg=getCloudConfig();
 const m=CLOUD.authMode||'login';
 let body='';
 if(!cfg.enabled){
  body=`<div class="prompt-banner" style="margin:10px 0 14px;text-align:left">
   <b>☁️ 正在等待连接云端数据库</b><br>
   <span class="hint">连接 Supabase 后，即可开启邮箱注册、密码找回、多设备云同步与免登录分享链接。你也可以先在当前浏览器直接体验完整功能。</span>
  </div>
  <div class="btn-row center"><button class="btn btn-primary big" onclick="enterOfflineMode()">✨ 先在本地进入博物馆</button></div>`;
 }else if(m==='login'){
  body=`<label class="lb">📧 邮箱地址</label>
  <input id="au-email" type="email" autocomplete="email" value="${esc(CLOUD.pendingEmail)}" placeholder="请输入你的邮箱（如 xxx@qq.com）" onkeydown="if(event.key==='Enter')$('au-pass').focus()">
  <label class="lb">🔑 登录密码</label>
  <input id="au-pass" type="password" autocomplete="current-password" placeholder="请输入密码（至少 6 位）" onkeydown="if(event.key==='Enter')cloudLogin()">
  <div style="text-align:center;margin-top:16px">
   <button class="btn btn-primary big" id="au-btn" style="width:100%;justify-content:center" onclick="cloudLogin()">✨ 登录我的博物馆</button>
  </div>
  <div class="btn-row" style="justify-content:space-between;margin-top:12px">
   <button type="button" class="btn sm" onclick="switchAuthMode('register')">🌱 注册新账号</button>
   <button type="button" class="btn sm" onclick="switchAuthMode('forgot')">💌 忘记密码？</button>
  </div>`;
 }else if(m==='register'){
  body=`<label class="lb">📧 你的邮箱 <span class="hint">（用于登录和找回密码）</span></label>
  <input id="au-email" type="email" autocomplete="email" value="${esc(CLOUD.pendingEmail)}" placeholder="例如：xxx@qq.com / xxx@163.com">
  <label class="lb">🔑 设置密码 <span class="hint">（至少 6 位）</span></label>
  <input id="au-pass" type="password" autocomplete="new-password" placeholder="请设置 6 位以上登录密码">
  <label class="lb">🔑 确认密码</label>
  <input id="au-pass2" type="password" autocomplete="new-password" placeholder="请再输入一次密码" onkeydown="if(event.key==='Enter')cloudRegister()">
  <div style="text-align:center;margin-top:16px">
   <button class="btn btn-primary big" id="au-btn" style="width:100%;justify-content:center" onclick="cloudRegister()">📬 注册并发送验证邮件</button>
  </div>
  <div class="btn-row center" style="margin-top:12px">
   <button type="button" class="btn sm" onclick="switchAuthMode('login')">← 已有账号？直接登录</button>
  </div>`;
 }else if(m==='verify'){
  body=`<div class="prompt-banner" style="margin:8px 0 12px;text-align:left">
   📬 请到 <b>${esc(CLOUD.pendingEmail)}</b> 查收验证邮件<br>
   <span class="hint">方式一：直接去邮箱点击邮件里的确认链接，就会自动进入博物馆；<br>方式二：如果邮件里有验证码，也可以直接填在下面验证（没收到请看一眼垃圾箱）。</span>
  </div>
  <label class="lb">🔢 邮件验证码 <span class="hint">（若已点邮件里的链接，直接点下方「我已点击验证链接」）</span></label>
  <input id="au-otp" type="text" maxlength="10" placeholder="输入邮件中的数字验证码（选填）" onkeydown="if(event.key==='Enter')cloudVerifyOtp('signup')">
  <div class="btn-row" style="margin-top:14px">
   <button type="button" id="au-verify" class="btn btn-primary" style="flex:1;justify-content:center" onclick="cloudVerifyOtp('signup')">✓ 验证码确认</button>
   <button type="button" class="btn" style="flex:1;justify-content:center" onclick="switchAuthMode('login')">🔑 我已点邮件链接，去登录</button>
  </div>
  <div class="btn-row" style="justify-content:space-between;margin-top:8px">
   <button type="button" id="au-resend" class="btn sm" onclick="cloudResendEmail()">🔄 重新发送验证邮件</button>
   <button type="button" class="btn sm" onclick="switchAuthMode('register')">← 换个邮箱</button>
  </div>`;
 }else if(m==='forgot'){
  body=`<p class="sub" style="font-size:12px;text-align:center;margin-bottom:8px">输入你注册时用的邮箱，我们会把重置密码链接发给你。</p>
  <label class="lb">📧 注册邮箱</label>
  <input id="au-email" type="email" autocomplete="email" value="${esc(CLOUD.pendingEmail)}" placeholder="请输入你的注册邮箱" onkeydown="if(event.key==='Enter')cloudSendRecovery()">
  <div style="text-align:center;margin-top:16px">
   <button class="btn btn-primary big" id="au-btn" style="width:100%;justify-content:center" onclick="cloudSendRecovery()">💌 发送找回密码邮件</button>
  </div>
  <div class="btn-row center" style="margin-top:12px">
   <button type="button" class="btn sm" onclick="switchAuthMode('login')">← 返回登录</button>
  </div>`;
 }else if(m==='reset'){
  body=`<div class="prompt-banner" style="margin:8px 0 12px;text-align:left">
   🔐 正在为 <b>${esc((CLOUD.user&&CLOUD.user.email)||CLOUD.pendingEmail||'你的账号')}</b> 设置新密码
  </div>
  ${CLOUD.session?'':`<label class="lb">🔢 邮件中的重置验证码 <span class="hint">（如果你是直接从邮件链接点进来的，不用填此项）</span></label><input id="au-otp" type="text" maxlength="10" placeholder="输入邮件里的数字验证码">`}
  <label class="lb">🔑 新密码 <span class="hint">（至少 6 位）</span></label>
  <input id="au-pass" type="password" autocomplete="new-password" placeholder="请输入新密码">
  <label class="lb">🔑 确认新密码</label>
  <input id="au-pass2" type="password" autocomplete="new-password" placeholder="请再次输入新密码" onkeydown="if(event.key==='Enter')cloudUpdatePassword()">
  <div style="text-align:center;margin-top:16px">
   <button class="btn btn-primary big" id="au-btn" style="width:100%;justify-content:center" onclick="cloudUpdatePassword()">✨ 保存新密码并进入博物馆</button>
  </div>
  <div class="btn-row center" style="margin-top:10px">
   <button type="button" class="btn sm" onclick="switchAuthMode('login')">取消</button>
  </div>`;
 }
 return `<div class="center-screen"><div class="setup glass" style="max-width:440px">
  <div class="orb float">🏛️</div>
  <h1 class="title-font glow">人生博物馆</h1>
  <p class="sub" style="text-align:center">每个人都有一座属于自己的记忆星空 ✨<br><span class="hint">云端加密保存 · 手机电脑随时同步 · 可一键分享给朋友参观</span></p>
  ${body}
  <p id="au-status" role="status" aria-live="polite" aria-atomic="true"></p>
 </div></div>`;
}

function switchAuthMode(mode){
 const emailEl=$('au-email');
 if(emailEl&&emailEl.value.trim())CLOUD.pendingEmail=emailEl.value.trim();
 CLOUD.authMode=mode;
 render();
}

function enterOfflineMode(){
 UI.view=S.profile?'entrance':'setup';
 render();
}

/* ---------- 登录 / 注册 / 验证 / 找回密码动作 ---------- */
function showAuthMessage(message){
 const status=$('au-status');
 if(status)status.textContent=message;
}

// 禁用按钮和回车重复提交。用户离开表单后，旧请求不再改动新页面。
async function submitAuthRequest(buttonId,busyText,action){
 const btn=$(buttonId);
 if(!btn||btn.disabled)return;
 const label=btn.textContent;
 btn.disabled=true;
 btn.textContent=busyText;
 showAuthMessage(busyText);
 try{
  await action(btn);
 }catch(e){
  if(btn.isConnected)showAuthMessage(e.message);
 }finally{
  if(btn.isConnected){btn.disabled=false;btn.textContent=label}
 }
}

function authEmailPath(endpoint){
 // 直接打开本地 HTML 时，邮件仍需返回可访问的网站。
 const redirect=/^https?:$/.test(location.protocol)?location.origin+location.pathname:'https://life-museum-bwo.pages.dev/';
 return endpoint+'?redirect_to='+encodeURIComponent(redirect);
}

async function cloudLogin(){
 const email=val('au-email').trim(),password=val('au-pass');
 if(!email){showAuthMessage('请输入邮箱地址');return}
 if(!password){showAuthMessage('请输入密码');return}
 CLOUD.pendingEmail=email;
 await submitAuthRequest('au-btn','正在登录…',async btn=>{
  let session;
  try{
   session=await supaFetch('/auth/v1/token?grant_type=password',{
    method:'POST',useAuth:false,body:{email,password}
   });
  }catch(e){
   if(!btn.isConnected)return;
   if(e.code!=='email_not_confirmed'&&!/还没完成验证/.test(e.message))throw e;
   CLOUD.pendingEmail=email;
   CLOUD.authMode='verify';render();
   showAuthMessage(e.message);
   return;
  }
  if(!btn.isConnected)return;
  saveSession(session);
  toast('✨ 欢迎回来，正在同步你的博物馆…');
  await syncAfterLogin();
 });
}

async function cloudRegister(){
 const email=val('au-email').trim(),password=val('au-pass'),pass2=val('au-pass2');
 if(!email||!$('au-email').validity.valid){showAuthMessage('请输入正确的邮箱地址');return}
 if(!password||password.length<6){showAuthMessage('密码至少需要 6 位哦');return}
 if(password!==pass2){showAuthMessage('两次输入的密码不一致，请检查一下');return}
 CLOUD.pendingEmail=email;
 await submitAuthRequest('au-btn','正在发送验证邮件…',async btn=>{
  const res=await supaFetch(authEmailPath('/auth/v1/signup'),{
   method:'POST',useAuth:false,body:{email,password}
  });
  if(!btn.isConnected)return;
  CLOUD.pendingEmail=email;
  if(res&&res.access_token){
   saveSession(res);
   toast('🎉 注册成功！欢迎来到你的人生博物馆');
   await syncAfterLogin();
  }else{
   CLOUD.authMode='verify';
   render();
   showAuthMessage('如果邮箱已注册并完成验证，可以直接登录。');
  }
 });
}

async function cloudVerifyOtp(type='signup'){
 const token=val('au-otp').trim();
 if(!token){showAuthMessage('请输入邮件里的验证码，或者直接去邮箱点击验证链接');return}
 await submitAuthRequest('au-verify','正在验证…',async btn=>{
  const res=await supaFetch('/auth/v1/verify',{
   method:'POST',useAuth:false,body:{type:type==='signup'?'email':type,email:CLOUD.pendingEmail,token}
  });
  if(!btn.isConnected)return;
  if(res&&res.access_token){
   saveSession(res);
   toast('🎉 邮箱验证成功！正在进入你的博物馆…');
   await syncAfterLogin();
  }else{
   toast('✓ 验证通过，请直接输入密码登录');
   switchAuthMode('login');
  }
 });
}

async function cloudResendEmail(){
 if(!CLOUD.pendingEmail){showAuthMessage('请先填写你的邮箱');return}
 await submitAuthRequest('au-resend','正在重新发送…',async btn=>{
  await supaFetch(authEmailPath('/auth/v1/resend'),{
   method:'POST',useAuth:false,body:{type:'signup',email:CLOUD.pendingEmail}
  });
  if(btn.isConnected)showAuthMessage('验证邮件已重新请求，请查收收件箱和垃圾邮件文件夹。');
 });
}

async function cloudSendRecovery(){
 const email=val('au-email').trim();
 if(!email||!email.includes('@')){toast('请输入你注册时使用的邮箱');return}
 CLOUD.pendingEmail=email;
 const btn=$('au-btn');if(btn)btn.disabled=true;
 try{
  await supaFetch(authEmailPath('/auth/v1/recover'),{
   method:'POST',useAuth:false,body:{email}
  });
  CLOUD.authMode='reset';
  render();
  toast('💌 重置密码邮件已发送！去邮箱点击链接或输入验证码即可设置新密码');
 }catch(e){
  toast('⚠️ '+e.message);
 }finally{if(btn&&btn.isConnected)btn.disabled=false}
}

async function cloudUpdatePassword(){
 const pass=val('au-pass'),pass2=val('au-pass2'),otp=val('au-otp').trim();
 if(!pass||pass.length<6){toast('新密码至少需要 6 位字符');return}
 if(pass!==pass2){toast('两次输入的新密码不一致');return}
 const btn=$('au-btn');if(btn)btn.disabled=true;
 try{
  if(!CLOUD.session&&otp&&CLOUD.pendingEmail){
   const vRes=await supaFetch('/auth/v1/verify',{
    method:'POST',useAuth:false,body:{type:'recovery',email:CLOUD.pendingEmail,token:otp}
   });
   if(vRes&&vRes.access_token)saveSession(vRes);
  }
  if(!CLOUD.session){
   toast('请先点击邮件里的重置密码链接，或填写邮件中的验证码');
   return;
  }
  const u=await supaFetch('/auth/v1/user',{
   method:'PUT',body:{password:pass}
  });
  if(u&&u.id)CLOUD.user=u;
  closeModal();
  toast('✨ 密码已更新！欢迎回到你的博物馆');
  await syncAfterLogin();
 }catch(e){
  toast('⚠️ '+e.message);
 }finally{if(btn&&btn.isConnected)btn.disabled=false}
}

async function cloudLogout(){
 if(!confirm('确定要退出当前账号吗？\n你的回忆已安全保存在云端，下次登录随时恢复。'))return;
 try{if(CLOUD.session)await supaFetch('/auth/v1/logout',{method:'POST'})}catch(e){}
 saveSession(null);
 CLOUD.authMode='login';
 UI.visitor=false;CLOUD.sharedMode=false;
 UI.view='auth';
 closeModal(true);
 render();
 toast('已安全退出登录');
}

/* ---------- 分享我的博物馆弹窗（生成免登录分享链接） ---------- */
function getShareUrl(){
 const code=CLOUD.shareId||S.shareId||(S.shareId=genShareId());
 CLOUD.shareId=code;
 const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split('?')[0].split('#')[0];
 return `${base}?share=${encodeURIComponent(code)}`;
}

function openShareModal(){
 if(CLOUD.sharedMode){
  leaveSharedAndCreateOwn();
  return;
 }
 const url=getShareUrl();
 const isPub=CLOUD.isPublic!==false;
 MODAL_SOFT=true;
 openModal(`<h2 class="m-title title-font">🔗 分享我的人生博物馆</h2>
  <p class="sub" style="font-size:12.5px">把下面的链接发给朋友或微信群，<b>对方不需要注册或登录</b>，点开就能以「访客视角」参观你的博物馆 ✨</p>
  <div class="prompt-banner" style="margin-top:10px;font-size:12px">
   🔒 <b>隐私安全保护已开启</b>：你的「秘密花园」、设为「🔒 独家」的展厅和单条「🔒 独家记忆」，在上传分享数据时已物理剔除，访客绝对看不到，也不能修改你的任何内容。
  </div>
  <label class="museum-switch" style="margin-top:12px">
   <input type="checkbox" ${isPub?'checked':''} onchange="toggleSharePublic(this.checked)">
   <span class="switch-track"><span class="switch-knob"></span></span>
   <span>🌍 允许持有链接的人免登录参观</span>
  </label>
  <label class="lb">你的专属参观链接</label>
  <div class="quick" style="margin-top:4px">
   <input id="share-url-input" readonly value="${esc(url)}" onclick="this.select()">
   <button type="button" class="btn btn-primary" onclick="copyShareUrl()">📋 复制链接</button>
  </div>
  <div class="m-actions">
   <button type="button" class="btn" onclick="closeModal();if(!UI.visitor)toggleVisitor()">👁 预览访客看到的画面</button>
   <button type="button" class="btn btn-primary" onclick="copyShareUrl()">✨ 复制并去分享</button>
  </div>`);
 if(getCloudConfig().enabled&&CLOUD.user)pushCloudMuseum(true);
}

async function toggleSharePublic(checked){
 CLOUD.isPublic=!!checked;
 S.isPublicShare=CLOUD.isPublic;
 await save();
 toast(CLOUD.isPublic?'🌍 已开启免登录分享链接':'🔒 已关闭分享链接，外人无法再通过链接访问');
}

async function copyShareUrl(){
 const url=getShareUrl();
 if(getCloudConfig().enabled&&CLOUD.user)pushCloudMuseum(true);
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText){
   await navigator.clipboard.writeText(url);
  }else{
   const inp=$('share-url-input');if(inp){inp.select();document.execCommand('copy')}
  }
  toast('✨ 分享链接已复制！直接粘贴发给朋友，对方免登录就能看');
 }catch(e){
  toast('请长按输入框复制分享链接');
 }
}

function leaveSharedAndCreateOwn(){
 try{
  const u=new URL(location.href);
  u.searchParams.delete('share');u.searchParams.delete('u');
  history.replaceState(null,'',u.pathname+u.search);
 }catch(e){}
 CLOUD.sharedMode=false;CLOUD.sharedCode='';UI.visitor=false;
 if(CLOUD.user){
  syncAfterLogin();
 }else{
  CLOUD.authMode='register';
  UI.view='auth';
  render();
  toast('✨ 注册一个账号，就能建造属于你自己的人生博物馆啦');
 }
}

/* ---------- 「⚙️ 我的」页面顶部的云端账号与分享卡片 ---------- */
function cloudAccountSectionHTML(){
 const cfg=getCloudConfig();
 if(!cfg.enabled){
  return `<div class="me-sec glass"><div class="sec-head"><div><h2 class="title-font">☁️ 云端同步与分享</h2><p class="hint">当前为浏览器本地模式 · 绑定云端后支持多设备同步与免登录分享链接</p></div><button class="btn btn-primary" onclick="openShareModal()">🔗 分享展馆</button></div></div>`;
 }
 const statusMap={
  idle:'☁️ 云端已就绪',
  syncing:'🔄 正在同步到云端…',
  synced:'✅ 已加密同步到云端',
  error:'⚠️ 云端同步暂缓（已保存在本地）',
  offline:'📴 离线保存中'
 };
 const email=(CLOUD.user&&CLOUD.user.email)||'未登录';
 return `<div class="me-sec glass">
  <div class="sec-head">
   <div>
    <h2 class="title-font">☁️ 我的云端账号与分享</h2>
    <p class="hint">📧 当前账号：<b>${esc(email)}</b> · <span id="cloud-sync-badge">${statusMap[CLOUD.syncState]||statusMap.idle}</span></p>
   </div>
   <button class="btn btn-primary" onclick="openShareModal()">🔗 分享给朋友看</button>
  </div>
  <div class="btn-row" style="margin-top:10px">
   <button class="btn sm" onclick="manualCloudSync()">🔄 立即同步云端</button>
   <button class="btn sm" onclick="openChangePasswordModal()">🔑 修改密码</button>
   <button class="btn sm danger" onclick="cloudLogout()">🚪 退出登录</button>
  </div>
 </div>`;
}

async function manualCloudSync(){
 if(!CLOUD.user){UI.view='auth';render();return}
 toast('🔄 正在与云端同步…');
 const ok=await pushCloudMuseum(true);
 toast(ok?'✅ 云端同步完成！所有回忆都是最新的':'⚠️ 同步未完成，请检查网络后再试');
}

function openChangePasswordModal(){
 MODAL_SOFT=true;
 openModal(`<h2 class="m-title title-font">🔑 修改登录密码</h2>
  <p class="sub" style="font-size:12px">账号：<b>${esc((CLOUD.user&&CLOUD.user.email)||'')}</b></p>
  <label class="lb">新密码 <span class="hint">（至少 6 位）</span></label>
  <input id="au-pass" type="password" autocomplete="new-password" placeholder="请输入新密码">
  <label class="lb">确认新密码</label>
  <input id="au-pass2" type="password" autocomplete="new-password" placeholder="请再次输入新密码" onkeydown="if(event.key==='Enter')cloudUpdatePassword()">
  <div class="m-actions">
   <button type="button" class="btn" onclick="closeModal()">取消</button>
   <button type="button" class="btn btn-primary" id="au-btn" onclick="cloudUpdatePassword()">✨ 保存新密码</button>
  </div>`);
}

function updateCloudBadges(){
 const el=$('cloud-sync-badge');
 if(el){
  const statusMap={idle:'☁️ 云端已就绪',syncing:'🔄 正在同步到云端…',synced:'✅ 已加密同步到云端',error:'⚠️ 同步暂缓（本地已存）',offline:'📴 本地已保存'};
  el.textContent=statusMap[CLOUD.syncState]||statusMap.idle;
 }
}
