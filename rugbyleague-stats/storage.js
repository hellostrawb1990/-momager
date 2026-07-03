/* Storage — everything lives in localStorage on this device. No servers. */

const Store = (() => {
  const P = SPORT_CONFIG.storagePrefix;
  const key = k => `${P}:${k}`;

  function read(k, fallback) {
    try {
      const v = localStorage.getItem(key(k));
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(k, v) { localStorage.setItem(key(k), JSON.stringify(v)); }
  function remove(k) { localStorage.removeItem(key(k)); }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  return {
    // ---- Players ----
    players() { return read('players', []); },
    getPlayer(id) { return this.players().find(p => p.id === id) || null; },
    addPlayer(name, team) {
      const players = this.players();
      const p = { id: uid(), name: name.trim(), team: (team || '').trim(), createdAt: Date.now() };
      players.push(p); write('players', players); return p;
    },
    updatePlayer(id, fields) {
      const players = this.players();
      const p = players.find(x => x.id === id);
      if (p) { Object.assign(p, fields); write('players', players); }
    },
    deletePlayer(id) {
      write('players', this.players().filter(p => p.id !== id));
      write('games', this.allGames().filter(g => g.playerId !== id));
    },

    // ---- Games ----
    allGames() { return read('games', []); },
    gamesFor(playerId) {
      return this.allGames().filter(g => g.playerId === playerId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    getGame(id) { return this.allGames().find(g => g.id === id) || null; },
    saveGame(game) {
      const games = this.allGames();
      game.id = uid(); game.createdAt = Date.now();
      games.push(game); write('games', games); return game;
    },
    updateGame(id, fields) {
      const games = this.allGames();
      const g = games.find(x => x.id === id);
      if (g) { Object.assign(g, fields); write('games', games); }
    },
    deleteGame(id) { write('games', this.allGames().filter(g => g.id !== id)); },

    // ---- Live game (persisted every tap so a crash/reload loses nothing) ----
    liveGame() { return read('liveGame', null); },
    setLiveGame(lg) { write('liveGame', lg); },
    clearLiveGame() { remove('liveGame'); },

    // ---- Backup ----
    exportJSON() {
      return JSON.stringify({
        app: SPORT_CONFIG.id, exportedAt: new Date().toISOString(),
        players: this.players(), games: this.allGames()
      }, null, 2);
    },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!Array.isArray(data.players) || !Array.isArray(data.games)) {
        throw new Error('Not a valid backup file.');
      }
      write('players', data.players);
      write('games', data.games);
      return { players: data.players.length, games: data.games.length };
    }
  };
})();
