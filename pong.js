(() => {
  const canvas = document.getElementById('pong');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const PADDLE_W = 8;
  const PADDLE_H = 60;
  const BALL = 7;
  const PLAYER_SPEED = 6;
  const AI_SPEED = 2.8;
  const AI_DEADZONE = 28;

  const state = {
    playerH: PADDLE_H,
    playerY: H / 2 - PADDLE_H / 2,
    aiY: H / 2 - PADDLE_H / 2,
    ballX: W / 2,
    ballY: H / 2,
    vx: 4,
    vy: 2.5,
    pScore: 0,
    aScore: 0,
    keys: { w: false, s: false },
    mouseY: null,
    paused: true,
    ended: false,
    confetti: [],
  };

  function launchConfetti() {
    const colors = ['#ff5d8f', '#ffd166', '#06d6a0', '#118ab2', '#e8e8e8', '#ef476f'];
    for (let i = 0; i < 140; i++) {
      state.confetti.push({
        x: W / 2 + (Math.random() - 0.5) * 40,
        y: H / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -8 - Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: colors[(Math.random() * colors.length) | 0],
        size: 4 + Math.random() * 5,
        life: 1,
      });
    }
  }

  function drawConfetti() {
    for (const p of state.confetti) {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      ctx.restore();
    }
    state.confetti = state.confetti.filter(p => p.life > 0 && p.y < H + 40);
  }

  function endGame() {
    state.ended = true;
    state.paused = true;
    launchConfetti();
    setTimeout(() => {
      const wrap = canvas.parentElement;
      const head = wrap.querySelector('.play-head');
      const hint = wrap.querySelector('.hint');
      const msg = document.createElement('div');
      msg.className = 'end-msg';
      msg.textContent = 'Now back to building.';
      canvas.replaceWith(msg);
      if (head) head.style.display = 'none';
      if (hint) hint.style.display = 'none';
    }, 2800);
  }

  const pEl = document.getElementById('playerScore');
  const aEl = document.getElementById('aiScore');

  function reset(dir) {
    state.ballX = W / 2;
    state.ballY = H / 2;
    state.vx = (dir || (Math.random() < 0.5 ? 1 : -1)) * 4;
    state.vy = (Math.random() * 4 - 2);
  }

  function step() {
    if (!state.paused) {
      // player input
      if (state.keys.w) state.playerY -= PLAYER_SPEED;
      if (state.keys.s) state.playerY += PLAYER_SPEED;
      if (state.mouseY !== null) {
        const target = state.mouseY - state.playerH / 2;
        state.playerY += (target - state.playerY) * 0.25;
      }
      state.playerY = Math.max(0, Math.min(H - state.playerH, state.playerY));

      // ai — slow, lazy, only reacts when ball is heading its way
      const aiCenter = state.aiY + PADDLE_H / 2;
      if (state.vx > 0) {
        if (state.ballY < aiCenter - AI_DEADZONE) state.aiY -= AI_SPEED;
        else if (state.ballY > aiCenter + AI_DEADZONE) state.aiY += AI_SPEED;
      } else {
        // drift back to center when not engaged
        const home = H / 2 - PADDLE_H / 2;
        state.aiY += (home - state.aiY) * 0.02;
      }
      state.aiY = Math.max(0, Math.min(H - PADDLE_H, state.aiY));

      // ball
      state.ballX += state.vx;
      state.ballY += state.vy;

      // walls
      if (state.ballY < BALL / 2) { state.ballY = BALL / 2; state.vy *= -1; }
      if (state.ballY > H - BALL / 2) { state.ballY = H - BALL / 2; state.vy *= -1; }

      // player paddle (left)
      if (state.ballX - BALL / 2 < 16 + PADDLE_W &&
          state.ballX - BALL / 2 > 16 - 4 &&
          state.ballY > state.playerY &&
          state.ballY < state.playerY + state.playerH &&
          state.vx < 0) {
        state.vx *= -1.07;
        const offset = (state.ballY - (state.playerY + state.playerH / 2)) / (state.playerH / 2);
        state.vy = offset * 5;
      }

      // ai paddle (right)
      const aiX = W - 16 - PADDLE_W;
      if (state.ballX + BALL / 2 > aiX &&
          state.ballX + BALL / 2 < aiX + PADDLE_W + 4 &&
          state.ballY > state.aiY &&
          state.ballY < state.aiY + PADDLE_H &&
          state.vx > 0) {
        state.vx *= -1.07;
        const offset = (state.ballY - (state.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
        state.vy = offset * 5;
      }

      // clamp speed
      const max = 9;
      if (Math.abs(state.vx) > max) state.vx = Math.sign(state.vx) * max;

      // score
      if (state.ballX < 0) {
        state.aScore++;
        aEl.textContent = state.aScore;
        // grow player paddle 30% as a comeback handicap
        const newH = Math.min(state.playerH * 1.3, H);
        const center = state.playerY + state.playerH / 2;
        state.playerH = newH;
        state.playerY = Math.max(0, Math.min(H - newH, center - newH / 2));
        reset(1);
      }
      if (state.ballX > W) {
        state.pScore++;
        pEl.textContent = state.pScore;
        if (state.pScore >= 3) { endGame(); }
        else reset(-1);
      }
    }

    draw();
    if (canvas.isConnected) requestAnimationFrame(step);
  }

  function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // center dashed line
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // paddles
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(16, state.playerY, PADDLE_W, state.playerH);
    ctx.fillRect(W - 16 - PADDLE_W, state.aiY, PADDLE_W, PADDLE_H);

    // ball
    ctx.fillRect(state.ballX - BALL / 2, state.ballY - BALL / 2, BALL, BALL);

    if (state.ended) {
      drawConfetti();
      return;
    }

    // paused overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(5,5,5,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#888';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('click to play', W / 2, H / 2);
    }
  }

  // input
  canvas.addEventListener('click', () => {
    state.paused = false;
    canvas.focus();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    state.mouseY = (e.clientY - rect.top) * scaleY;
  });

  canvas.addEventListener('mouseleave', () => {
    state.mouseY = null;
  });

  document.addEventListener('keydown', (e) => {
    if (document.activeElement !== canvas) return;
    if (e.key === 'w' || e.key === 'W') state.keys.w = true;
    if (e.key === 's' || e.key === 'S') state.keys.s = true;
    if (e.key === ' ') { state.paused = !state.paused; e.preventDefault(); }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') state.keys.w = false;
    if (e.key === 's' || e.key === 'S') state.keys.s = false;
  });

  step();
})();
