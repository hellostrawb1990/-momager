/* App shell — screen state machine + rendering. No frameworks, no network. */

const App = {
  screen: 'home',
  params: {},

  go(screen, params = {}) {
    this.screen = screen;
    this.params = params;
    render();
    window.scrollTo(0, 0);
  }
};

const $app = () => document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = iso => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/* ---------------- Rendering ---------------- */

function render() {
  const s = App.screen;
  if (s === 'home') return renderHome();
  if (s === 'playerForm') return renderPlayerForm();
  if (s === 'player') return renderPlayer();
  if (s === 'live') return renderLive();
  if (s === 'boxscore') return renderBoxScore();
  if (s === 'season') return renderSeason();
}

function renderHome() {
  const players = Store.players();
  const live = Store.liveGame();
  $app().innerHTML = `
    <header class="app-header">
      <div class="brand-row">
        <span class="brand-tile"><img class="logo-ball" src="icons/ball.svg" alt=""></span>
        <div>
          <div class="wordmark-row">
            <h1>MOMAGER</h1>
            <svg class="brand-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12,21.35 l-1.45-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 Z"/></svg>
          </div>
          <p class="sport-tag">${esc(SPORT_CONFIG.appName.replace('Momager: ', ''))} Stats Tracker</p>
        </div>
      </div>
      <p class="tagline">1 screen · 1 player · 1 game · 1 tap at a time</p>
    </header>
    ${live ? `
    <button class="resume-banner" data-action="resume-live">
      Game in progress — ${esc(Store.getPlayer(live.playerId)?.name || 'player')}. Tap to resume.
    </button>` : ''}
    <section class="card-list">
      ${players.length === 0 ? `
        <div class="empty">
          <p>No players yet.</p>
          <p class="muted">Add a player once, then it's one tap to start every game.</p>
        </div>` :
        players.map(p => `
        <button class="player-card" data-action="open-player" data-id="${p.id}">
          <span class="player-name">${esc(p.name)}</span>
          <span class="player-team">${esc(p.team)}</span>
          <span class="player-games">${Store.gamesFor(p.id).length} games</span>
        </button>`).join('')}
    </section>
    <button class="btn btn-primary btn-block" data-action="add-player">+ Add player</button>
    <div class="footer-actions">
      <button class="btn btn-ghost" data-action="export-data">Export backup</button>
      <button class="btn btn-ghost" data-action="import-data">Import backup</button>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
    </div>
    <p class="privacy-note">Your data stays on this device. No accounts, no servers, nothing sent anywhere.</p>`;
}

function renderPlayerForm() {
  const editing = App.params.playerId ? Store.getPlayer(App.params.playerId) : null;
  $app().innerHTML = `
    <header class="app-header slim">
      <button class="btn btn-back" data-action="back-home">‹ Back</button>
      <h2>${editing ? 'Edit player' : 'New player'}</h2>
    </header>
    <div class="form-card">
      <label>Player name
        <input id="f-name" type="text" value="${esc(editing?.name || '')}" autocomplete="off" maxlength="40">
      </label>
      <label>Team
        <input id="f-team" type="text" value="${esc(editing?.team || '')}" autocomplete="off" maxlength="40">
      </label>
      <button class="btn btn-primary btn-block" data-action="save-player">${editing ? 'Save changes' : 'Save player'}</button>
      ${editing ? `<button class="btn btn-danger-ghost btn-block" data-action="delete-player">Delete player and all their games</button>` : ''}
    </div>`;
  document.getElementById('f-name').focus();
}

function renderPlayer() {
  const p = Store.getPlayer(App.params.playerId);
  if (!p) return App.go('home');
  const games = Store.gamesFor(p.id);
  $app().innerHTML = `
    <header class="app-header slim">
      <button class="btn btn-back" data-action="back-home">‹ Players</button>
      <h2>${esc(p.name)}</h2>
      <p class="muted">${esc(p.team)}</p>
    </header>
    <button class="btn btn-primary btn-block btn-tall" data-action="start-game">Start game</button>
    <div class="row-2">
      <button class="btn btn-secondary" data-action="season-stats" ${games.length ? '' : 'disabled'}>Season stats</button>
      <button class="btn btn-secondary" data-action="edit-player">Edit player</button>
    </div>
    <h3 class="section-title">Game history</h3>
    <section class="card-list">
      ${games.length === 0 ? `<div class="empty"><p class="muted">No games saved yet.</p></div>` :
        games.map(g => `
        <button class="game-card" data-action="open-game" data-id="${g.id}">
          <span class="game-pts">${SPORT_CONFIG.points(g.stats)}<small>pts</small></span>
          <span class="game-meta">
            <span>vs ${esc(g.opponent || '—')}</span>
            <span class="muted">${fmtDate(g.date)}</span>
          </span>
          <span class="game-result r-${g.result}">${g.result}</span>
        </button>`).join('')}
    </section>`;
}

/* ---------- Live game ---------- */

function renderLive() {
  const lg = Store.liveGame();
  if (!lg) return App.go('home');
  const p = Store.getPlayer(lg.playerId);
  const totals = computeTotals(lg.events);
  const chips = SPORT_CONFIG.liveChips(totals);
  const last = lg.events[lg.events.length - 1];
  const lastBtn = last ? SPORT_CONFIG.buttons.find(b => b.key === last.k) : null;

  $app().innerHTML = `
    <div class="scoreboard">
      <div class="sb-player">${esc(p?.name || '')}</div>
      <div class="sb-points">${SPORT_CONFIG.points(totals)}</div>
      <div class="sb-chips">
        ${chips.map(c => `<span class="chip"><b>${esc(String(c.value))}</b> ${esc(c.label)}</span>`).join('')}
      </div>
    </div>
    <div class="undo-row">
      <button class="btn btn-undo" data-action="undo" ${lg.events.length ? '' : 'disabled'}>
        ⟲ Undo${lastBtn ? ` — ${esc(lastBtn.label)}${lastBtn.sub ? ' ' + esc(lastBtn.sub) : ''}` : ''}
      </button>
    </div>
    <div class="stat-grid">
      ${SPORT_CONFIG.buttons.map(b => `
        <button class="stat-btn k-${b.kind} ${b.wide ? 'wide' : ''}" data-action="stat" data-key="${b.key}">
          <span class="stat-label">${esc(b.label)}</span>
          ${b.sub ? `<span class="stat-sub">${esc(b.sub)}</span>` : ''}
          <span class="stat-count">${totals[b.key] || 0}</span>
        </button>`).join('')}
    </div>
    <div class="row-2 live-footer">
      <button class="btn btn-ghost" data-action="cancel-game">Cancel game</button>
      <button class="btn btn-primary" data-action="end-game">End game</button>
    </div>`;
}

function tapStat(key) {
  const lg = Store.liveGame();
  if (!lg) return;
  lg.events.push({ k: key, t: Date.now() });
  Store.setLiveGame(lg);
  if (navigator.vibrate) navigator.vibrate(10);
  renderLive();
}

function undoStat() {
  const lg = Store.liveGame();
  if (!lg || !lg.events.length) return;
  lg.events.pop();
  Store.setLiveGame(lg);
  renderLive();
}

/* ---------- End-game modal ---------- */

function showEndGameModal() {
  const lg = Store.liveGame();
  if (!lg) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>Save game</h3>
      <label>Opponent
        <input id="m-opp" type="text" autocomplete="off" maxlength="40" placeholder="e.g. Northcote">
      </label>
      <label>Date
        <input id="m-date" type="date" value="${todayISO()}">
      </label>
      <label>Result</label>
      <div class="seg" id="m-result">
        <button data-r="W" class="seg-btn">Win</button>
        <button data-r="L" class="seg-btn">Loss</button>
        <button data-r="D" class="seg-btn">Draw</button>
      </div>
      <label>Minutes played <span class="muted">(optional)</span>
        <input id="m-mins" type="number" inputmode="numeric" min="0" max="200">
      </label>
      <div class="row-2">
        <button class="btn btn-ghost" id="m-cancel">Keep playing</button>
        <button class="btn btn-primary" id="m-save">Save game</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  let result = 'W';
  const segBtns = modal.querySelectorAll('.seg-btn');
  const setSeg = r => { result = r; segBtns.forEach(b => b.classList.toggle('active', b.dataset.r === r)); };
  setSeg('W');
  segBtns.forEach(b => b.onclick = () => setSeg(b.dataset.r));
  modal.querySelector('#m-cancel').onclick = () => modal.remove();
  modal.querySelector('#m-save').onclick = () => {
    const game = Store.saveGame({
      playerId: lg.playerId,
      date: modal.querySelector('#m-date').value || todayISO(),
      opponent: modal.querySelector('#m-opp').value.trim(),
      result,
      minutes: parseInt(modal.querySelector('#m-mins').value, 10) || null,
      stats: computeTotals(lg.events)
    });
    Store.clearLiveGame();
    modal.remove();
    App.go('boxscore', { gameId: game.id, justSaved: true });
  };
}

/* ---------- Box score ---------- */

function renderBoxScore() {
  const g = Store.getGame(App.params.gameId);
  if (!g) return App.go('home');
  const p = Store.getPlayer(g.playerId);
  const lines = SPORT_CONFIG.derived(g.stats);
  $app().innerHTML = `
    <header class="app-header slim">
      <button class="btn btn-back" data-action="back-player" data-id="${g.playerId}">‹ ${esc(p?.name || 'Player')}</button>
      <h2>${App.params.justSaved ? 'Game saved' : 'Box score'}</h2>
    </header>
    <div class="box-card">
      <div class="box-head">
        <div>
          <div class="box-player">${esc(p?.name || '')}</div>
          <div class="muted">vs ${esc(g.opponent || '—')} · ${fmtDate(g.date)}
            ${g.minutes ? `· ${g.minutes} min` : ''}</div>
        </div>
        <span class="game-result big r-${g.result}">${g.result}</span>
      </div>
      <table class="box-table">
        ${lines.map(l => `<tr><td>${esc(l.label)}</td><td class="num">${esc(String(l.value))}</td></tr>`).join('')}
      </table>
    </div>
    <button class="btn btn-primary btn-block" data-action="share-game" data-id="${g.id}">Share box score</button>
    <button class="btn btn-danger-ghost btn-block" data-action="delete-game" data-id="${g.id}">Delete game</button>`;
}

/* ---------- Season stats ---------- */

function renderSeason() {
  const p = Store.getPlayer(App.params.playerId);
  if (!p) return App.go('home');
  const games = Store.gamesFor(p.id);
  const s = SPORT_CONFIG.seasonSummary(games);
  $app().innerHTML = `
    <header class="app-header slim">
      <button class="btn btn-back" data-action="back-player" data-id="${p.id}">‹ ${esc(p.name)}</button>
      <h2>Season stats</h2>
    </header>
    ${!s ? `<div class="empty"><p class="muted">No games saved yet.</p></div>` : `
    <div class="headline-row">
      ${s.headline.map(h => `<div class="headline-cell"><div class="hl-value">${esc(String(h.value))}</div><div class="hl-label">${esc(h.label)}</div></div>`).join('')}
    </div>
    <div class="box-card">
      <table class="box-table">
        <tr class="th"><td></td><td class="num">Total</td><td class="num">Per game</td></tr>
        ${s.rows.map(r => `<tr><td>${esc(r.label)}</td><td class="num">${esc(String(r.total))}</td><td class="num">${esc(String(r.perGame))}</td></tr>`).join('')}
      </table>
    </div>`}`;
}

/* ---------------- Actions (event delegation) ---------------- */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;

  if (a === 'add-player') App.go('playerForm');
  if (a === 'back-home') App.go('home');
  if (a === 'open-player') App.go('player', { playerId: el.dataset.id });
  if (a === 'back-player') App.go('player', { playerId: el.dataset.id });
  if (a === 'edit-player') App.go('playerForm', { playerId: App.params.playerId });

  if (a === 'save-player') {
    const name = document.getElementById('f-name').value.trim();
    if (!name) { document.getElementById('f-name').focus(); return; }
    const team = document.getElementById('f-team').value;
    if (App.params.playerId) {
      Store.updatePlayer(App.params.playerId, { name, team: team.trim() });
      App.go('player', { playerId: App.params.playerId });
    } else {
      const p = Store.addPlayer(name, team);
      App.go('player', { playerId: p.id });
    }
  }

  if (a === 'delete-player') {
    if (confirm('Delete this player and all their saved games? This can\u2019t be undone.')) {
      Store.deletePlayer(App.params.playerId);
      App.go('home');
    }
  }

  if (a === 'start-game') {
    const existing = Store.liveGame();
    if (existing && !confirm('Another game is in progress. Discard it and start a new one?')) return;
    Store.setLiveGame({ playerId: App.params.playerId, startedAt: Date.now(), events: [] });
    App.go('live');
  }

  if (a === 'resume-live') App.go('live');
  if (a === 'stat') tapStat(el.dataset.key);
  if (a === 'undo') undoStat();
  if (a === 'end-game') showEndGameModal();

  if (a === 'cancel-game') {
    if (confirm('Cancel this game? Nothing will be saved.')) {
      const pid = Store.liveGame()?.playerId;
      Store.clearLiveGame();
      App.go('player', { playerId: pid });
    }
  }

  if (a === 'open-game') App.go('boxscore', { gameId: el.dataset.id });

  if (a === 'delete-game') {
    const g = Store.getGame(el.dataset.id);
    if (g && confirm('Delete this game?')) {
      Store.deleteGame(g.id);
      App.go('player', { playerId: g.playerId });
    }
  }

  if (a === 'share-game') shareGame(el.dataset.id);
  if (a === 'season-stats') App.go('season', { playerId: App.params.playerId });

  if (a === 'export-data') {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${SPORT_CONFIG.id}-stats-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (a === 'import-data') {
    const input = document.getElementById('import-file');
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const r = Store.importJSON(reader.result);
          alert(`Imported ${r.players} players and ${r.games} games. This replaced the data on this device.`);
          App.go('home');
        } catch (err) { alert('Import failed: ' + err.message); }
      };
      reader.readAsText(file);
    };
    input.click();
  }
});

/* ---------------- Boot ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});
