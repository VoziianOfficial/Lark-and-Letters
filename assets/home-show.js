(() => {
 const hero = document.querySelector('.home-show');
 const heading = hero.querySelector('h1');
 const buttons = [...hero.querySelectorAll('.scene-switch button')];
 const parts = [...hero.querySelectorAll('.hero-part')];
 const titles = buttons.map(button => button.getAttribute('aria-label'));
 const headings = titles.map((title,index) => {
  const layer=document.createElement('span');
  layer.className='hero-heading'+(index===0?' is-current':'');
  layer.textContent=title;
  layer.setAttribute('aria-hidden','true');
  return layer;
 });
 heading.replaceChildren(...headings);
 heading.setAttribute('aria-label',titles[0]);
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 let active = 0;
 let timer;
 let start;
 let inView = true;
 let hovered = false;
 let changing = false;
 let pending = null;
 const imagesReady=Promise.all(parts.map(part=>typeof part.decode==='function'?part.decode().catch(()=>{}):Promise.resolve()));

 function commit(index) {
  active = index;
  hero.dataset.current = String(active);
  heading.setAttribute('aria-label',titles[active]);
  headings.forEach((layer,i)=>layer.classList.toggle('is-current',i===active));
  parts.forEach(part => {
   const current = Number(part.dataset.scene) === active;
   part.classList.toggle('is-current', current);
   part.setAttribute('aria-hidden', String(!current));
  });
  buttons.forEach((button,i) => button.setAttribute('aria-pressed',String(active === i)));
 }
 async function select(index) {
  const next=((index%titles.length)+titles.length)%titles.length;
  const direction=index===active-1?-1:index===active+1?1:((next-active+titles.length)%titles.length<=titles.length/2?1:-1);
  if(changing){pending=index;return}
  if(next===active){schedule();return}
  changing=true;
  clearTimeout(timer);
  await imagesReady;
  const outgoing=[...parts.filter(part=>Number(part.dataset.scene)===active),headings[active]];
  const incoming=[...parts.filter(part=>Number(part.dataset.scene)===next),headings[next]];
  const animations=[];
  try{
   commit(next);
   if(!motion.matches){
    const distance=Math.min(hero.clientWidth*.18,220);
    for(const [layers,entering] of [[outgoing,false],[incoming,true]]){
     for(const layer of layers){
      layer.style.visibility='visible';
      animations.push(layer.animate(entering?
       [{translate:direction*distance+'px 0',opacity:0},{translate:'0px 0',opacity:1}]:
       [{translate:'0px 0',opacity:1},{translate:-direction*distance+'px 0',opacity:0}],
       {duration:720,easing:'cubic-bezier(.22,.68,.18,1)',fill:'forwards'}));
     }
    }
    await Promise.all(animations.map(animation=>animation.finished));
   }
  }finally{
   [...outgoing,...incoming].forEach(layer=>layer.style.visibility='');
   animations.forEach(animation=>animation.cancel());
   changing=false;
   if(pending!==null){const queued=pending;pending=null;select(queued)}else schedule();
  }
 }
 function schedule() {
  clearTimeout(timer);
  if (inView && !changing && !hovered && !hero.contains(document.activeElement) && !motion.matches && !document.hidden) timer = setTimeout(() => select(active + 1), 5500);
 }
 buttons.forEach((button,i) => button.addEventListener('click', () => select(i)));
 hero.tabIndex=0;
 hero.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(active+(e.key==='ArrowLeft'?-1:1))}});
 hero.addEventListener('touchstart', e => {start = e.touches.length===1?e.touches[0]:null;clearTimeout(timer)}, {passive:true});
 hero.addEventListener('touchend', e => {
  if (!start) return;
  const dx = e.changedTouches[0].clientX - start.clientX;
  const dy = e.changedTouches[0].clientY - start.clientY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
  start = null;schedule();
 }, {passive:true});
 hero.addEventListener('touchcancel',()=>{start=null;schedule()},{passive:true});
 new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; schedule()}).observe(hero);
 document.addEventListener('visibilitychange',schedule);
 hero.addEventListener('focusin',()=>clearTimeout(timer));
 hero.addEventListener('focusout',()=>requestAnimationFrame(schedule));
 hero.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule()}});
 hero.addEventListener('pointerleave',()=>{hovered=false;schedule()});
 motion.addEventListener('change',schedule);
 schedule();
})();
