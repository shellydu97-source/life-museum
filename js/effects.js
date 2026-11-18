/* =========================================================
 * effects.js · 星空画布、3D 倾斜、折叠动画、粒子与无障碍交互辅助
 * ========================================================= */

const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const motionCalm=()=>motionQuery.matches;
const motionDelay=ms=>new Promise(resolve=>setTimeout(resolve,motionCalm()?0:ms));
let motionRouteSerial=0,motionRouting=false,motionLastRoute='',motionModalSerial=0,motionModalTimer=0,motionReturnFocus=null,motionSearchTimer=0,motionSearchSerial=0,motionSaving=false,motionDeleting=new Set(),motionCarSerial=0,toastT=0;

function motionOnce(el,className,ms){
 if(!el)return;el.classList.remove(className);requestAnimationFrame(()=>{if(!el.isConnected)return;el.classList.add(className,'motion-active');setTimeout(()=>{el.classList.remove(className,'motion-active')},motionCalm()?0:ms)});
}
function revealCards(root,step=40){
 if(!root)return;
 const all=[...root.querySelectorAll('.door,.mode-card,.ex-card,.type-opt,.mini-type,.pending,.stat')].filter(el=>!el.closest('.stage-panel,.theme-panel'));
 all.forEach((el,i)=>{el.style.setProperty('--enter-delay',(motionCalm()?0:Math.min(i,11)*step)+'ms');el.classList.add('reveal-item','motion-active');setTimeout(()=>{el.classList.remove('reveal-item','motion-active');el.style.removeProperty('--enter-delay')},motionCalm()?0:480+Math.min(i,11)*step)});
}
function enhanceDetails(root){
 root.querySelectorAll('details.more').forEach(details=>{
  if(details.dataset.enhanced)return;details.dataset.enhanced='true';const summary=details.querySelector('summary'),wasOpen=details.open;
  const fold=document.createElement('div'),inner=document.createElement('div');fold.className='detail-fold';inner.className='detail-fold-inner';
  [...details.childNodes].filter(n=>n!==summary).forEach(n=>inner.appendChild(n));fold.appendChild(inner);details.appendChild(fold);details.open=true;
  details.classList.toggle('detail-open',wasOpen);fold.inert=!wasOpen;summary.setAttribute('aria-expanded',String(wasOpen));
  summary.addEventListener('click',e=>{e.preventDefault();const open=!details.classList.contains('detail-open');details.classList.toggle('detail-open',open);fold.inert=!open;summary.setAttribute('aria-expanded',String(open));details.classList.add('motion-active');setTimeout(()=>details.classList.remove('motion-active'),motionCalm()?0:450)});
 });
}
function prepareInteractiveElements(root){
 if(!root)return;
 root.querySelectorAll('[onclick]:not(button):not(input):not(select):not(textarea):not(label):not(summary)').forEach(el=>{
  if(el.matches('.modal-box')||el.closest('button'))return;
  if(!el.hasAttribute('tabindex'))el.tabIndex=0;if(!el.hasAttribute('role'))el.setAttribute('role','button');
  if(!el.dataset.motionKeyboard){el.dataset.motionKeyboard='1';el.addEventListener('keydown',e=>{if(e.target!==el||!['Enter',' '].includes(e.key))return;e.preventDefault();el.click()})}
 });
}

/* 3D 视差高光与倾斜（触屏或无悬停设备上关闭） */
const hasHoverPointer=matchMedia('(hover: hover) and (pointer: fine)');
let motionTilt=null,motionTiltPointer=null,motionTiltFrame=0;
function resetMotionTilt(){if(motionTilt){motionTilt.style.removeProperty('--rx');motionTilt.style.removeProperty('--ry');motionTilt.classList.remove('motion-active');motionTilt=null}}
document.addEventListener('pointermove',e=>{
 if(motionCalm()||!hasHoverPointer.matches||e.pointerType==='touch')return;motionTiltPointer={target:e.target,x:e.clientX,y:e.clientY};if(motionTiltFrame)return;
 motionTiltFrame=requestAnimationFrame(()=>{motionTiltFrame=0;const p=motionTiltPointer,el=p.target.closest&&p.target.closest('.tilt');if(motionTilt&&motionTilt!==el)resetMotionTilt();if(!el)return;motionTilt=el;const r=el.getBoundingClientRect(),px=(p.x-r.left)/r.width,py=(p.y-r.top)/r.height;el.style.setProperty('--mx',px*100+'%');el.style.setProperty('--my',py*100+'%');el.style.setProperty('--rx',(.5-py)*10+'deg');el.style.setProperty('--ry',(px-.5)*12+'deg');el.classList.add('motion-active')});
},{passive:true});
document.addEventListener('pointerout',e=>{if(motionTilt&&!motionTilt.contains(e.relatedTarget))resetMotionTilt()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(motionTiltFrame);motionTiltFrame=0;resetMotionTilt()}});

/* 折叠容器动画 */
const motionFoldCleanup=new WeakMap();
function animateMotionFold(section,open,kind,head){
 const panel=section.querySelector(kind==='stage'?'.stage-panel':'.theme-panel'),cls=kind==='stage'?'stage-open':'theme-open';
 const oldCleanup=motionFoldCleanup.get(panel);if(oldCleanup)oldCleanup();
 panel.style.setProperty('--fold-duration',(open?450:250)+'ms');section.classList.toggle(cls,open);panel.inert=!open;panel.setAttribute('aria-hidden',String(!open));section.querySelector('.stage-head').setAttribute('aria-expanded',String(open));panel.classList.add('motion-active');
 let timer=0,finished=false;const cleanup=()=>{clearTimeout(timer);panel.removeEventListener('transitionend',end);panel.classList.remove('motion-active');motionFoldCleanup.delete(panel)};
 const finish=()=>{if(finished)return;finished=true;cleanup();if(open&&section.isConnected&&section.classList.contains(cls)){prepareInteractiveElements(panel);if(head)head.scrollIntoView({block:'start',behavior:motionCalm()?'instant':'smooth'})}};
 const end=e=>{if(e.target===panel&&e.propertyName==='grid-template-rows')finish()};motionFoldCleanup.set(panel,cleanup);if(motionCalm())finish();else{panel.addEventListener('transitionend',end);timer=setTimeout(finish,open?470:270)}
}

/* 保存时的 10 颗轻量星星 */
function motionSaveParticles(point){
 if(motionCalm())return;
 for(let i=0;i<10;i++){const star=document.createElement('i'),angle=i*Math.PI*2/10,distance=36+Math.random()*38;star.className='save-particle motion-active';star.textContent=i%2?'✦':'✧';star.style.left=point.x+'px';star.style.top=point.y+'px';star.style.setProperty('--dx',Math.cos(angle)*distance+'px');star.style.setProperty('--dy',Math.sin(angle)*distance+'px');star.style.setProperty('--spin',(Math.random()*120-60)+'deg');document.body.appendChild(star);setTimeout(()=>star.remove(),610)}
}
function saveButtonPoint(){const button=$('e-save')||document.activeElement,r=button&&button.getBoundingClientRect?button.getBoundingClientRect():null;return r&&r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:innerWidth/2,y:innerHeight/2}}

/* 提示条 */
function toast(message){const node=$('toast');node.textContent=message;node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>node.classList.remove('show'),2000)}

/* 星空特效（手机端自动减少粒子密度与上限，保证滑动流畅不发烫） */
(function(){
 const c=$('sky'),x=c.getContext('2d');let dpr=Math.min(window.devicePixelRatio||1,2),C=['255,182,230','168,200,255','255,226,154','255,255,255','200,170,255'];
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let calm=preference.matches,W,H,stars=[],shoots=[],parts=[],lastM=0,raf=0,resizeRaf=0,fadeTimer=0,enabled=true,requested=true,fading=false,pointer=null;
 function size(){W=innerWidth;H=innerHeight;const mob=W<=768;dpr=Math.min(window.devicePixelRatio||1,mob?1.5:2);c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';x.setTransform(dpr,0,0,dpr,0,0);
  const maxStars=mob?75:260,areaDiv=mob?9500:5500;
  stars=Array.from({length:Math.min(maxStars,Math.floor(W*H/areaDiv))},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.2,t:Math.random()*6.3,s:Math.random()*.03+.005,v:Math.random()*.06+.01,c:C[Math.floor(Math.random()*C.length)]}))}
 function dot(px,py,r,col,a){x.fillStyle=`rgba(${col},${a})`;x.beginPath();x.arc(px,py,r,0,6.283);x.fill()}
 function draw(){
  x.clearRect(0,0,W,H);
  for(const s of stars){if(!calm){s.t+=s.s;s.y-=s.v;if(s.y<-2){s.y=H+2;s.x=Math.random()*W}}const a=.25+(Math.sin(s.t)+1)*.35;dot(s.x,s.y,s.r,s.c,a);if(s.r>1.2)dot(s.x,s.y,s.r*3.5,s.c,a*.12)}
  if(!calm&&pointer){parts.push({x:pointer.x,y:pointer.y,vx:(Math.random()-.5)*.8,vy:Math.random()*.5+.2,life:1,d:.022,r:Math.random()*1.8+.7,c:C[Math.floor(Math.random()*C.length)],g:0});pointer=null}
  if(!calm&&shoots.length<(W<=768?1:2)&&Math.random()<(W<=768?.0025:.005))shoots.push({x:W*(.3+Math.random()*.7),y:H*Math.random()*.4,vx:-(7+Math.random()*5),vy:3+Math.random()*2,life:1});
  shoots=shoots.filter(s=>{s.x+=s.vx;s.y+=s.vy;s.life-=.012;const g=x.createLinearGradient(s.x,s.y,s.x-s.vx*14,s.y-s.vy*14);g.addColorStop(0,`rgba(255,255,255,${Math.max(s.life,0)})`);g.addColorStop(1,'rgba(255,182,230,0)');x.strokeStyle=g;x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(s.x,s.y);x.lineTo(s.x-s.vx*14,s.y-s.vy*14);x.stroke();return s.life>0&&s.x>-200&&s.y<H+200});
  const maxParts=W<=768?200:600;
  if(parts.length>maxParts)parts.splice(0,parts.length-maxParts);
  parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.98;p.life-=p.d;if(p.life<=0)return false;dot(p.x,p.y,p.r*p.life+.3,p.c,p.life);dot(p.x,p.y,p.r*3*p.life,p.c,p.life*.15);return true});
 }
 function frame(){raf=0;if(document.hidden||(!enabled&&!fading))return;draw();if(!calm&&(enabled||fading))raf=requestAnimationFrame(frame)}
 function resume(){if(document.hidden||(!enabled&&!fading)||raf)return;if(calm)draw();else raf=requestAnimationFrame(frame)}
 function pause(){cancelAnimationFrame(raf);raf=0}
 window.burst=(px,py,n=60)=>{if(calm||document.hidden||!requested)return;const cnt=innerWidth<=768?Math.min(n,32):n;for(let i=0;i<cnt;i++){const a=Math.random()*6.283,sp=Math.random()*6+2;parts.push({x:px,y:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,life:1,d:Math.random()*.012+.008,r:Math.random()*2.5+1,c:C[i%C.length],g:.08})}resume()};
 addEventListener('mousemove',e=>{const n=performance.now();if(calm||document.hidden||!requested||!hasHoverPointer.matches||n-lastM<28)return;lastM=n;pointer={x:e.clientX,y:e.clientY}});
 addEventListener('resize',()=>{cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;size();if(!document.hidden&&(enabled||fading)){if(calm)draw();else resume()}})});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();pointer=null;shoots=[];parts=[]}else resume()});
 if(preference.addEventListener)preference.addEventListener('change',e=>{calm=e.matches;pointer=null;shoots=[];parts=[];pause();resume()});
 function setEnabled(value){
  const next=value!==false;
  if(next===requested)return;
  requested=next;clearTimeout(fadeTimer);
  if(next){enabled=true;fading=false;c.style.opacity='1';c.style.removeProperty('will-change');resume()}
  else{fading=true;c.style.willChange='opacity';c.style.opacity='0';resume();fadeTimer=setTimeout(()=>{if(requested)return;enabled=false;fading=false;pause();pointer=null;shoots=[];parts=[];c.style.removeProperty('will-change')},calm?0:480)}
 }
 window.museumSky={setEnabled,setPalette(colors){if(!Array.isArray(colors)||!colors.length)return;const next=colors.filter(v=>typeof v==='string'&&/^\d{1,3},\d{1,3},\d{1,3}$/.test(v));if(!next.length||next.join('|')===C.join('|'))return;C=[...next];stars.forEach((s,i)=>s.c=C[i%C.length]);parts=[];shoots=[];if(!document.hidden&&enabled)draw()},redraw(){if(!document.hidden&&enabled)draw()},get enabled(){return requested}};
 size();resume();
})();
