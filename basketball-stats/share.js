/* Share — draws the box score to a canvas image and hands it to the native
   share sheet. Falls back to downloading the image + copying text. Fully offline. */

function drawBoxScoreImage(player, game) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const theme = getComputedStyle(document.documentElement);
  const col = v => theme.getPropertyValue(v).trim() || '#000';
  const bg = col('--share-bg'), panel = col('--share-panel'),
        accent = col('--accent'), text = col('--share-text'), mut = col('--share-muted');

  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.fillStyle = accent; x.fillRect(0, 0, W, 14);

  // Header
  x.fillStyle = text;
  x.font = '800 72px -apple-system, system-ui, sans-serif';
  x.fillText(player.name, 70, 160);
  x.fillStyle = mut;
  x.font = '500 40px -apple-system, system-ui, sans-serif';
  const meta = `vs ${game.opponent || '—'}  ·  ${game.date.split('-').reverse().join('/')}` +
    (game.minutes ? `  ·  ${game.minutes} min` : '');
  x.fillText(meta, 70, 225);

  // Result pill
  const rl = SPORT_CONFIG.resultLabels[game.result] || game.result;
  x.font = '800 44px -apple-system, system-ui, sans-serif';
  const rw = x.measureText(rl).width + 60;
  x.fillStyle = game.result === 'W' ? '#2E9E5B' : game.result === 'L' ? '#C64545' : '#8A8A8A';
  roundRect(x, W - 70 - rw, 110, rw, 78, 39); x.fill();
  x.fillStyle = '#fff';
  x.fillText(rl, W - 70 - rw + 30, 165);

  // Big points
  const pts = SPORT_CONFIG.points(game.stats);
  x.fillStyle = accent;
  x.font = '800 210px ui-monospace, Menlo, monospace';
  x.fillText(String(pts), 70, 470);
  x.fillStyle = mut;
  x.font = '600 46px -apple-system, system-ui, sans-serif';
  x.fillText('POINTS', 80 + x.measureText('').width + measure(x, String(pts), '800 210px ui-monospace, Menlo, monospace') + 30, 460);

  // Stat panel
  const lines = SPORT_CONFIG.derived(game.stats).slice(1); // skip Points, already shown
  x.fillStyle = panel;
  roundRect(x, 70, 530, W - 140, lines.length * 66 + 60, 28); x.fill();
  let yy = 590;
  for (const l of lines) {
    x.fillStyle = mut;
    x.font = '500 40px -apple-system, system-ui, sans-serif';
    x.fillText(l.label, 110, yy + 12);
    x.fillStyle = text;
    x.font = '700 42px ui-monospace, Menlo, monospace';
    const v = String(l.value);
    x.fillText(v, W - 110 - x.measureText(v).width, yy + 12);
    yy += 66;
  }

  // Footer
  x.fillStyle = mut;
  x.font = '500 34px -apple-system, system-ui, sans-serif';
  x.fillText(SPORT_CONFIG.appName, 70, H - 60);

  return c;
}

function measure(x, s, font) {
  const prev = x.font; x.font = font;
  const w = x.measureText(s).width; x.font = prev; return w;
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

async function shareGame(gameId) {
  const game = Store.getGame(gameId);
  const player = Store.getPlayer(game.playerId);
  const text = SPORT_CONFIG.shareText(player, game);
  const canvas = drawBoxScoreImage(player, game);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'box-score.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  if (navigator.share) {
    try { await navigator.share({ text }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  // Fallback: download the image and copy the text
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'box-score.png'; link.click();
  URL.revokeObjectURL(url);
  try { await navigator.clipboard.writeText(text); alert('Image downloaded and summary copied to clipboard.'); }
  catch (e) { alert('Image downloaded.'); }
}
