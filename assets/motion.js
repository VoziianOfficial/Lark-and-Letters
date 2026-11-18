(() => {
  const motion=matchMedia('(prefers-reduced-motion:reduce)');
  const accordions=[];
  document.querySelectorAll('.faq details').forEach(details=>{
    const summary=details.querySelector('summary');
    const content=document.createElement('div');
    content.className='faq-content';
    [...details.childNodes].forEach(child=>{if(child!==summary)content.append(child)});
    details.append(content);
    const group=details.getAttribute('name');
    // Keep native semantics, but animate both members of an exclusive group.
    details.removeAttribute('name');
    details.classList.add('motion-details');
    let expanded=details.open;
    let animation;
    const updateState=()=>{
      details.dataset.expanded=String(expanded);
      summary.setAttribute('aria-expanded',String(expanded));
      content.inert=!expanded;
    };
    const settle=()=>{
      animation?.cancel();
      animation=null;
      details.open=expanded;
      details.style.height='';
      details.style.overflow='';
    };
    const setExpanded=open=>{
      if(expanded===open)return;
      const from=details.getBoundingClientRect().height;
      animation?.cancel();
      expanded=open;
      updateState();
      if(motion.matches){settle();return}
      details.open=true;
      details.style.height='auto';
      const box=getComputedStyle(details);
      const spacing=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+parseFloat(box[key]),0);
      const to=open?details.getBoundingClientRect().height:summary.getBoundingClientRect().height+spacing;
      details.style.height=from+'px';
      details.style.overflow='hidden';
      const current=details.animate([{height:from+'px'},{height:to+'px'}],{
        duration:440,easing:'cubic-bezier(.22,.68,.18,1)',fill:'forwards'
      });
      animation=current;
      current.finished.then(()=>{if(animation===current)settle()}).catch(()=>{});
    };
    const item={details,group,setExpanded,settle};
    accordions.push(item);
    updateState();
    summary.addEventListener('click',event=>{
      event.preventDefault();
      const open=!expanded;
      if(open&&group)accordions.forEach(other=>{
        if(other!==item&&other.group===group)other.setExpanded(false);
      });
      setExpanded(open);
    });
  });
  motion.addEventListener('change',()=>accordions.forEach(item=>item.settle()));
  window.addEventListener('resize',()=>accordions.forEach(item=>item.settle()),{passive:true});
})();
