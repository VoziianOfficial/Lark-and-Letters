const one = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const config = Promise.resolve(window.SITE_CONFIG);
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
all('.carousel').forEach(box=>{
  const slides=[...box.querySelectorAll('.slide')],buttons=box.querySelectorAll('button');
  const isLesson=!!box.closest('.services');
  if(!isLesson)box.classList.add('fade-carousel');
  let index=0,start=null,turning=false,pendingStep=0,visual,rotor,faces,rotation;
  if(isLesson){
    visual=document.createElement('div');
    visual.className='lesson-visual';
    rotor=document.createElement('div');
    rotor.className='lesson-cube';
    visual.append(rotor);
    faces=slides.map((slide,i)=>{
      const image=slide.querySelector(':scope > img');
      image.classList.add('lesson-face');
      image.hidden=i!==0;
      image.loading='eager';
      rotor.append(image);
      image.decode().catch(()=>{});
      return image;
    });
    box.querySelector('.slides').append(visual);
    box.classList.add('lesson-carousel');
    const resizeCube=()=>{
      if(rotation)rotation.finish();
      visual.style.setProperty('--cube-depth',visual.clientWidth/2+'px');
      visual.style.perspective=visual.clientWidth*3+'px';
    };
    new ResizeObserver(resizeCube).observe(visual);
    resizeCube();
  }
  function render(){
    slides.forEach((slide,i)=>{
      slide.classList.add('ready');
      slide.classList.toggle('active',i===index);
      slide.inert=i!==index;
      slide.setAttribute('aria-hidden',String(i!==index));
    });
    box.querySelector('.controls span').textContent=slides.map((_,i)=>i===index?'●':'○').join('');
  }
  async function show(step){
    if(turning){pendingStep=step;return}
    const next=(index+step+slides.length)%slides.length;
    if(!isLesson||!step||matchMedia('(prefers-reduced-motion:reduce)').matches){
      index=next;
      render();
      if(faces)faces.forEach((face,i)=>face.hidden=i!==index);
      return;
    }
    turning=true;
    const previous=index,direction=step>0?1:-1;
    try{
      await faces[next].decode().catch(()=>{});
      faces[next].style.transform='rotateY('+direction*90+'deg) translateZ(var(--cube-depth))';
      faces[next].hidden=false;
      index=next;
      render();
      const depth=visual.clientWidth/2;
      rotation=rotor.animate([
        {transform:'translateZ(-'+depth+'px) rotateY(0deg)'},
        {transform:'translateZ(-'+depth+'px) rotateY('+(-direction*90)+'deg)'}
      ],{duration:1100,easing:'cubic-bezier(.22,.7,.18,1)',fill:'forwards'});
      await rotation.finished;
    }finally{
      faces[previous].hidden=true;
      faces[next].style.transform='';
      rotation?.cancel();
      rotation=null;
      turning=false;
      if(pendingStep){const queued=pendingStep;pendingStep=0;show(queued)}
    }
  }
  buttons[0].onclick=()=>show(-1);buttons[1].onclick=()=>show(1);
  box.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(e.key==='ArrowLeft'?-1:1)}});
  box.addEventListener('touchstart',e=>start=e.touches[0].clientX,{passive:true});
  box.addEventListener('touchend',e=>{if(start!==null){const delta=e.changedTouches[0].clientX-start;if(Math.abs(delta)>40)show(delta<0?1:-1)}start=null},{passive:true});
  if(isLesson && !reducing){
    let timer,hovered=false;
    function schedule(){
      clearTimeout(timer);
      if(!document.hidden && !hovered && !box.contains(document.activeElement)){
        timer=setTimeout(async()=>{await show(1);schedule()},5500);
      }
    }
    box.addEventListener('click',schedule);
    box.addEventListener('touchend',schedule,{passive:true});
    box.addEventListener('focusin',()=>clearTimeout(timer));
    box.addEventListener('focusout',()=>requestAnimationFrame(schedule));
    box.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule()}});
    box.addEventListener('pointerleave',()=>{hovered=false;schedule()});
    document.addEventListener('visibilitychange',schedule);
    schedule();
  }
  show(0);
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
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('seen');observer.unobserve(entry.target)}}),{threshold:.09});
 all('section:not(.hero)>.wrap').forEach(el=>observer.observe(el));
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
  try{const site=await config;const response=await fetch(site.form.endpoint,{method:'POST',body:new FormData(form)});const data=await response.json();if(!response.ok||data.ok!==true)throw Error();status.textContent=site.form.success;form.reset()}
  catch{status.textContent='We could not send your request. Your message is still here. Please try again or contact us by email.'}
  finally{button.disabled=false}
 });
}
config.then(site=>{
 const colors=['#8252a6','#ffbd00','#608343','#fb6941','#df478a'];
 all('[data-name]').forEach(el=>{el.textContent='';el.setAttribute('aria-label',site.name);Array.from(site.name).forEach((ch,i)=>{const letter=document.createElement('i');letter.setAttribute('aria-hidden','true');letter.style.color=colors[i%colors.length];letter.textContent=ch;el.append(letter)})});
}).catch(()=>{});
all('.rotator').forEach(track=>{
 const cards=[...track.children],mobile=matchMedia('(max-width:680px)');
 let index=0,startX=0,shifting=false,pending=0;
 const previous=document.createElement('button'),next=document.createElement('button');
 for(const [button,delta,label] of [[previous,-1,'Previous'],[next,1,'Next']]){
  button.className='cyclebtn '+(delta>0?'next':'previous');
  button.setAttribute('aria-label',label+' '+(track.classList.contains('class-row')?'class':track.classList.contains('gallery-grid')?'photo':'tutor'));
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  icon.setAttribute('class','ui-icon');
  icon.setAttribute('viewBox','0 0 24 24');
  icon.setAttribute('aria-hidden','true');
  icon.setAttribute('focusable','false');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',delta>0?'M5 12h14m-7-7 7 7-7 7':'M19 12H5m7-7-7 7 7 7');
  icon.append(path);button.append(icon);
  button.onclick=()=>shift(delta);track.append(button);
 }
 function render(){cards.forEach((card,i)=>{const position=(i-index+cards.length)%cards.length;card.hidden=position>=(mobile.matches?1:3);card.style.order=position;card.classList.toggle('featured-frame',position===(mobile.matches?0:1))})}
 async function shift(delta){
  if(shifting){pending=delta;return}
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){index=(index+delta+cards.length)%cards.length;render();return}
  shifting=true;
  const oldHeight=track.getBoundingClientRect().height;
  const animations=cards.filter(card=>!card.hidden).map(card=>card.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out',fill:'forwards'}));
  try{
   await Promise.all(animations.map(animation=>animation.finished));
   index=(index+delta+cards.length)%cards.length;
   render();
   const newHeight=track.getBoundingClientRect().height;
   const height=track.animate([{height:oldHeight+'px'},{height:newHeight+'px'}],{duration:440,easing:'cubic-bezier(.22,.68,.18,1)'});
   animations.forEach(animation=>animation.cancel());
   const incoming=cards.filter(card=>!card.hidden).map(card=>card.animate([{opacity:0},{opacity:1}],{duration:440,easing:'cubic-bezier(.22,.68,.18,1)'}));
   await Promise.all([height.finished,...incoming.map(animation=>animation.finished)]);
  }finally{
   animations.forEach(animation=>animation.cancel());
   shifting=false;
   if(pending){const queued=pending;pending=0;shift(queued)}
  }
 }
 if(track.classList.contains('gallery-grid')&&!reducing){
  let timer,hovered=false;
  function advance(){
   clearTimeout(timer);
   if(!document.hidden&&!hovered&&!track.contains(document.activeElement))timer=setTimeout(async()=>{await shift(1);advance()},5000);
  }
  document.addEventListener('visibilitychange',advance);
  track.addEventListener('focusin',()=>clearTimeout(timer));
  track.addEventListener('focusout',()=>requestAnimationFrame(advance));
  track.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;advance()}});
  track.addEventListener('pointerleave',()=>{hovered=false;advance()});
  advance();
 }
 mobile.addEventListener('change',render);
 track.addEventListener('touchstart',e=>startX=e.touches[0].clientX,{passive:true});
 track.addEventListener('touchend',e=>{const diff=e.changedTouches[0].clientX-startX;if(Math.abs(diff)>45)shift(diff<0?1:-1)},{passive:true});
 track.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();shift(e.key==='ArrowLeft'?-1:1)}});
 render();
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
