(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const CANVAS_W = 1600, CANVAS_H = 800;
  const KEY = 'mexican-train-interaction-study-v1';
  const seed = [
    [12,4],[4,6],[12,9],[6,0],[9,3],[3,11],[11,5],[5,2],
    [2,7],[7,10],[10,1],[1,1],[12,8],[6,6],[0,8]
  ];
  const initialTiles = () => seed.map(([a,b], i) => ({id:`tile-${i}`,a,b,flip:false,rotation:0,x:85+(i%8)*142,y:65+Math.floor(i/8)*82,z:i+1}));
  const initialState = () => ({tiles:initialTiles(), endpoints:{you:{value:12,label:'Your train',placements:[]},morgan:{value:6,label:"Morgan's train",placements:[]},community:{value:12,label:'Community train',placements:[]}}});
  let state;
  try { const saved=JSON.parse(localStorage.getItem(KEY)); state=saved?.tiles && saved?.endpoints ? saved : initialState(); } catch { state=initialState(); }
  let selectedId=null, scale=1, fullscreen=false, camera=false, drag=null, messageTimer;
  const viewport=$('handViewport'), space=$('handSpace'), canvas=$('handCanvas');
  const tell = text => { const n=$('notice'); n.textContent=text; n.classList.add('visible'); clearTimeout(messageTimer); messageTimer=setTimeout(()=>n.classList.remove('visible'),3500); };
  const save = () => { try {localStorage.setItem(KEY,JSON.stringify(state));} catch {tell('Hand changes could not be saved in this browser.');} };
  const tileById = id => state.tiles.find(tile=>tile.id===id);
  const matches = (tile, endpoint) => !!tile && (tile.a===endpoint.value || tile.b===endpoint.value);
  const faces = tile => tile.flip ? [tile.b,tile.a] : [tile.a,tile.b];
  const face = value => `<span class="face" style="color:var(--v${value})">${value}</span>`;
  const label = tile => { const [a,b]=faces(tile); return `Domino ${a} and ${b}`; };
  function updateSize() { space.style.width=`${CANVAS_W*scale}px`; space.style.height=`${CANVAS_H*scale}px`; canvas.style.transform=`scale(${scale})`; }
  function position(el,tile) { el.style.left=`${tile.x}px`; el.style.top=`${tile.y}px`; el.style.zIndex=String(tile.z); el.style.setProperty('--rotation',`${tile.rotation}deg`); }
  function makeTile(tile) {
    const button=document.createElement('button');
    button.type='button'; button.className='domino'; button.dataset.id=tile.id; button.innerHTML=faces(tile).map(face).join('');
    button.setAttribute('aria-label',label(tile)); button.setAttribute('aria-pressed',String(tile.id===selectedId));
    if(tile.id===selectedId) button.classList.add('selected');
    position(button,tile);
    button.addEventListener('pointerdown', startDrag);
    button.addEventListener('click', event=>{if(event.detail===0){select(tile.id);flipSelected();}});
    return button;
  }
  function renderHand() { canvas.replaceChildren(...state.tiles.map(makeTile)); $('handCount').textContent=`${state.tiles.length} ${state.tiles.length===1?'tile':'tiles'}`; updateSelection(); updateSize(); }
  function updateSelection() {
    const tile=tileById(selectedId);
    for(const node of canvas.querySelectorAll('.domino')) { const active=node.dataset.id===selectedId;node.classList.toggle('selected',active);node.setAttribute('aria-pressed',String(active)); }
    $('playButton').disabled=!tile || camera;
    $('flipButton').disabled=!tile; $('rotateButton').disabled=!tile;
    for(const node of document.querySelectorAll('.endpoint')) { const endpoint=state.endpoints[node.dataset.endpoint];const valid=!camera && matches(tile,endpoint); node.classList.toggle('valid',valid);node.classList.toggle('invalid',!!tile&&!valid);node.setAttribute('aria-label',`${endpoint.label}, needs ${endpoint.value}${tile ? valid ? ', playable' : ', not a match' : ''}`); }
    $('boardCaption').textContent=tile ? `${faces(tile).join(' | ')} selected · choose a glowing end` : 'Select a tile to see where it can go.';
  }
  function select(id) { selectedId=id; updateSelection(); }
  function refreshTile(tile) {const el=canvas.querySelector(`[data-id="${tile.id}"]`); if(el){el.innerHTML=faces(tile).map(face).join('');el.setAttribute('aria-label',label(tile));position(el,tile);}updateSelection();save();}
  function flipSelected() {const tile=tileById(selectedId);if(!tile)return;tile.flip=!tile.flip;refreshTile(tile);tell(`${label(tile)} flipped.`);}
  function rotateSelected() {const tile=tileById(selectedId);if(!tile)return;tile.rotation=(tile.rotation+90)%360;clamp(tile);refreshTile(tile);tell(`${label(tile)} rotated.`);}
  function clamp(tile) {let vertical=tile.rotation%180!==0;let halfW=vertical?26:50,halfH=vertical?50:26;tile.x=Math.max(halfW,Math.min(CANVAS_W-halfW,tile.x));tile.y=Math.max(halfH,Math.min(CANVAS_H-halfH,tile.y));}
  function startDrag(event) {
    if(event.button!==0 || drag)return;
    const tile=tileById(event.currentTarget.dataset.id);if(!tile)return;
    select(tile.id);tile.z=Math.max(0,...state.tiles.map(t=>t.z))+1;position(event.currentTarget,tile);
    drag={id:tile.id,el:event.currentTarget,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:tile.x,originY:tile.y,moved:false,ghost:null};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.addEventListener('pointermove',moveDrag);event.currentTarget.addEventListener('pointerup',endDrag);event.currentTarget.addEventListener('pointercancel',cancelDrag);event.preventDefault();
  }
  function inRect(x,y,rect) {return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;}
  function moveDrag(event) {
    if(!drag || event.pointerId!==drag.pointerId)return;
    const tile=tileById(drag.id);if(!tile)return;
    if(!drag.moved && Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6)return;
    drag.moved=true;
    if(inRect(event.clientX,event.clientY,viewport.getBoundingClientRect())) {
      tile.x=drag.originX+(event.clientX-drag.startX)/scale;tile.y=drag.originY+(event.clientY-drag.startY)/scale;clamp(tile);position(drag.el,tile);drag.el.style.opacity='1';if(drag.ghost){drag.ghost.remove();drag.ghost=null;}
    } else {
      if(!drag.ghost){drag.ghost=drag.el.cloneNode(true);drag.ghost.classList.add('drag-ghost');drag.ghost.removeAttribute('id');drag.ghost.style.width=`${98*scale}px`;drag.ghost.style.height=`${51*scale}px`;document.body.append(drag.ghost);}
      drag.el.style.opacity='.35';drag.ghost.style.left=`${event.clientX}px`;drag.ghost.style.top=`${event.clientY}px`;
    }
  }
  function cleanupDrag() {if(!drag)return;drag.el.removeEventListener('pointermove',moveDrag);drag.el.removeEventListener('pointerup',endDrag);drag.el.removeEventListener('pointercancel',cancelDrag);drag.el.style.opacity='';if(drag.ghost)drag.ghost.remove();drag=null;}
  function cancelDrag() {if(!drag)return;const tile=tileById(drag.id);if(tile){tile.x=drag.originX;tile.y=drag.originY;position(drag.el,tile);}cleanupDrag();save();tell('Move cancelled.');}
  function endDrag(event) {
    if(!drag || event.pointerId!==drag.pointerId)return;
    const tile=tileById(drag.id), moved=drag.moved, el=drag.el, originX=drag.originX,originY=drag.originY;
    if(!tile){cleanupDrag();return;}
    if(!moved){cleanupDrag();flipSelected();return;}
    const inside=inRect(event.clientX,event.clientY,viewport.getBoundingClientRect());
    const target=inside?null:document.elementFromPoint(event.clientX,event.clientY)?.closest('.endpoint');
    if(!inside){tile.x=originX;tile.y=originY;position(el,tile);}
    cleanupDrag();
    if(target && !fullscreen) {placeTile(target.dataset.endpoint);return;}
    if(!inside)tell('Tile returned to your hand. Drop it on a glowing end or inside your hand.');
    save();
  }
  function renderBoard() {
    const boardTiles=$('boardTiles'); boardTiles.replaceChildren();
    const initial=document.createElement('div');initial.className='placed-tile';initial.style.left='39%';initial.style.top='43%';initial.innerHTML='<span style="color:var(--v12)">12</span><span style="color:var(--v6)">6</span>';boardTiles.append(initial);
    const cfg={you:{x:50,y:75,dx:5,dy:0},morgan:{x:32,y:35,dx:-5,dy:0},community:{x:70,y:50,dx:5,dy:0}};
    for(const [id,endpoint] of Object.entries(state.endpoints)) {const c=cfg[id],node=document.querySelector(`[data-endpoint="${id}"]`);endpoint.placements.forEach((p,i)=>{const t=document.createElement('div');t.className='placed-tile';t.style.left=`${c.x+c.dx*i}%`;t.style.top=`${c.y+c.dy*i}%`;t.innerHTML=`<span style="color:var(--v${p[0]})">${p[0]}</span><span style="color:var(--v${p[1]})">${p[1]}</span>`;boardTiles.append(t);});node.style.left=`${c.x+c.dx*endpoint.placements.length}%`;node.style.top=`${c.y+c.dy*endpoint.placements.length}%`;}
    updateSelection();
  }
  function placeTile(id) {
    const tile=tileById(selectedId),endpoint=state.endpoints[id];
    if(camera){tell('Switch to playing view to try a move.');return;}
    if(!tile){tell('Choose a tile from your hand first.');return;}
    if(!matches(tile,endpoint)){tell(`${endpoint.label} needs a ${endpoint.value}. Your tile stayed in your hand.`);return;}
    const open=endpoint.value, next=tile.a===open?tile.b:tile.a;endpoint.placements.push([open,next]);endpoint.value=next;state.tiles=state.tiles.filter(t=>t.id!==tile.id);selectedId=null;save();renderHand();renderBoard();tell(`Played on ${endpoint.label}. This is a sample interaction.`);
  }
  function setFullscreen(value) {fullscreen=value;$('handCard').classList.toggle('fullscreen',value);$('expandButton').querySelector('span').textContent=value?'Back to table':'Expand hand';$('expandButton').setAttribute('aria-label',value?'Back to table':'Expand hand');}
  function fit() {
    if(scale<.99){scale=1;$('fitButton').textContent='Fit hand';updateSize();tell('Hand restored to actual size; scroll to see more.');return;}
    scale=Math.min(viewport.clientWidth/CANVAS_W,viewport.clientHeight/CANVAS_H,1);
    $('fitButton').textContent=scale<.99?'Actual size':'Fit hand';updateSize();viewport.scrollLeft=0;viewport.scrollTop=0;tell('Hand fitted to view; tile positions did not change.');
  }
  document.querySelectorAll('.endpoint').forEach(node=>node.addEventListener('click',()=>placeTile(node.dataset.endpoint)));
  $('expandButton').addEventListener('click',()=>setFullscreen(!fullscreen));$('fitButton').addEventListener('click',fit);$('flipButton').addEventListener('click',flipSelected);$('rotateButton').addEventListener('click',rotateSelected);
  $('playButton').addEventListener('click',()=>{if(!selectedId)return;if(fullscreen)setFullscreen(false);$('tableHint').textContent='Choose a glowing end';tell('Choose a glowing end on the table.');});
  $('cameraButton').addEventListener('click',()=>{camera=!camera;$('board').classList.toggle('perspective',camera);$('cameraButton').setAttribute('aria-pressed',String(camera));$('cameraButton').textContent=camera?'Playing view':'Table perspective';$('turnLabel').textContent=camera?'Waiting for turn':'Your turn';$('tableHint').textContent=camera?'Morgan is playing':'Your turn · choose a tile';updateSelection();});
  $('resetButton').addEventListener('click',()=>{state=initialState();selectedId=null;scale=1;$('fitButton').textContent='Fit hand';save();renderHand();renderBoard();viewport.scrollLeft=0;viewport.scrollTop=0;tell('Sample reset.');});
  document.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select,[contenteditable="true"]'))return;if(event.key.toLowerCase()==='r' && !event.ctrlKey && !event.metaKey && !event.altKey){event.preventDefault();rotateSelected();}else if(event.key==='Escape'){if(drag)cancelDrag();else if(fullscreen)setFullscreen(false);else if(selectedId){selectedId=null;updateSelection();tell('Selection cleared.');}}else if(event.target.classList.contains('domino') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const tile=tileById(event.target.dataset.id);if(!tile)return;const step=event.shiftKey?10:2;tile.x+=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0;tile.y+=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;clamp(tile);refreshTile(tile);}});
  renderHand();renderBoard();
})();
