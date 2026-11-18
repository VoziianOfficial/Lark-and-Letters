const one = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
// PHP reads this same file for every submission. Bypass browser/CDN caches so a
// changed recipient is also reflected in the email links after a page reload.
const config = location.protocol === 'file:' ? Promise.resolve(window.SITE_CONFIG) :
  fetch('site-config.php', {cache:'no-store',headers:{Accept:'application/json'}}).then(async response => {
    // Keep static previews usable; sending the form still requires PHP hosting.
    if(response.status===404 || (response.ok&&!response.headers.get('content-type')?.includes('application/json')))return window.SITE_CONFIG;
    if(!response.ok)throw Error('Site configuration is unavailable.');
    const site=await response.json();
    window.SITE_CONFIG=site;
    return site;
  });
config.then(site => {
  const fill = (selector,value) => all(selector).forEach(el => el.textContent=value);
  fill('[data-name]',site.name);
  fill('[data-footer]',site.footer);
  fill('[data-address]',site.address);
  fill('[data-disclaimer]',site.disclaimer);
  fill('[data-collab-title]',site.collaboration.title);
  fill('[data-collab-text]',site.collaboration.text);
  all('[data-logo]').forEach(el => el.src=site.logo);
  all('[data-email]').forEach(el => {el.href='mailto:'+site.email;el.textContent=site.email});
  all('[data-nav]').forEach(el => el.href=site.links[el.dataset.nav] || el.href);
  one('link[rel=icon]').href=site.favicon;
  document.title=document.body.dataset.title+' | '+site.tabTitle;
}).catch(()=>{});
const nav=one('nav'), toggle=one('.toggle');
const navMobile=matchMedia('(max-width:1199px)');
const menuBackground=[...document.body.children].filter(el=>el.matches('main,footer,.policy,.skip'));
const previousInert=new Map();
nav.id='site-navigation';
nav.setAttribute('aria-label','Main navigation');
toggle.setAttribute('aria-controls',nav.id);
function menu(open,restoreFocus=false){
 open=!!open&&navMobile.matches;
 const wasOpen=nav.classList.contains('open');
 nav.classList.toggle('open',open);
 nav.inert=navMobile.matches&&!open;
 document.body.classList.toggle('menu-open',open);
 toggle.setAttribute('aria-expanded',String(open));
 toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
 if(open&&!wasOpen){
  nav.scrollTop=0;
  menuBackground.forEach(el=>{previousInert.set(el,el.inert);el.inert=true});
 }else if(!open&&wasOpen){
  menuBackground.forEach(el=>{el.inert=previousInert.get(el)??false});
  previousInert.clear();
  const subject=nav.querySelector('.subject-trigger'),panel=nav.querySelector('.sub-list');
  nav.querySelector('.subnav').classList.remove('expanded');
  subject.setAttribute('aria-expanded','false');
  panel.inert=true;
  if(restoreFocus)toggle.focus({preventScroll:true});
 }
}
nav.inert=navMobile.matches;
navMobile.addEventListener('change',()=>menu(false));
toggle.addEventListener('click',()=>menu(!nav.classList.contains('open'),true));
document.addEventListener('keydown',e=>{
 if(!nav.classList.contains('open'))return;
 if(e.key==='Escape'){
  if(nav.querySelector('.subnav.expanded'))return;
  e.preventDefault();menu(false,true);
 }else if(e.key==='Tab'){
  const focusable=[...one('header').querySelectorAll('a[href],button')].filter(el=>!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const first=focusable[0],last=focusable.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
nav.addEventListener('click',e=>{if(e.target.closest('a[href]'))menu(false)});
one('header .brand').addEventListener('click',()=>menu(false));
const reducing=matchMedia('(prefers-reduced-motion:reduce)').matches;
function circularSlider(box,viewport,items,{visible=()=>1,autoplay=0,onChange=()=>{}}={}){
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 let index=0,turning=false,pending=0,animations=[],timer,hovered=false,inView=false,start=null;
 const count=()=>Math.min(visible(),items.length);
 const position=(i,direction=0)=>{const slot=(i-index+items.length)%items.length;return slot===items.length-1&&items.length>count()&&!(direction>0&&slot===count())?-1:slot};
 box.classList.add('circular-slider');
 viewport.classList.add('loop-viewport');
 items.forEach(item=>{
  item.hidden=false;item.classList.add('loop-item','ready');
  item.querySelectorAll('img').forEach(image=>{image.loading='eager';image.decode().catch(()=>{})});
 });
 function render(){
  const shown=count();
  viewport.style.setProperty('--loop-visible',shown);
  items.forEach((item,i)=>{
   const slot=position(i),active=slot>=0&&slot<shown;
   item.style.translate=`calc(${slot} * (100% + var(--loop-gap))) 0`;
   item.inert=!active;
   item.setAttribute('aria-hidden',String(!active));
   item.classList.toggle('active',active);
   item.classList.toggle('featured-frame',slot===(shown===1?0:1));
  });
  onChange(index);
 }
 function schedule(){
  clearTimeout(timer);
  if(autoplay&&inView&&!turning&&!hovered&&!motion.matches&&!document.hidden&&!box.contains(document.activeElement))timer=setTimeout(()=>shift(1),autoplay);
 }
 async function shift(delta){
  if(items.length<=count())return;
  delta=Math.sign(delta);
  if(turning){pending=delta;return}
  clearTimeout(timer);
  turning=true;
  const next=(index+delta+items.length)%items.length;
  try{
   if(!motion.matches){
    const distance=items[0].getBoundingClientRect().width+parseFloat(getComputedStyle(viewport).getPropertyValue('--loop-gap'));
    animations=items.map((item,i)=>{
     const from=position(i,delta)*distance;
     return item.animate([{translate:from+'px 0'},{translate:(from-delta*distance)+'px 0'}],{duration:680,easing:'cubic-bezier(.22,.68,.18,1)',fill:'forwards'});
    });
    await Promise.all(animations.map(animation=>animation.finished));
   }
  }catch(error){if(error.name!=='AbortError')throw error}
  finally{
   index=next;
   render();
   animations.forEach(animation=>animation.cancel());
   animations=[];
   turning=false;
   if(pending){const queued=pending;pending=0;shift(queued)}else schedule();
  }
 }
 box.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.target.matches('input,textarea,select'))return;
  event.preventDefault();shift(event.key==='ArrowLeft'?-1:1);
 });
 box.addEventListener('touchstart',event=>{start=event.touches.length===1?event.touches[0]:null;clearTimeout(timer)},{passive:true});
 box.addEventListener('touchend',event=>{
  if(start){const dx=event.changedTouches[0].clientX-start.clientX,dy=event.changedTouches[0].clientY-start.clientY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))shift(dx<0?1:-1)}
  start=null;schedule();
 },{passive:true});
 box.addEventListener('touchcancel',()=>{start=null;schedule()},{passive:true});
 box.addEventListener('focusin',()=>clearTimeout(timer));
 box.addEventListener('focusout',()=>requestAnimationFrame(schedule));
 box.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule()}});
 box.addEventListener('pointerleave',()=>{hovered=false;schedule()});
 document.addEventListener('visibilitychange',schedule);
 motion.addEventListener('change',()=>{animations.forEach(animation=>animation.finish());schedule()});
 new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;schedule()}).observe(box);
 new ResizeObserver(()=>{if(turning)animations.forEach(animation=>animation.finish());else render()}).observe(viewport);
 render();
 return {shift,refresh:()=>{if(turning)animations.forEach(animation=>animation.finish());else render()}};
}
all('.carousel').forEach(box=>{
 const slides=[...box.querySelectorAll('.slide')],buttons=box.querySelectorAll('.controls button');
 const slider=circularSlider(box,box.querySelector('.slides'),slides,{
  autoplay:box.closest('.services')?5500:0,
  onChange:index=>{box.querySelector('.controls span').textContent=slides.map((_,i)=>i===index?'●':'○').join('')}
 });
 buttons[0].onclick=()=>slider.shift(-1);
 buttons[1].onclick=()=>slider.shift(1);
});
const policy=one('.policy');try{policy.hidden=localStorage.getItem('lark-policy')==='yes'}catch{policy.hidden=false}
policy.querySelector('button').onclick=async event=>{
 if(event.currentTarget.disabled)return;
 event.currentTarget.disabled=true;
 try{localStorage.setItem('lark-policy','yes')}catch{}
 if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
  await policy.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(6px)'}],{duration:280,easing:'ease-out',fill:'forwards'}).finished;
 }
 policy.hidden=true;
};
if(!reducing){
 const hero=one('.service-scene .portrait');let queued=false;
 if(hero){
  const desktopHero=matchMedia('(min-width:1200px)');
  const positionHero=()=>{hero.style.transform=desktopHero.matches?'translateY('+Math.min(scrollY*.09,40)+'px)':''};
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(()=>{positionHero();queued=false})}},{passive:true});
  desktopHero.addEventListener('change',positionHero);
  positionHero();
 }
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target||a.origin!==location.origin||a.pathname===location.pathname||!a.pathname.endsWith('.html'))return;e.preventDefault();document.body.classList.add('loading');setTimeout(()=>location.assign(a.href),300)});
 window.addEventListener('pageshow',()=>document.body.classList.remove('loading'));
}
const form=one('#request-form');
if(form){
 const query=new URLSearchParams(location.search),topic=query.get('topic');
 if([...form.topic.options].some(o=>o.value===topic))form.topic.value=topic;
 const subject=query.get('subject'),plan=query.get('plan');
 if(subject||plan)form.message.value="I’m interested in "+(subject||plan).replaceAll('-',' ')+(plan?' lessons.':'.');
 form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('button'),status=form.querySelector('[role=status]');
  if(button.disabled)return;button.disabled=true;status.textContent='Sending…';
  try{
   const site=await config;
   const response=await fetch(site.form.endpoint,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'},cache:'no-store'});
   const data=await response.json();
   if(!response.ok||data.ok!==true){
    status.textContent=typeof data.message==='string'?data.message:'We could not send your request. Please try again or contact us by email.';
    return;
   }
   status.textContent=data.message||site.form.success;
   form.reset();
  }
  catch{status.textContent='We could not confirm sending your request. Your message is still here. Please try again or contact us by email.'}
  finally{button.disabled=false}
 });
}
config.then(site=>{
 const colors=['#8252a6','#ffbd00','#608343','#fb6941','#df478a'];
 all('[data-name]').forEach(el=>{el.textContent='';el.setAttribute('aria-label',site.name);Array.from(site.name).forEach((ch,i)=>{const letter=document.createElement('i');letter.setAttribute('aria-hidden','true');letter.style.color=colors[i%colors.length];letter.textContent=ch;el.append(letter)})});
}).catch(()=>{});
all('.rotator').forEach(box=>{
 const cards=[...box.children],mobile=matchMedia('(max-width:680px)');
 const viewport=document.createElement('div');
 viewport.append(...cards);box.append(viewport);
 if(!box.hasAttribute('tabindex'))box.tabIndex=0;
 box.setAttribute('aria-roledescription','carousel');
 const slider=circularSlider(box,viewport,cards,{visible:()=>mobile.matches?1:3,autoplay:box.classList.contains('gallery-grid')?5000:0});
 for(const [delta,label] of [[-1,'Previous'],[1,'Next']]){
  const button=document.createElement('button');
  button.type='button';button.className='cyclebtn '+(delta>0?'next':'previous');
  button.setAttribute('aria-label',label+' '+(box.classList.contains('class-row')?'class':box.classList.contains('gallery-grid')?'photo':'tutor'));
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  icon.setAttribute('class','ui-icon');icon.setAttribute('viewBox','0 0 24 24');
  icon.setAttribute('aria-hidden','true');icon.setAttribute('focusable','false');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',delta>0?'M5 12h14m-7-7 7 7-7 7':'M19 12H5m7-7-7 7 7 7');
  icon.append(path);button.append(icon);
  button.onclick=()=>slider.shift(delta);box.append(button);
 }
 mobile.addEventListener('change',slider.refresh);
});

config.then(site=>{
 const pricing=site.pricing;
 if(!pricing)return;
 for(const el of all('[data-duration]')){const session=pricing.sessions[el.dataset.duration];if(session)el.textContent=session.minutes+' min'}
 for(const el of all('[data-rate]')){
  const rate=pricing.sessions[el.dataset.rate];
  if(!rate)continue;
  el.querySelector('b').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:pricing.currency,maximumFractionDigits:2,minimumFractionDigits:0}).format(rate.amount);
  el.querySelector('small').textContent=el.classList.contains('course-price')?pricing.currency:pricing.currency+' · '+rate.minutes+' min';
 }
}).catch(()=>{});

const books = document.querySelectorAll('.booking-book');
if ('IntersectionObserver' in window) {
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('book-visible', entry.isIntersecting));
  });
  books.forEach(book => visibility.observe(book));
} else {
  books.forEach(book => book.classList.add('book-visible'));
}
