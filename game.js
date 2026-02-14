const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');

let W = canvas.width;
let H = canvas.height;
let frame = 0;

// gameplay tuning
let PIPE_SPEED = 2.6;
const BASE_PIPE_SPEED = 2.6;

const GRAVITY = 0.5;
const FLAP = -8.5;
const GROUND_H = 48;

class Tomato {
  constructor(){
    this.x = 100;
    this.y = H/2;
    this.r = 20;
    this.vy = 0;
  }
  flap(){ this.vy = FLAP }
  update(){
    this.vy += GRAVITY;
    this.y += this.vy;
    // sky collision
    if(this.y - this.r <= 0){ this.y = this.r; running = false }
    // ground collision
    if(this.y + this.r >= H - GROUND_H){ this.y = H - GROUND_H - this.r; running = false }
  }
  draw(){
    ctx.save();
    // tilt based on vertical velocity
    const tilt = Math.max(-0.6, Math.min(0.35, this.vy * 0.03));
    ctx.translate(this.x,this.y);
    ctx.rotate(tilt);

    // tomato body gradient
    const g = ctx.createRadialGradient(-6,-6,this.r*0.2,0,0,this.r);
    g.addColorStop(0,'#ff9b9b');
    g.addColorStop(0.25,'#ff6b6b');
    g.addColorStop(1,'#c81d25');
    ctx.beginPath(); ctx.fillStyle = g; ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();

    // highlight
    ctx.beginPath(); ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.ellipse(-6,-8,6,9, -0.8,0,Math.PI*2); ctx.fill();

    // seeds
    ctx.fillStyle = 'rgba(255,230,200,0.95)';
    for(let i=0;i<5;i++){
      const a = -1.3 + i*0.6;
      ctx.beginPath(); ctx.ellipse(Math.cos(a)*6, Math.sin(a)*6, 2.3, 1.2, a-0.3, 0, Math.PI*2); ctx.fill();
    }

    // stem
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath(); ctx.moveTo(-4,-this.r+4); ctx.quadraticCurveTo(-6,-this.r-6,2,-this.r-8); ctx.quadraticCurveTo(6,-this.r-6,8,-this.r+2); ctx.fill();

    ctx.restore();
  }
}

class Pipe {
  constructor(x){
    this.x = x;
    this.w = 64;
    this.gap = 150;
    this.top = 60 + Math.random()*(H-260);
    this.passed = false;
  }
  update(){ this.x -= 2.6 }
  update(){ this.x -= PIPE_SPEED }
  draw(){
    // navy gradient
    const g = ctx.createLinearGradient(this.x,0,this.x+this.w,0);
    g.addColorStop(0,'#00224a'); g.addColorStop(1,'#001f5b');
    ctx.fillStyle = g;
    // top pipe
    roundRect(ctx, this.x, 0, this.w, this.top, 8, true, false);
    // bottom pipe
    roundRect(ctx, this.x, this.top+this.gap, this.w, H - (this.top+this.gap) - GROUND_H, 8, true, false);
    // inner shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(this.x+6, this.top+this.gap, this.w-12, 6);
  }
}

function roundRect(ctx,x,y,w,h,r,fill,stroke){
  if(typeof r==='undefined') r=5;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}

// background clouds
class Cloud {
  constructor(x,y,scale=1){ this.x=x; this.y=y; this.s=scale; this.speed=0.3+Math.random()*0.6 }
  update(){ this.x -= this.speed }
  draw(){ ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); const s=this.s; ctx.ellipse(this.x,this.y,34*s,22*s,0,0,Math.PI*2); ctx.ellipse(this.x+28*s,this.y-6*s,22*s,16*s,0,0,Math.PI*2); ctx.ellipse(this.x-26*s,this.y-4*s,22*s,16*s,0,0,Math.PI*2); ctx.fill() }
}

let clouds = [];
let scorePopups = [];
let audioCtx = null;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)() }
function playBeep(freq, time=0.06, type='sine'){ try{ ensureAudio(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type=type; o.frequency.value=freq; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.0001,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.08,audioCtx.currentTime+0.001); o.start(); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+time); o.stop(audioCtx.currentTime+time+0.02);}catch(e){} }

let highScore = parseInt(localStorage.getItem('flappy_tomato_highscore')||'0',10)||0;

let tomato = new Tomato();
let pipes = [];
let score = 0;
let running = false;

function spawnPipe(){
  const lastX = pipes.length?pipes[pipes.length-1].x:W+120;
  const x = Math.max(W+40, lastX + 220 + Math.random()*80);
  pipes.push(new Pipe(x));
}

function reset(){
  tomato = new Tomato();
  pipes = [];
  score = 0;
  frame = 0;
  running = true;
  spawnPipe(); spawnPipe();
  // reset clouds
  clouds = [];
  for(let i=0;i<6;i++) clouds.push(new Cloud(Math.random()*W, 40+Math.random()*100, 0.6+Math.random()*1.2));
  // reset difficulty and popups
  PIPE_SPEED = BASE_PIPE_SPEED;
  scorePopups = [];
}

function collided(pipe){
  const tx = tomato.x, ty = tomato.y, r = tomato.r;
  const inX = tx + r > pipe.x && tx - r < pipe.x + pipe.w;
  if(!inX) return false;
  if(ty - r < pipe.top) return true;
  if(ty + r > pipe.top + pipe.gap) return true;
  return false;
}

function update(){
  if(!running) return;
  frame++;
  tomato.update();
  if(frame%110===0) spawnPipe();
  for(let p of pipes) p.update();
  if(pipes.length && pipes[0].x + pipes[0].w < -40) pipes.shift();
  for(let p of pipes){
    if(!p.passed && p.x + p.w < tomato.x){
      p.passed = true;
      score++;
      // popup
      scorePopups.push({x: tomato.x, y: tomato.y - 30, alpha:1, dy:-0.8, life:40});
      playBeep(900,0.06,'square');
      // difficulty scale a little every 5 points
      if(score % 5 === 0) PIPE_SPEED = BASE_PIPE_SPEED + 0.4 * Math.floor(score/5);
      // update high score
      if(score > highScore){ highScore = score; localStorage.setItem('flappy_tomato_highscore', String(highScore)); }
    }
    if(collided(p)){ running=false; playBeep(120,0.18,'sawtooth') }
  }
  if(tomato.y - tomato.r <= 0) running=false;
  scoreEl.textContent = `Score: ${score}`;
}

function drawBackground(){
  // sky gradient
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#9fe7ff'); bg.addColorStop(0.6,'#cff8ff'); bg.addColorStop(1,'#e8fff6');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  // clouds
  for(let c of clouds){ c.draw(); c.update(); if(c.x < -120) c.x = W + Math.random()*80; }
}

function drawGround(){
  // soil
  ctx.fillStyle = '#6f4f2b'; ctx.fillRect(0,H-GROUND_H, W, GROUND_H);
  // grass strip
  ctx.fillStyle = '#7ec850'; ctx.fillRect(0,H-GROUND_H, W, 12);
  // subtle texture
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for(let i=0;i<W;i+=16) ctx.fillRect(i+((frame/6)|0)%16, H-18, 8, 2);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  drawBackground();
  for(let p of pipes) p.draw();
  tomato.draw();
  // draw score on canvas
  ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.font='40px sans-serif'; ctx.textAlign='center'; ctx.fillText(String(score), W/2+2, 78+2);
  ctx.fillStyle='white'; ctx.font='40px sans-serif'; ctx.fillText(String(score), W/2, 78);
  ctx.font='12px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillText('Best: '+highScore, W/2, 98);

  // draw and update popups
  for(let i=scorePopups.length-1;i>=0;i--){
    const sp = scorePopups[i];
    ctx.globalAlpha = sp.alpha;
    ctx.fillStyle='white'; ctx.font='18px sans-serif'; ctx.fillText('+1', sp.x, sp.y);
    ctx.globalAlpha = 1;
    sp.y += sp.dy; sp.alpha -= 0.02; sp.life--;
    if(sp.life<=0 || sp.alpha<=0) scorePopups.splice(i,1);
  }
  drawGround();
  if(!running){
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,H/2-56,W,112);
    ctx.fillStyle='white'; ctx.font='28px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Game Over', W/2, H/2-6);
    ctx.font='18px sans-serif'; ctx.fillText(`Score: ${score}`, W/2, H/2+22);
    ctx.font='14px sans-serif'; ctx.fillText('Click Restart or press Space to play again', W/2, H/2+46);
  }
}

function loop(){ update(); draw(); requestAnimationFrame(loop) }

window.addEventListener('keydown', e=>{ if(e.code==='Space'){ tomato.flap(); if(!running) reset() } });
canvas.addEventListener('mousedown', ()=>{ tomato.flap(); if(!running) reset() });
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); tomato.flap(); if(!running) reset() }, {passive:false});
restartBtn.addEventListener('click', ()=> reset());

reset();
requestAnimationFrame(loop);
