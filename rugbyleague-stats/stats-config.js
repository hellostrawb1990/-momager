/* Rugby League Simple Stats — sport configuration.
   Scoring: try 4, conversion 2. (Legacy field goals / penalty goals from
   older saved games still count toward points, but have no buttons.) */

const SPORT_CONFIG = {
  id: 'rugbyleague',
  storagePrefix: 'league',
  appName: 'Momager: Rugby League',
  resultLabels: { W: 'Win', L: 'Loss', D: 'Draw' },

  buttons: [
    { key: 'try',  label: 'TRY',        sub: '+4',       kind: 'made', wide: true },
    { key: 'convm', label: 'CONVERSION', sub: 'Made +2',  kind: 'made' },
    { key: 'convx', label: 'CONVERSION', sub: 'Miss',     kind: 'miss' },
    { key: 'tklm', label: 'TACKLE',     sub: 'Made',     kind: 'neutral' },
    { key: 'tklx', label: 'TACKLE',     sub: 'Missed',   kind: 'miss' },
    { key: 'run',  label: 'RUN',        sub: '',         kind: 'neutral' },
    { key: 'bust', label: 'TACKLE BUST', sub: '',        kind: 'neutral' },
    { key: 'lb',   label: 'LINE BREAK', sub: '',         kind: 'neutral' },
    { key: 'off',  label: 'OFFLOAD',    sub: '',         kind: 'neutral' },
    { key: 'ast',  label: 'ASSIST',     sub: '',         kind: 'neutral' },
    { key: 'tsv',  label: 'TRY SAVER',  sub: '',         kind: 'neutral' },
    { key: 'err',  label: 'ERROR',      sub: '',         kind: 'bad' },
    { key: 'pen',  label: 'PENALTY',    sub: 'Conceded', kind: 'bad' },
    { key: 'sin',  label: 'SIN BIN',    sub: '',         kind: 'bad', wide: true }
  ],

  points(t) {
    /* pgm + fg are legacy keys — kept so old saved games score correctly */
    return 4 * (t.try || 0) + 2 * (t.convm || 0) + 2 * (t.pgm || 0) + (t.fg || 0);
  },

  liveChips(t) {
    const tm = t.tklm || 0, tx = t.tklx || 0;
    return [
      { label: 'TRIES', value: t.try || 0 },
      { label: 'TCK', value: (tm + tx) ? `${tm}/${tm + tx}` : '0/0' },
      { label: 'RUNS', value: t.run || 0 },
      { label: 'ERR', value: t.err || 0 }
    ];
  },

  derived(t) {
    const g = k => t[k] || 0;
    const convm = g('convm'), conva = convm + g('convx');
    const tklm = g('tklm'), tkla = tklm + g('tklx');
    const pct = (m, a) => a ? Math.round(100 * m / a) + '%' : '—';
    const rows = [
      { label: 'Points', value: this.points(t) },
      { label: 'Tries', value: g('try') },
      { label: 'Conversions', value: `${convm}/${conva} · ${pct(convm, conva)}` },
      { label: 'Tackles', value: `${tklm}/${tkla} · ${pct(tklm, tkla)}` },
      { label: 'Runs', value: g('run') },
      { label: 'Tackle busts', value: g('bust') },
      { label: 'Line breaks', value: g('lb') },
      { label: 'Offloads', value: g('off') },
      { label: 'Assists', value: g('ast') },
      { label: 'Try savers', value: g('tsv') },
      { label: 'Errors', value: g('err') },
      { label: 'Penalties conceded', value: g('pen') },
      { label: 'Sin bins', value: g('sin') }
    ];
    /* legacy stats from older games, shown only when present */
    const pgm = g('pgm'), pga = pgm + g('pgx');
    if (pga) rows.splice(3, 0, { label: 'Penalty goals', value: `${pgm}/${pga} · ${pct(pgm, pga)}` });
    if (g('fg')) rows.splice(3, 0, { label: 'Field goals', value: g('fg') });
    return rows;
  },

  seasonSummary(games) {
    const n = games.length;
    if (!n) return null;
    const sum = {};
    for (const gm of games) for (const k in gm.stats) sum[k] = (sum[k] || 0) + gm.stats[k];
    const g = k => sum[k] || 0;
    const totalPts = this.points(sum);
    const convm = g('convm'), conva = convm + g('convx');
    const tklm = g('tklm'), tkla = tklm + g('tklx');
    const pct = (m, a) => a ? Math.round(100 * m / a) + '%' : '—';
    const avg = v => (v / n).toFixed(1);
    const rec = { W: 0, L: 0, D: 0 };
    for (const gm of games) if (rec[gm.result] !== undefined) rec[gm.result]++;
    return {
      headline: [
        { label: 'Games', value: n },
        { label: 'Record', value: `${rec.W}–${rec.L}${rec.D ? '–' + rec.D : ''}` },
        { label: 'Tries', value: g('try') }
      ],
      rows: [
        { label: 'Points', total: totalPts, perGame: avg(totalPts) },
        { label: 'Tries', total: g('try'), perGame: avg(g('try')) },
        { label: 'Conversions', total: pct(convm, conva), perGame: `${convm}/${conva}` },
        { label: 'Tackle %', total: pct(tklm, tkla), perGame: `${tklm}/${tkla}` },
        { label: 'Tackles made', total: tklm, perGame: avg(tklm) },
        { label: 'Runs', total: g('run'), perGame: avg(g('run')) },
        { label: 'Tackle busts', total: g('bust'), perGame: avg(g('bust')) },
        { label: 'Line breaks', total: g('lb'), perGame: avg(g('lb')) },
        { label: 'Offloads', total: g('off'), perGame: avg(g('off')) },
        { label: 'Assists', total: g('ast'), perGame: avg(g('ast')) },
        { label: 'Try savers', total: g('tsv'), perGame: avg(g('tsv')) },
        { label: 'Errors', total: g('err'), perGame: avg(g('err')) },
        { label: 'Penalties conceded', total: g('pen'), perGame: avg(g('pen')) },
        { label: 'Sin bins', total: g('sin'), perGame: avg(g('sin')) }
      ]
    };
  },

  shareText(player, game) {
    const t = game.stats, g = k => t[k] || 0;
    const tklm = g('tklm'), tkla = tklm + g('tklx');
    return `${player.name} — ${this.points(t)} pts, ${g('try')} tries, ${g('run')} runs, ` +
      `${tklm}/${tkla} tackles vs ${game.opponent || 'opponent'} · ` +
      `${this.resultLabels[game.result] || ''} · ${game.date}`;
  }
};

function computeTotals(events) {
  const t = {};
  for (const e of events) t[e.k] = (t[e.k] || 0) + 1;
  return t;
}

if (typeof module !== 'undefined') module.exports = { SPORT_CONFIG, computeTotals };
