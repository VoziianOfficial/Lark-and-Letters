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
 const delay=duration=>new Promise(resolve=>setTimeout(resolve,duration));

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
  const next=(index+titles.length)%titles.length;
  if(changing){pending=next;return}
  if(next===active){schedule();return}
  changing=true;
  clearTimeout(timer);
  await imagesReady;
  if(!motion.matches){hero.classList.add('is-changing');await delay(180)}
  commit(pending??next);
  pending=null;
  if(!motion.matches)await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  hero.classList.remove('is-changing');
  if(!motion.matches)await delay(420);
  changing=false;
  if(pending!==null&&pending!==active){const queued=pending;pending=null;select(queued)}
  else{pending=null;schedule()}
 }
 function schedule() {
  clearTimeout(timer);
  if (inView && !changing && !hovered && !hero.contains(document.activeElement) && !motion.matches && !document.hidden) timer = setTimeout(() => select(active + 1), 5500);
 }
 buttons.forEach((button,i) => button.addEventListener('click', () => select(i)));
 hero.addEventListener('touchstart', e => {start = e.touches[0]}, {passive:true});
 hero.addEventListener('touchend', e => {
  if (!start) return;
  const dx = e.changedTouches[0].clientX - start.clientX;
  const dy = e.changedTouches[0].clientY - start.clientY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
  start = null;
 }, {passive:true});
 new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; schedule()}).observe(hero);
 document.addEventListener('visibilitychange',schedule);
 hero.addEventListener('focusin',()=>clearTimeout(timer));
 hero.addEventListener('focusout',()=>requestAnimationFrame(schedule));
 hero.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule()}});
 hero.addEventListener('pointerleave',()=>{hovered=false;schedule()});
 motion.addEventListener('change',schedule);
 schedule();
})();
