(() => {
  const motion=matchMedia('(prefers-reduced-motion:reduce)');
  if(motion.matches||!('IntersectionObserver' in window)||!Element.prototype.animate)return;

  const compact=matchMedia('(max-width:680px)');
  const pending=new Map();
  const playing=new Map();
  const candidates=new Map();
  const add=(selector,distance=16)=>document.querySelectorAll(selector).forEach(element=>{
    candidates.set(element,distance);
  });

  add('.hero .lesson-title,.hero .cloud-note',10);
  add('main section>.wrap>.sectitle,main section>.wrap>h2,.discover>div');
  add('.window-row>header,.window-row>a,.course-grid>a,.principles .wrap>div>article');
  add('.syllabus-box>header,.syllabus-row>a,.event-layout>div,.event-layout>img');
  add('.index-layout>div,.index-layout>figure,.fac-grid>img,.fac-grid>div>article');
  add('.journal>a,.out-grid>.out-cover,.out-grid>div>article,.format-row>article');
  add('.booking-intro,.contact>div:first-child,.legal-hero>.wrap,.legal-copy>article',12);
  add('.services .carousel,.tutor-row,.guide-shell,.gallery-grid,.review-loop,.before-booking .faq,.contact>form',0);
  add('.lesson-invite .wrap>div:last-child',0);

  const finish=element=>{
    observer.unobserve(element);
    pending.delete(element);
    element.classList.remove('reveal-pending');
    const animation=playing.get(element);
    playing.delete(element);
    animation?.cancel();
  };
  const finishAll=()=>{
    [...pending.keys(),...playing.keys()].forEach(finish);
  };
  const reveal=(element,delay=0)=>{
    const distance=pending.get(element);
    if(distance===undefined)return;
    if(motion.matches||document.hidden){finish(element);return}
    observer.unobserve(element);
    pending.delete(element);
    try{
      const lift=compact.matches?distance*.7:distance;
      const frames=lift?
        [{opacity:0,translate:`0 ${lift}px`},{opacity:1,translate:'0 0'}]:
        [{opacity:0},{opacity:1}];
      const animation=element.animate(frames,{
        duration:compact.matches?620:760,delay,
        easing:'cubic-bezier(.22,1,.36,1)',fill:'both'
      });
      playing.set(element,animation);
      element.classList.remove('reveal-pending');
      animation.finished.then(()=>{
        if(playing.get(element)===animation)finish(element);
      }).catch(()=>{});
    }catch{finish(element)}
  };
  const observer=new IntersectionObserver(entries=>{
    let rowTop=-Infinity,index=0;
    entries.filter(entry=>entry.isIntersecting)
      .sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left)
      .forEach(entry=>{
        if(Math.abs(entry.boundingClientRect.top-rowTop)>40){rowTop=entry.boundingClientRect.top;index=0}
        reveal(entry.target,Math.min(index++,3)*(compact.matches?40:65));
      });
  },{threshold:0,rootMargin:'0px 0px -24px 0px'});

  const finishRelated=target=>{
    if(!(target instanceof Element))return;
    [...pending.keys(),...playing.keys()].forEach(element=>{
      if(element.contains(target)||target.contains(element))finish(element);
    });
  };
  const revealHash=()=>{
    if(!location.hash)return;
    try{finishRelated(document.getElementById(decodeURIComponent(location.hash.slice(1))))}catch{}
  };

  candidates.forEach((distance,element)=>{
    if([...candidates.keys()].some(parent=>parent!==element&&parent.contains(element)))return;
    if(element.closest('[hidden],[inert],[aria-hidden=true]'))return;
    const rect=element.getBoundingClientRect();
    if(!rect.width||!rect.height||rect.bottom<=0)return;
    pending.set(element,distance);
    element.classList.add('reveal-pending');
    if(rect.top<innerHeight-24)reveal(element);
    else observer.observe(element);
  });
  revealHash();
  document.addEventListener('focusin',event=>finishRelated(event.target));
  document.addEventListener('pointerdown',event=>finishRelated(event.target),{passive:true});
  window.addEventListener('hashchange',revealHash);
  window.addEventListener('beforeprint',finishAll);
  window.addEventListener('pageshow',event=>{if(event.persisted)finishAll()});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)[...playing.keys()].forEach(finish);
  });
  motion.addEventListener('change',()=>{if(motion.matches)finishAll()});
})();

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
