const subjectNav=document.querySelector('.subnav');
const trigger=subjectNav.querySelector('.subject-trigger');
const panel=subjectNav.querySelector('.sub-list');
const hoverMenu=matchMedia('(min-width:921px) and (hover:hover)');
function openSubjects(open){
 subjectNav.classList.toggle('expanded',open);
 trigger.setAttribute('aria-expanded',String(open));
 panel.inert=!open;
}
subjectNav.addEventListener('pointerenter',()=>{if(hoverMenu.matches)openSubjects(true)});
subjectNav.addEventListener('pointerleave',()=>{if(hoverMenu.matches&&!panel.contains(document.activeElement))openSubjects(false)});
trigger.addEventListener('click',e=>{e.stopPropagation();openSubjects(hoverMenu.matches&&e.detail>0?true:panel.inert)});
trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();openSubjects(true);panel.querySelector('a').focus()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.inert){openSubjects(false);trigger.focus()}});
document.addEventListener('click',e=>{if(!subjectNav.contains(e.target))openSubjects(false)});
subjectNav.addEventListener('focusout',e=>{if(!subjectNav.contains(e.relatedTarget))openSubjects(false)});
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
 const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('ink-reveal');reveal.unobserve(entry.target)}
 }),{threshold:.2});
 document.querySelectorAll('main h1,main h2,main h3').forEach(heading=>reveal.observe(heading));
}
