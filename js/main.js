/* =========================================================
 * main.js · 路由、导航、全局事件与启动初始化
 * ========================================================= */

function updateNavMarker(){
 const tabs=document.querySelector('.tabs'),active=tabs&&tabs.querySelector('.tab.on');if(!tabs||!active)return;
 let marker=tabs.querySelector('.nav-marker');if(!marker){marker=document.createElement('i');marker.className='nav-marker';marker.setAttribute('aria-hidden','true');tabs.appendChild(marker)}
 const a=active.getBoundingClientRect(),b=tabs.getBoundingClientRect();
 tabs.style.setProperty('--nav-x',(a.left-b.left+tabs.scrollLeft+a.width/2-12)+'px');tabs.style.setProperty('--nav-visible','1');
 const offset=Math.max(80,($('nav').getBoundingClientRect().height||0)+12);document.documentElement.style.setProperty('--stage-offset',offset+'px');
}

function updateNav(){
 const v=UI.view,hide=['setup','entrance','onboard','auth'].includes(v);
 $('nav').style.display=hide?'none':'flex';
 document.body.classList.toggle('has-nav',!hide);
 document.body.classList.toggle('is-visitor',!!UI.visitor);
 const act=['hall','timeline','search'].includes(v)?'explore':v;
 document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===act));
 ['tab-studio','tab-me','btn-add'].forEach(id=>{$(id).style.display=UI.visitor?'none':''});
 const shareBtn=$('btn-share');
 if(shareBtn)shareBtn.style.display=UI.visitor?'none':'';
 const shared=typeof CLOUD!=='undefined'&&CLOUD.sharedMode;
 $('btn-visitor').textContent=shared?'✨ 我也要建馆':(UI.visitor?'🔓 退出访客':'👁 访客视角');
 const vbar=$('visitor-bar');
 if(vbar){
  vbar.style.display=UI.visitor?'flex':'none';
  if(shared){
   const ownerName=esc((S.profile&&S.profile.name)||'朋友');
   vbar.innerHTML=`<span>👁 正在参观「${ownerName}」的人生博物馆</span><button class="btn" onclick="leaveSharedAndCreateOwn()">✨ 我也要建一座</button>`;
  }else{
   vbar.innerHTML=`<span>👁 访客视角：独家记忆已隐藏</span><button class="btn" onclick="toggleVisitor()">退出</button>`;
  }
 }
 updateNavMarker();
}

function render(){
 ensureV3();
 if(UI.view==='entrance'&&S.profile&&!S.onboarded&&!UI.visitor&&typeof renderOnboard==='function')UI.view='onboard';
 syncCustomMoods(true);
 if(typeof motionSearchTimer!=='undefined')clearTimeout(motionSearchTimer);
 if(typeof motionSearchSerial!=='undefined')motionSearchSerial++;
 const key=UI.view+'|'+(UI.view==='hall'?UI.hall:'');
 const routeChanged=key!==motionLastRoute;
 if(!motionRouting&&routeChanged&&motionLastRoute)motionRouteSerial++;
 const map={auth:typeof renderAuthScreen==='function'?renderAuthScreen:renderSetup,setup:renderSetup,entrance:renderEntrance,explore:renderExplore,hall:()=>renderHall(UI.hall),timeline:renderTimeline,search:renderSearch,studio:()=>renderStudio(),stars:()=>renderStars(),me:()=>renderMe()};
 $('view').innerHTML=`<div class="view">${(map[UI.view]||renderExplore)()}</div>`;
 updateNav();
 if(UI.view==='stars'&&typeof initCons==='function')initCons();
 const view=$('view').firstElementChild;
 if(routeChanged){view.classList.add('route-enter','motion-active');setTimeout(()=>view.classList.remove('route-enter','motion-active'),motionCalm()?0:320);revealCards(view);motionLastRoute=key}
 prepareInteractiveElements(view);prepareInteractiveElements($('nav'));updateNavMarker();
 if(UI.view==='search')highlightMuseumSearch($('museum-search-results'),UI.query||'');
 applyPromptBatch(false);
}

async function go(v,h){
 if(UI.visitor&&(v==='studio'||v==='me'))v='explore';
 const serial=++motionRouteSerial,previous=$('view').firstElementChild;
 const changed=v!==UI.view||(v==='hall'&&h&&h!==UI.hall);
 if(changed&&previous&&!motionCalm()){previous.classList.remove('route-enter');previous.classList.add('route-leave','motion-active');await motionDelay(150);if(serial!==motionRouteSerial)return}
 if(h&&h!==UI.hall)UI.hallType='all';UI.view=v;if(h)UI.hall=h;
 closeModal(true);motionRouting=true;render();motionRouting=false;window.scrollTo({top:0,behavior:'instant'});
}

/* ---------- 全局事件 ---------- */
let navResizeFrame=0;
addEventListener('resize',()=>{cancelAnimationFrame(navResizeFrame);navResizeFrame=requestAnimationFrame(updateNavMarker)});
document.querySelector('.tabs').addEventListener('scroll',()=>{cancelAnimationFrame(navResizeFrame);navResizeFrame=requestAnimationFrame(updateNavMarker)},{passive:true});
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')tryClose()});
document.addEventListener('keydown',e=>{
 const m=$('modal');if(!m.classList.contains('show'))return;
 if(e.key==='Escape'){tryClose();return}
 if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&$('c-img')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){carMove(e.key==='ArrowLeft'?-1:1);return}
 if(e.key!=='Tab')return;
 const controls=[...m.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length);
 if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];
 if(e.shiftKey&&(document.activeElement===first||document.activeElement===m.querySelector('.modal-box'))){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('motion-paused',document.hidden);if(document.hidden){cancelAnimationFrame(CONS.raf);CONS.raf=0}else if(UI.view==='stars'&&$('cons')&&CONS.resume)CONS.resume()});
/* 手机端软键盘弹出时，自动把正在输入的框滚到可视区域中间，避免被键盘或底部按钮栏挡住 */
document.addEventListener('focusin',e=>{
 const el=e.target;
 if(!el||!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.type==='checkbox'||el.type==='file'||el.type==='range')return;
 if(innerWidth>768)return;
 setTimeout(()=>{if(document.activeElement===el&&el.scrollIntoView)el.scrollIntoView({block:'center',behavior:'smooth'})},280);
});

/* ---------- 启动初始化（支持本地存储、云端登录同步、邮件回调与免登录分享链接） ---------- */
(async function init(){
 const loaded=await loadMuseumState(),d=loaded.data,first=!d||d.v22!==true;
 S=migrate(d);
 applyMuseumUI(S.ui,false);
 if(first||loaded.recoveredLocal)await _origLocalSave();
 if(S.profile)SETUP_AV=S.profile.avatar||'🌙';

 const cfg=typeof getCloudConfig==='function'?getCloudConfig():{enabled:false};
 const urlInfo=typeof parseUrlAuthAndShare==='function'?parseUrlAuthAndShare():{};

 /* 邮件回调先核实令牌所属账号，再保存会话或打开重置密码页面。 */
 if(cfg.enabled&&(urlInfo.session||urlInfo.error)){
  let message=urlInfo.error;
  if(urlInfo.session){
   $('view').textContent='正在确认邮件链接…';
   try{
    const user=await supaFetch('/auth/v1/user',{token:urlInfo.session.access_token});
    if(!user||!user.id)throw new Error('无法确认邮箱账号');
    saveSession({...urlInfo.session,user});
    CLOUD.pendingEmail=user.email||'';
   }catch(e){
    message='无法确认这个邮件链接的登录状态。如果邮箱已验证，请直接登录。';
   }
  }
  if(message){
   CLOUD.authMode='login';UI.view='auth';
   render();showAuthMessage(message);
  }else if(urlInfo.recovery){
   CLOUD.authMode='reset';UI.view='auth';
   render();showAuthMessage('请设置你的新登录密码。');
  }else{
   toast('🎉 邮箱验证成功！欢迎来到你的人生博物馆');
   await syncAfterLogin();
  }
  return;
 }

 /* 1. 朋友点开分享链接（?share=xxx）：免登录直接进入只读访客参观模式 */
 if(urlInfo.share&&cfg.enabled){
  try{
   const sharedData=await loadSharedMuseumByCode(urlInfo.share);
   if(sharedData){
    CLOUD.sharedMode=true;
    CLOUD.sharedCode=urlInfo.share;
    UI.visitor=true;
    S=migrate(sharedData);
    applyMuseumUI(S.ui,false);
    UI.view='entrance';
    render();
    toast(`👁 欢迎参观「${(S.profile&&S.profile.name)||'朋友'}」的人生博物馆`);
    return;
   }else{
    toast('⚠️ 这个分享链接已关闭或不存在');
   }
  }catch(e){
   toast('⚠️ 暂时无法加载分享的博物馆，请稍后再试');
  }
 }

 /* 2. 云端模式已启用：检查登录状态，已登录则自动拉取云端数据，未登录则显示登录/注册页 */
 if(cfg.enabled){
  loadSavedSession();
  if(await ensureValidSession()){
   await syncAfterLogin();
   return;
  }
  UI.view='auth';
  render();
  return;
 }

 /* 3. 本地独立运行模式（未配置云端时完全兼容原有单机体验） */
 UI.view=S.profile?'entrance':'setup';
 render();
 if(first&&S.exhibits.length)setTimeout(()=>toast('✨ 已升级到 2.2，'+S.exhibits.length+' 段回忆都在'),900);
})();
