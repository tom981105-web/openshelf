const filterButtons=[...document.querySelectorAll('[data-filter]')];
const cards=[...document.querySelectorAll('.hub-card')];
filterButtons.forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  let count=0;
  for(const card of cards){card.hidden=filter!=='all'&&card.dataset.type!==filter;if(!card.hidden)count++}
  document.getElementById('hubCount').textContent='체험실 '+count+'개';
}));
