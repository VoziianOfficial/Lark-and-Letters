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
function menu(open){nav.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open);toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');toggle.textContent=open?'×':'☰'}
toggle.addEventListener('click',()=>menu(!nav.classList.contains('open')));
document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false)});
nav.addEventListener('click',()=>menu(false));
const reducing=matchMedia('(prefers-reduced-motion:reduce)').matches;
all('.carousel').forEach(box=>{
  const slides=[...box.querySelectorAll('.slide')],buttons=box.querySelectorAll('button');
  let index=0,start=null;
  function show(step){index=(index+step+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.classList.add('ready');slide.classList.toggle('active',i===index)});box.querySelector('.controls span').textContent=slides.map((_,i)=>i===index?'●':'○').join('')}
  buttons[0].onclick=()=>show(-1);buttons[1].onclick=()=>show(1);
  box.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(e.key==='ArrowLeft'?-1:1)}});
  box.addEventListener('touchstart',e=>start=e.touches[0].clientX,{passive:true});
  box.addEventListener('touchend',e=>{if(start!==null){const delta=e.changedTouches[0].clientX-start;if(Math.abs(delta)>40)show(delta<0?1:-1)}start=null},{passive:true});
  if(box.closest('.services') && !reducing){
    let timer;
    function schedule(){
      clearTimeout(timer);
      if(!document.hidden && !box.contains(document.activeElement)){
        timer=setTimeout(()=>{show(1);schedule()},3500);
      }
    }
    box.addEventListener('click',schedule);
    box.addEventListener('touchend',schedule,{passive:true});
    box.addEventListener('focusin',()=>clearTimeout(timer));
    box.addEventListener('focusout',()=>requestAnimationFrame(schedule));
    document.addEventListener('visibilitychange',schedule);
    schedule();
  }
  show(0);
});
const policy=one('.policy');try{policy.hidden=localStorage.getItem('lark-policy')==='yes'}catch{policy.hidden=false}
policy.querySelector('button').onclick=()=>{policy.hidden=true;try{localStorage.setItem('lark-policy','yes')}catch{}};
if(!reducing){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('seen');observer.unobserve(entry.target)}}),{threshold:.09});
 all('section:not(.hero)>.wrap').forEach(el=>observer.observe(el));
 const hero=one('.service-scene .portrait');let queued=false;
 if(hero)window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(()=>{hero.style.transform='translateY('+Math.min(scrollY*.09,40)+'px)';queued=false})}},{passive:true});
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
 let index=0,startX=0;
 const previous=document.createElement('button'),next=document.createElement('button');
 for(const [button,delta,label] of [[previous,-1,'Previous'],[next,1,'Next']]){
  button.className='cyclebtn '+(delta>0?'next':'previous');
  button.setAttribute('aria-label',label+' '+(track.classList.contains('class-row')?'class':track.classList.contains('gallery-grid')?'photo':'tutor'));
  button.textContent=delta>0?'›':'‹';button.onclick=()=>shift(delta);track.append(button);
 }
 function render(){cards.forEach((card,i)=>{const position=(i-index+cards.length)%cards.length;card.hidden=position>=(mobile.matches?1:3);card.style.order=position;card.classList.toggle('featured-frame',position===(mobile.matches?0:1));card.classList.remove('incoming');if(!card.hidden)requestAnimationFrame(()=>card.classList.add('incoming'))})}
 function shift(delta){index=(index+delta+cards.length)%cards.length;render()}
 if(track.classList.contains('gallery-grid')&&!reducing){
  let timer;
  function advance(){
   clearTimeout(timer);
   if(!document.hidden&&!track.contains(document.activeElement))timer=setTimeout(()=>{shift(1);advance()},3000);
  }
  document.addEventListener('visibilitychange',advance);
  track.addEventListener('focusin',()=>clearTimeout(timer));
  track.addEventListener('focusout',()=>requestAnimationFrame(advance));
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
