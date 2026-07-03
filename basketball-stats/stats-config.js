/* Basketball Simple Stats — sport configuration.
   This file is the ONLY meaningful difference between the two apps. */

const SPORT_CONFIG = {
  id: 'basketball',
  storagePrefix: 'bball',
  appName: 'Momager: Basketball',
  resultLabels: { W: 'Win', L: 'Loss', D: 'Draw' },

  // Live-screen tap buttons, rendered in order, 2 per row ('wide' spans both).
  // kind: 'made' | 'miss' | 'neutral' | 'bad'  (colours the button)
  buttons: [
    { key: 'fg2m', label: '2PT', sub: 'Made +2', kind: 'made' },
    { key: 'fg2x', label: '2PT', sub: 'Miss',    kind: 'miss' },
    { key: 'fg3m', label: '3PT', sub: 'Made +3', kind: 'made' },
    { key: 'fg3x', label: '3PT', sub: 'Miss',    kind: 'miss' },
    { key: 'ftm',  label: 'FT',  sub: 'Made +1', kind: 'made' },
    { key: 'ftx',  label: 'FT',  sub: 'Miss',    kind: 'miss' },
    { key: 'oreb', label: 'OFF REB', sub: '',    kind: 'neutral' },
    { key: 'dreb', label: 'DEF REB', sub: '',    kind: 'neutral' },
    { key: 'ast',  label: 'ASSIST',  sub: '',    kind: 'neutral' },
    { key: 'stl',  label: 'STEAL',   sub: '',    kind: 'neutral' },
    { key: 'blk',  label: 'BLOCK',   sub: '',    kind: 'neutral' },
    { key: 'tov',  label: 'TURNOVER', sub: '',   kind: 'bad' },
    { key: 'pf',   label: 'FOUL',    sub: '',    kind: 'bad', wide: true }
  ],

  // Points from a totals object
  points(t) {
    return 2 * (t.fg2m || 0) + 3 * (t.fg3m || 0) + (t.ftm || 0);
  },

  // Compact chips shown live at the top of the game screen
  liveChips(t) {
    const fgm = (t.fg2m || 0) + (t.fg3m || 0);
    const fga = fgm + (t.fg2x || 0) + (t.fg3x || 0);
    return [
      { label: 'FG', value: fga ? `${fgm}/${fga}` : '0/0' },
      { label: 'REB', value: (t.oreb || 0) + (t.dreb || 0) },
      { label: 'AST', value: t.ast || 0 },
      { label: 'TO', value: t.tov || 0 }
    ];
  },

  // Full derived/box-score lines from a totals object
  derived(t) {
    const g = k => t[k] || 0;
    const fgm = g('fg2m') + g('fg3m'), fga = fgm + g('fg2x') + g('fg3x');
    const tpm = g('fg3m'), tpa = tpm + g('fg3x');
    const ftm = g('ftm'), fta = ftm + g('ftx');
    const pct = (m, a) => a ? Math.round(100 * m / a) + '%' : '—';
    return [
      { label: 'Points', value: this.points(t) },
      { label: 'Field goals', value: `${fgm}/${fga} · ${pct(fgm, fga)}` },
      { label: '3-pointers', value: `${tpm}/${tpa} · ${pct(tpm, tpa)}` },
      { label: 'Free throws', value: `${ftm}/${fta} · ${pct(ftm, fta)}` },
      { label: 'Rebounds', value: `${g('oreb') + g('dreb')} (${g('oreb')} off / ${g('dreb')} def)` },
      { label: 'Assists', value: g('ast') },
      { label: 'Steals', value: g('stl') },
      { label: 'Blocks', value: g('blk') },
      { label: 'Turnovers', value: g('tov') },
      { label: 'Fouls', value: g('pf') }
    ];
  },

  // Season summary rows from an array of games (each with .stats totals and .result)
  seasonSummary(games) {
    const n = games.length;
    if (!n) return null;
    const sum = {};
    for (const gm of games) for (const k in gm.stats) sum[k] = (sum[k] || 0) + gm.stats[k];
    const g = k => sum[k] || 0;
    const totalPts = this.points(sum);
    const fgm = g('fg2m') + g('fg3m'), fga = fgm + g('fg2x') + g('fg3x');
    const tpm = g('fg3m'), tpa = tpm + g('fg3x');
    const ftm = g('ftm'), fta = ftm + g('ftx');
    const pct = (m, a) => a ? Math.round(100 * m / a) + '%' : '—';
    const avg = v => (v / n).toFixed(1);
    const rec = { W: 0, L: 0, D: 0 };
    for (const gm of games) if (rec[gm.result] !== undefined) rec[gm.result]++;
    return {
      headline: [
        { label: 'Games', value: n },
        { label: 'Record', value: `${rec.W}–${rec.L}${rec.D ? '–' + rec.D : ''}` },
        { label: 'PPG', value: avg(totalPts) }
      ],
      rows: [
        { label: 'Points', total: totalPts, perGame: avg(totalPts) },
        { label: 'FG%', total: pct(fgm, fga), perGame: `${fgm}/${fga}` },
        { label: '3P%', total: pct(tpm, tpa), perGame: `${tpm}/${tpa}` },
        { label: 'FT%', total: pct(ftm, fta), perGame: `${ftm}/${fta}` },
        { label: 'Rebounds', total: g('oreb') + g('dreb'), perGame: avg(g('oreb') + g('dreb')) },
        { label: 'Assists', total: g('ast'), perGame: avg(g('ast')) },
        { label: 'Steals', total: g('stl'), perGame: avg(g('stl')) },
        { label: 'Blocks', total: g('blk'), perGame: avg(g('blk')) },
        { label: 'Turnovers', total: g('tov'), perGame: avg(g('tov')) },
        { label: 'Fouls', total: g('pf'), perGame: avg(g('pf')) }
      ]
    };
  },

  // Short text summary for sharing
  shareText(player, game) {
    const t = game.stats, g = k => t[k] || 0;
    const fgm = g('fg2m') + g('fg3m'), fga = fgm + g('fg2x') + g('fg3x');
    return `${player.name} — ${this.points(t)} pts, ${g('oreb') + g('dreb')} reb, ${g('ast')} ast` +
      ` (FG ${fgm}/${fga})` +
      ` vs ${game.opponent || 'opponent'} · ${this.resultLabels[game.result] || ''} · ${game.date}`;
  }
};

// Shared pure helpers (identical in both apps)
function computeTotals(events) {
  const t = {};
  for (const e of events) t[e.k] = (t[e.k] || 0) + 1;
  return t;
}

if (typeof module !== 'undefined') module.exports = { SPORT_CONFIG, computeTotals };
