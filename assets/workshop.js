const activities=[
 ['Build a solar car','Physics in practice','Predict how the angle of a solar panel affects a small car. Sketch your prediction and explain the result.'],
 ['Stage a dialogue','Conversation practice','Choose two characters, write their opening lines and perform the scene with your tutor.'],
 ['Explain a volcano','Scientific English','Use a model volcano to practise sequencing words and explain what happens during an eruption.']
];
function activate(items,select){
 items.forEach((el,i)=>{
  const run=()=>{items.forEach((item,k)=>item.classList.toggle('chosen',k===i));select(i)};
  el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')run()});
  el.addEventListener('focus',run);
  el.addEventListener('click',run);
  if(el.getAttribute('role')==='button')el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();run()}});
 });
 if(items.length){items[0].classList.add('chosen');select(0)}
}
function photo(img,file,alt){
 if(!img)return;
 const src='assets/'+file+'.webp';
 img.alt=alt;
 if(img.getAttribute('src')===src)return;
 img.getAnimations?.().forEach(animation=>animation.cancel());
 img.src=src;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)img.animate([{opacity:.45,scale:'.98'},{opacity:1,scale:'1'}],{duration:230});
}
const interests=document.querySelectorAll('.index-layout a'), pictures=document.querySelectorAll('.index-layout figure');
const defaultPairs=[[1,5,'French practice','Japanese practice'],[4,8,'Colour study','Design sketch'],[3,7,'Solar system','Geometry practice'],[2,6,'Study notes','Creative writing']];
const pairs=[...interests].map((link,i)=>{
 const d=link.dataset;
 if(d.left)return [d.left,d.right,d.leftCaption,d.rightCaption];
 const [left,right,a,b]=defaultPairs[i];
 return ['interest'+left,'interest'+right,a,b];
});
const layers=[...pictures].map((figure,j)=>{
 const frame=document.createElement('div');
 frame.className='image-layers';
 figure.querySelector('img').replaceWith(frame);
 return pairs.map((row,i)=>{
  const image=new Image();
  image.src='assets/'+row[j]+'.webp';
  image.alt=row[j+2];
  image.classList.toggle('visible',i===0);
  frame.append(image);
  image.decode().catch(()=>{});
  return image;
 });
});
activate(interests,i=>pictures.forEach((figure,j)=>{
 layers[j].forEach((img,k)=>img.classList.toggle('visible',k===i));
 figure.querySelector('figcaption').textContent=pairs[i][j+2];
}));
const outcomes=document.querySelectorAll('.out-grid article');
activate(outcomes,i=>{const title=outcomes[i].querySelector('h3').textContent;photo(document.querySelector('.out-cover img'),outcomes[i].dataset.photo,title);document.querySelector('.out-cover h3').textContent=title});
document.querySelectorAll('.principles article').forEach(el=>{
 const flip=()=>{const open=el.getAttribute('aria-expanded')!=='true';el.setAttribute('aria-expanded',open);el.classList.toggle('flipped',open)};
 el.addEventListener('click',flip);el.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();flip()}});
});
const notes=['Choose a subject and tell us what you want to practise.','Meet your tutor online and share one question from your week.','Work through an example together at a pace that feels comfortable.','Take away one small activity to try on your own.'];
activate(document.querySelectorAll('.steps button'),i=>document.querySelector('.step-note').textContent=notes[i]);
const tabs=document.querySelectorAll('.lab-switch button');
tabs.forEach((b,i)=>b.textContent=activities[i][0]);
activate(tabs,i=>{
 tabs.forEach((el,k)=>el.setAttribute('aria-pressed',String(k===i)));
 const info=document.querySelector('.lab-info');
 [info.querySelector('h3'),info.querySelector('strong'),info.querySelector('p')].forEach((el,k)=>el.textContent=activities[i][k]);
 document.querySelectorAll('.film img').forEach((img,k)=>{img.dataset.slot=(k-i+3)%3;img.alt=activities[k][0]});
});
interests.forEach((link,i)=>{
 let previewFirst=false;
 link.addEventListener('pointerdown',event=>{previewFirst=event.pointerType==='touch'&&!link.classList.contains('chosen')});
 link.addEventListener('click',event=>{
  if(previewFirst){event.preventDefault();previewFirst=false}
 },true);
});

const goalButtons=[...document.querySelectorAll('.guide-nav button')];
const goalPanels=[...document.querySelectorAll('.guide-content article')];
activate(goalButtons,index=>{
 goalButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 goalPanels.forEach((panel,i)=>panel.hidden=i!==index);
});
