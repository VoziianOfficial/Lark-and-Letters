(() => {
 const hero = document.querySelector('.home-show');
 const heading = hero.querySelector('h1');
 const buttons = [...hero.querySelectorAll('.scene-switch button')];
 const parts = [...hero.querySelectorAll('.hero-part')];
 const titles = buttons.map(button => button.getAttribute('aria-label'));
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 let active = 0;
 let timer;
 let start;
 let inView = true;

 function select(index) {
  active = (index + titles.length) % titles.length;
  hero.dataset.current = String(active);
  heading.textContent = titles[active];
  parts.forEach(part => {
   const current = Number(part.dataset.scene) === active;
   part.classList.toggle('is-current', current);
   part.setAttribute('aria-hidden', String(!current));
  });
  buttons.forEach((button,i) => button.setAttribute('aria-pressed',String(active === i)));
  schedule();
 }
 function schedule() {
  clearTimeout(timer);
  if (inView && !motion.matches && !document.hidden) timer = setTimeout(() => select(active + 1), 3500);
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
 motion.addEventListener('change',schedule);
 schedule();
})();
