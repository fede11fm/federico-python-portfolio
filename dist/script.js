const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const button = document.querySelector('#motion');
let paused = reduced.matches;
function updateMotion(){document.body.classList.toggle('still',paused);button.textContent = paused ? 'Animazioni: in pausa' : 'Animazioni: attive';button.setAttribute('aria-pressed',String(paused));document.documentElement.style.scrollBehavior=paused?'auto':'smooth';}
button.addEventListener('click',()=>{paused=!paused;updateMotion();});
reduced.addEventListener('change',()=>{paused=reduced.matches;updateMotion();});
updateMotion();
document.querySelectorAll('.card').forEach(card=>{card.addEventListener('pointermove',event=>{if(paused||event.pointerType==='touch')return;const rect=card.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width-.5;const y=(event.clientY-rect.top)/rect.height-.5;card.style.transform=`rotateX(${-y*8}deg) rotateY(${x*8}deg) translateY(-4px)`;});card.addEventListener('pointerleave',()=>{card.style.transform='';});});
