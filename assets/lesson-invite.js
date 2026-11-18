(() => {
  const headings=[...document.querySelectorAll('.lesson-invite h2')];
  const motion=matchMedia('(prefers-reduced-motion:reduce)');
  if(!headings.length||motion.matches||!('IntersectionObserver' in window))return;
  const states=headings.map(heading=>{
    const text=heading.textContent.trim();
    const chars=[];
    const fragment=document.createDocumentFragment();
    text.split(/(\s+)/).forEach(part=>{
      if(!part)return;
      if(/^\s+$/.test(part)){fragment.append(document.createTextNode(part));return}
      const word=document.createElement('span');
      word.className='type-word';
      word.setAttribute('aria-hidden','true');
      Array.from(part).forEach(character=>{
        const letter=document.createElement('span');
        letter.className='type-char';
        letter.textContent=character;
        chars.push(letter);
        word.append(letter);
      });
      fragment.append(word);
    });
    heading.setAttribute('aria-label',text);
    heading.replaceChildren(fragment);
    return {heading,chars,target:heading.closest('.lesson-invite .wrap'),count:0,elapsed:0,last:null,frame:null,visible:false,done:false};
  });
  function stop(state){
    if(state.frame!==null)cancelAnimationFrame(state.frame);
    state.frame=null;
    state.last=null;
  }
  function finish(state){
    stop(state);
    state.chars.forEach(letter=>letter.classList.add('is-printed'));
    state.heading.classList.add('is-typed');
    state.done=true;
    observer.unobserve(state.target);
  }
  function tick(state,now){
    state.frame=null;
    if(state.done||!state.visible||document.hidden){state.last=null;return}
    if(state.last!==null)state.elapsed+=Math.min(now-state.last,64);
    state.last=now;
    const count=Math.min(state.chars.length,Math.floor(Math.max(0,state.elapsed-120)/46));
    if(count!==state.count){
      state.chars[state.count-1]?.classList.remove('is-cursor');
      for(let i=state.count;i<count;i++)state.chars[i].classList.add('is-printed');
      state.count=count;
      state.chars[count-1]?.classList.add('is-cursor');
    }
    if(count===state.chars.length){finish(state);return}
    state.frame=requestAnimationFrame(time=>tick(state,time));
  }
  function start(state){
    if(!state.done&&state.visible&&!document.hidden&&state.frame===null)state.frame=requestAnimationFrame(time=>tick(state,time));
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const state=states.find(item=>item.target===entry.target);
      state.visible=entry.isIntersecting&&entry.intersectionRatio>=.22;
      if(state.visible)start(state);else stop(state);
    });
  },{threshold:.22,rootMargin:'0px 0px -24px 0px'});
  states.forEach(state=>observer.observe(state.target));
  document.addEventListener('visibilitychange',()=>states.forEach(state=>document.hidden?stop(state):start(state)));
  motion.addEventListener('change',()=>{if(motion.matches)states.forEach(finish)});
})();
