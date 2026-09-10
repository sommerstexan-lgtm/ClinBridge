/* ============================================================
   Texans HQ — Personal PWA  v15.18
   Privacy-first • Offline-friendly • Self-contained
   Password-protected (remembers device)
   High-contrast light theme
   Roster + Next Play Lean + Dominos to Win (causal path model)
   Active nav: black box + white icon/label
   Demo removed · Game Center truthful
   Export/import backup + post-game reminder
   Preseason lab book (does not touch official Next Play / Dominos weights)
   Game-day dock window + tab-focus refresh
   ============================================================ */

const APP_PASSWORD = 'texans2026';
const APP_VERSION = 'v15.18';

const APP_VERSION_LABEL = 'v15.18 · Week 1';

/* ============================================================
   INTEGRITY / ANTI-DRIFT GUARDS (v15.11)
   Boot self-test + cache schema versions + required roster names
   ============================================================ */
const CACHE_SCHEMA = {
  roster: 2,
  camp: 2,
  news: 2,
  videos: 1,
  dominosMemory: 1
};
const REQUIRED_ROSTER_NAMES = [
  'C.J. Stroud', 'Nico Collins', 'Will Anderson Jr.', 'Derek Stingley Jr.',
  'Keylan Rutledge', 'Lewis Bond', 'David Montgomery', 'Azeez Al-Shaair'
];

function purgeStaleCache(key, schemaVersion) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed._schema !== schemaVersion) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    try { localStorage.removeItem(key); } catch (e2) {}
  }
}

function runIntegritySelfTest() {
  const issues = [];
  try {
    if (typeof FULL_ROSTER === 'undefined' || !Array.isArray(FULL_ROSTER) || FULL_ROSTER.length < 80) {
      issues.push('Baked roster thin (' + (FULL_ROSTER ? FULL_ROSTER.length : 0) + ')');
    } else {
      const names = new Set(FULL_ROSTER.map(function (p) { return p.name; }));
      REQUIRED_ROSTER_NAMES.forEach(function (n) {
        if (!names.has(n)) issues.push('Missing required name: ' + n);
      });
    }
    if (typeof LIVE_DEMO !== 'undefined' && LIVE_DEMO.active === true) {
      issues.push('LIVE_DEMO unexpectedly active');
      LIVE_DEMO.active = false;
    }
    if (typeof PRE_GAME_DOMINOS === 'undefined' || !PRE_GAME_DOMINOS.DEFAULT) {
      issues.push('PRE_GAME_DOMINOS missing DEFAULT seeds');
    }
    if (typeof evaluateDominos !== 'function' || typeof evaluateDominosForSide !== 'function') {
      issues.push('Dominos evaluators missing');
    }
    if (typeof loadRoster !== 'function' || typeof rosterIntegrityCheck !== 'function') {
      issues.push('Roster loader/guard missing');
    }
  } catch (e) {
    issues.push('Self-test exception: ' + (e && e.message ? e.message : 'unknown'));
  }
  return { ok: issues.length === 0, issues: issues };
}



/* Stable key — never changes across versions so the device stays unlocked */
const UNLOCK_KEY = 'texans-hq-device-unlocked';
/* Old keys from previous versions (for one-time migration) */
const LEGACY_UNLOCK_KEYS = [
  'texans-hq-unlocked-v2',
  'texans-hq-unlocked-v3',
  'texans-hq-unlocked-v4',
  'texans-hq-unlocked-v5',
  'texans-hq-unlocked-v6'
];

const TEXANS = {
  id: 34,
  abbr: 'HOU',
  name: 'Houston Texans',
  color: '#03202F',
  red: '#A71930'
};

/** Same-origin proxy in this preview; GitHub Pages hits ESPN directly (simple CORS GET). */
function useEspnProxy() {
  try {
    const h = location.hostname || '';
    if (location.protocol === 'file:') return false;
    if (/\.github\.io$/.test(h)) return false;
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return true;
  } catch (e) {}
  return false;
}
function espnUrl(target) {
  return useEspnProxy() ? ('/api/espn?u=' + encodeURIComponent(target)) : target;
}
function feedUrl(target) {
  return useEspnProxy() ? ('/api/feed?u=' + encodeURIComponent(target)) : target;
}
function espnFetchOpts() {
  return useEspnProxy() ? { cache: 'no-store' } : { mode: 'cors' };
}

/* ---------- Password Lock ---------- */
function isUnlocked() {
  if (localStorage.getItem(UNLOCK_KEY) === 'true') return true;
  // One-time migration from older version keys
  for (const k of LEGACY_UNLOCK_KEYS) {
    if (localStorage.getItem(k) === 'true') {
      localStorage.setItem(UNLOCK_KEY, 'true');
      return true;
    }
  }
  return false;
}

function unlockApp() {
  localStorage.setItem(UNLOCK_KEY, 'true');
  document.getElementById('lockScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('locked');
  init(); // start the real app only after unlock
}

function setupLock() {
  const lockScreen = document.getElementById('lockScreen');
  const appShell = document.getElementById('appShell');
  const input = document.getElementById('lockPassword');
  const btn = document.getElementById('lockUnlockBtn');
  const err = document.getElementById('lockError');

  if (isUnlocked()) {
    lockScreen.classList.add('hidden');
    appShell.classList.remove('locked');
    return true; // already unlocked
  }

  // Show lock, hide app
  lockScreen.classList.remove('hidden');
  appShell.classList.add('locked');

  function tryUnlock() {
    if (input.value === APP_PASSWORD) {
      unlockApp();
    } else {
      err.style.display = 'block';
      input.value = '';
      input.focus();
      setTimeout(() => { err.style.display = 'none'; }, 1800);
    }
  }

  btn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  // Focus the input
  setTimeout(() => input.focus(), 300);
  return false;
}

/* ---------- 2026 Schedule (hardcoded from public sources) ---------- */
const SCHEDULE_2026 = [
  // Preseason
  { week: 'PS1', date: '2026-08-13', time: '19:00', opp: 'Los Angeles Chargers', oppAbbr: 'LAC', home: true, result: null, type: 'pre', tv: 'Local (KTRK)' },
  { week: 'PS2', date: '2026-08-20', time: '19:00', opp: 'Las Vegas Raiders', oppAbbr: 'LV', home: true, result: null, type: 'pre', tv: 'ESPN' },
  { week: 'PS3', date: '2026-08-28', time: '18:00', opp: 'Carolina Panthers', oppAbbr: 'CAR', home: false, result: null, type: 'pre', tv: 'Local (KTRK)' },
  // Regular
  { week: 1, date: '2026-09-13', time: '12:00', opp: 'Buffalo Bills', oppAbbr: 'BUF', home: true, result: null, type: 'reg', tv: 'CBS' },
  { week: 2, date: '2026-09-20', time: '12:00', opp: 'Cincinnati Bengals', oppAbbr: 'CIN', home: true, result: null, type: 'reg', tv: 'CBS' },
  { week: 3, date: '2026-09-27', time: '12:00', opp: 'Indianapolis Colts', oppAbbr: 'IND', home: false, result: null, type: 'reg', tv: 'CBS' },
  { week: 4, date: '2026-10-04', time: '12:00', opp: 'Dallas Cowboys', oppAbbr: 'DAL', home: true, result: null, type: 'reg', tv: 'FOX' },
  { week: 5, date: '2026-10-11', time: '12:00', opp: 'Tennessee Titans', oppAbbr: 'TEN', home: false, result: null, type: 'reg', tv: 'CBS' },
  { week: 6, date: '2026-10-18', time: '08:30', opp: 'Jacksonville Jaguars', oppAbbr: 'JAX', home: false, result: null, type: 'reg', note: 'London (Wembley)', tv: 'NFL Network' },
  { week: 7, date: '2026-10-25', time: '12:00', opp: 'New York Giants', oppAbbr: 'NYG', home: true, result: null, type: 'reg', tv: 'FOX' },
  { week: 8, date: null, time: null, opp: 'BYE', oppAbbr: '—', home: true, result: null, type: 'bye', tv: null },
  { week: 9, date: '2026-11-08', time: '15:05', opp: 'Los Angeles Chargers', oppAbbr: 'LAC', home: false, result: null, type: 'reg', tv: 'CBS' },
  { week: 10, date: '2026-11-15', time: '12:00', opp: 'Cleveland Browns', oppAbbr: 'CLE', home: false, result: null, type: 'reg', tv: 'FOX' },
  { week: 11, date: '2026-11-19', time: '19:15', opp: 'Indianapolis Colts', oppAbbr: 'IND', home: true, result: null, type: 'reg', note: 'TNF', tv: 'Prime Video' },
  { week: 12, date: '2026-11-29', time: '12:00', opp: 'Baltimore Ravens', oppAbbr: 'BAL', home: true, result: null, type: 'reg', tv: 'CBS' },
  { week: 13, date: '2026-12-06', time: '19:20', opp: 'Pittsburgh Steelers', oppAbbr: 'PIT', home: false, result: null, type: 'reg', note: 'SNF', tv: 'NBC' },
  { week: 14, date: '2026-12-13', time: '12:00', opp: 'Washington Commanders', oppAbbr: 'WAS', home: false, result: null, type: 'reg', tv: 'CBS' },
  { week: 15, date: '2026-12-20', time: '12:00', opp: 'Jacksonville Jaguars', oppAbbr: 'JAX', home: true, result: null, type: 'reg', tv: 'CBS' },
  { week: 16, date: '2026-12-24', time: '19:15', opp: 'Philadelphia Eagles', oppAbbr: 'PHI', home: false, result: null, type: 'reg', note: 'TNF Christmas Eve', tv: 'Prime Video' },
  { week: 17, date: '2027-01-04', time: '19:15', opp: 'Green Bay Packers', oppAbbr: 'GB', home: false, result: null, type: 'reg', note: 'MNF', tv: 'ESPN' },
  { week: 18, date: '2027-01-10', time: '12:00', opp: 'Tennessee Titans', oppAbbr: 'TEN', home: true, result: null, type: 'reg', note: 'TBD flex', tv: 'TBD' }
];

/* ---------- Sample Play-by-Play (for offline / demo of a scoring drive) ---------- */
/* SAMPLE_PBP removed — no demo plays */

/* ---------- Training Camp notes (real intel as of Aug 4 2026) ---------- */
const CAMP_NOTES = [
  {
    date: 'Tue Aug 4',
    text: 'Jayden Higgins (Year 2) continues to blossom. Multiple catches vs All-Pro Derek Stingley Jr., including a 20-yard third-down gain. Nico Collins: “He’s hooping right now.” Stroud expects a dominant Year 2.'
  },
  {
    date: 'Tue Aug 4',
    text: 'C.J. Stroud sharp in second padded practice — only two incompletions, zero turnovers. Strong chemistry with Dalton Schultz and Jayden Higgins. Nico Collins given a rest day.'
  },
  {
    date: 'Tue Aug 4',
    text: 'Linebacker Azeez Al-Shaair slow to get up after collision with TE Dalton Schultz but was fine shortly after. No injury reported.'
  },
  {
    date: 'Mon Aug 3',
    text: 'First day of pads. Physical practice, tempers flared at times. Jadeveon Clowney (re-signed) back on the grass. Offense and defense both showed flashes.'
  },
  {
    date: 'Camp Overview',
    text: '25th season. DeMeco Ryans entering Year 4. Open practices continue through Aug 18 (joint with Raiders). Joint practice with Carolina also scheduled later in camp.'
  }
];

const CAMP_OPEN_DATES = [
  'Wed Aug 5 · 9 a.m.',
  'Fri Aug 7 · 9 a.m.',
  'Sat Aug 8 · 6 p.m.',
  'Mon Aug 10 · 9 a.m.',
  'Tue Aug 18 · 9 a.m. (Joint Practice vs Las Vegas Raiders)'
];

/* ---------- 2025 season snapshot (public) ---------- */
const TEAM_STATS_2025 = [
  { label: 'Record', value: '12-5' },
  { label: 'Points For', value: '23.8' },
  { label: 'Points Against', value: '17.4' },
  { label: 'Pass Yds/G', value: '218.1' },
  { label: 'Rush Yds/G', value: '108.9' },
  { label: 'AFC South', value: '2nd' }
];

const KEY_PLAYERS = [
  { name: 'C.J. Stroud', pos: 'QB', num: '7', note: 'Franchise QB · Year 4', stats: '2025: 3,700+ pass yds · 20+ TD',
    detail: 'Year-4 starter. Week 1 timing with Collins / Schultz / Hutchinson / Noel. Higgins is out for the season.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4432577/cj-stroud' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/S/StroCJ00.htm' },
    { label: 'NFL.com', url: 'https://www.nfl.com/players/c-j-stroud/' }
  ]},
  { name: 'Nico Collins', pos: 'WR', num: '12', note: 'Pro Bowl X receiver', stats: 'Big-play + contested catches',
    detail: 'Primary vertical threat. Occasional rest days in camp are normal. Watch how defenses scheme him Week 1 vs BUF.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4258179/nico-collins' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/C/CollNi00.htm' }
  ]},
  { name: 'Jayden Higgins', pos: 'WR', num: '81', note: 'IR · out for 2026 (ACL)', stats: 'Torn ACL mid-August joint practice',
    detail: 'Season-ending ACL in August joint practice. Do not treat as Week 1 WR2. Collins / Hutchinson / Noel / Dell / Boutte carry the room.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4689388/jayden-higgins' },
    { label: 'NFL.com', url: 'https://www.nfl.com/players/jayden-higgins/' }
  ]},
  { name: 'David Montgomery', pos: 'RB', num: '32', note: 'New lead back', stats: 'Power + between-tackles',
    detail: 'Signed to be the early-down and short-yardage lead. Pass protection and check-downs matter as much as rush yards.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4035538/david-montgomery' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/M/MontDa01.htm' }
  ]},
  { name: 'Dalton Schultz', pos: 'TE', num: '86', note: 'Safety valve / red zone', stats: 'Reliable intermediate + RZ',
    detail: 'Trusted option for Stroud. Red-zone and 3rd-down snaps are the live-game value markers. Watch workload after prior injury history.' },
  { name: 'Will Anderson Jr.', pos: 'DE', num: '51', note: 'All-Pro edge force', stats: 'Primary pass-rush threat',
    detail: 'Lead edge. How often he pairs with Clowney/Hunter on obvious passing downs is a weekly watch item.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4429013/will-anderson-jr' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/A/AndeWi01.htm' }
  ]},
  { name: 'Derek Stingley Jr.', pos: 'CB', num: '24', note: 'Shutdown corner', stats: 'Often shadows #1 WR',
    detail: 'Travels with the opponent’s top receiver. Camp 1-on-1s are useful signals, not final grades.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4430001/derek-stingley-jr' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/S/StinDe00.htm' }
  ]},
  { name: 'Azeez Al-Shaair', pos: 'LB', num: '0', note: 'Defensive leader', stats: 'Run fit + communication',
    detail: 'Communicator and run-fit LB. Extension locked him in. Availability can change fast with camp bumps.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/3915373/azeez-al-shaair' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/A/AlShAz00.htm' }
  ]},
  { name: 'Jadeveon Clowney', pos: 'DE', num: '90', note: 'Hometown reunion 2026', stats: 'Veteran edge rotation',
    detail: 'Back on a 1-year deal, #90 reclaimed. Rotational + situational pass-rush alongside Anderson & Hunter. Nostalgia + real edge depth.' },
  { name: 'Danielle Hunter', pos: 'DE', num: '55', note: 'Pro Bowl edge', stats: 'Veteran production',
    detail: 'Key piece of the returning top defense. Pairs with Anderson for one of the strongest edge groups in the AFC.' , links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/2969939/danielle-hunter' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/H/HuntDa01.htm' }
  ]},
  { name: 'Tank Dell', pos: 'WR', num: '1', note: 'Returning from knee', stats: 'Slot / big-play threat',
    detail: 'Working back from 2024 knee injury that cost him all of 2025. Camp participation and preseason snaps are the real timeline markers.' }
];

const TEAM_STAT_DETAILS = {
  'Record': '2025 regular-season finish. Used here as context only — 2026 results will replace this when the season starts.',
  'Points For': '2025 points scored per game (approx). Offense tempo and red-zone TD rate drive this number.',
  'Points Against': '2025 points allowed per game (approx). Lower is better.',
  'Pass Yds/G': '2025 team passing yards per game.',
  'Rush Yds/G': '2025 team rushing yards per game.',
  'AFC South': '2025 division finish.'
};


/* Live game state — inactive by default. Demo live mode removed.
   When real live data is available, set active:true and populate fields. */
const LIVE_DEMO = { active: false }; // permanently disabled — never used for UI truth


/* ============================================================
   LIVE GAME FEED + DOMINOS MEMORY  (v15.7)
   Real ESPN public endpoints (same pattern as News).
   LIVE_GAME drives scoreboard, Dominos resolution, post-game path.
   LIVE_DEMO stays false — never used as the truth path.
   ============================================================ */

const ESPN_TEAM_ID = '34'; // Houston Texans
const DOMINOS_MEMORY_KEY = 'texans-hq-dominos-memory-v1';

/** Authoritative live / final game state (replaces demo for real games) */
const LIVE_GAME = {
  active: false,
  final: false,
  eventId: null,
  status: 'idle', // idle | pre | in | final
  houScore: 0,
  oppScore: 0,
  oppAbbr: 'OPP',
  oppName: '',
  qtr: 1,
  clockSeconds: 0,
  clockDisplay: '',
  possession: 'HOU',
  down: 1,
  distance: 10,
  yardNum: 50,
  yardSide: 'own',
  yardline: '—',
  recentPlays: [],
  weather: null,
  lastUpdated: 0,
  detail: '',
  home: true,
  phase: 'unk',          // 'pre' | 'reg' | 'post' | 'unk'
  seasonType: null,      // ESPN season.type when known (1 pre, 2 reg, 3 post)
  focusAbbr: 'HOU',
  focusId: '34',
  ourAbbr: 'HOU',
  homeAbbr: 'HOU',
  awayAbbr: 'OPP',
  injuryRows: []
};

let livePollTimer = null;
const LIVE_POLL_MS = 6000;
const LIVE_POLL_MS_HIDDEN = 15000;

/* ============================================================
   LEAGUE WEEK + WATCH LIST + SCOUT MEMORY  (v15.17)
   Sched = this NFL week (toggle: Texans season).
   Game Center follows ONE selected eventId.
   Live poll hits summary?event=id only — never the whole slate.
   ============================================================ */

const WATCH_LIST_KEY = 'texans-hq-watch-v1';
const CURRENT_WATCH_KEY = 'texans-hq-current-watch-v1';
const SCOUT_MEMORY_KEY = 'texans-hq-scout-v1';
const SCHED_VIEW_KEY = 'texans-hq-sched-view-v1';
const WEEK_SLATE_KEY = 'texans-hq-week-slate-v1';

const NFL_TEAMS = {
  ARI: { id: '22', name: 'Arizona Cardinals', nick: 'Cardinals' },
  ATL: { id: '1', name: 'Atlanta Falcons', nick: 'Falcons' },
  BAL: { id: '33', name: 'Baltimore Ravens', nick: 'Ravens' },
  BUF: { id: '2', name: 'Buffalo Bills', nick: 'Bills' },
  CAR: { id: '29', name: 'Carolina Panthers', nick: 'Panthers' },
  CHI: { id: '3', name: 'Chicago Bears', nick: 'Bears' },
  CIN: { id: '4', name: 'Cincinnati Bengals', nick: 'Bengals' },
  CLE: { id: '5', name: 'Cleveland Browns', nick: 'Browns' },
  DAL: { id: '6', name: 'Dallas Cowboys', nick: 'Cowboys' },
  DEN: { id: '7', name: 'Denver Broncos', nick: 'Broncos' },
  DET: { id: '8', name: 'Detroit Lions', nick: 'Lions' },
  GB: { id: '9', name: 'Green Bay Packers', nick: 'Packers' },
  HOU: { id: '34', name: 'Houston Texans', nick: 'Texans' },
  IND: { id: '11', name: 'Indianapolis Colts', nick: 'Colts' },
  JAX: { id: '30', name: 'Jacksonville Jaguars', nick: 'Jaguars' },
  KC: { id: '12', name: 'Kansas City Chiefs', nick: 'Chiefs' },
  LV: { id: '13', name: 'Las Vegas Raiders', nick: 'Raiders' },
  LAC: { id: '24', name: 'Los Angeles Chargers', nick: 'Chargers' },
  LAR: { id: '14', name: 'Los Angeles Rams', nick: 'Rams' },
  MIA: { id: '15', name: 'Miami Dolphins', nick: 'Dolphins' },
  MIN: { id: '16', name: 'Minnesota Vikings', nick: 'Vikings' },
  NE: { id: '17', name: 'New England Patriots', nick: 'Patriots' },
  NO: { id: '18', name: 'New Orleans Saints', nick: 'Saints' },
  NYG: { id: '19', name: 'New York Giants', nick: 'Giants' },
  NYJ: { id: '20', name: 'New York Jets', nick: 'Jets' },
  PHI: { id: '21', name: 'Philadelphia Eagles', nick: 'Eagles' },
  PIT: { id: '23', name: 'Pittsburgh Steelers', nick: 'Steelers' },
  SF: { id: '25', name: 'San Francisco 49ers', nick: '49ers' },
  SEA: { id: '26', name: 'Seattle Seahawks', nick: 'Seahawks' },
  TB: { id: '27', name: 'Tampa Bay Buccaneers', nick: 'Buccaneers' },
  TEN: { id: '10', name: 'Tennessee Titans', nick: 'Titans' },
  WSH: { id: '28', name: 'Washington Commanders', nick: 'Commanders' },
  WAS: { id: '28', name: 'Washington Commanders', nick: 'Commanders' }
};

function normAbbr(a) {
  a = String(a || '').toUpperCase();
  if (a === 'WAS' || a === 'WSH') return 'WSH';
  if (a === 'LA') return 'LAR';
  return a;
}

function teamName(abbr) {
  const t = NFL_TEAMS[normAbbr(abbr)] || NFL_TEAMS[abbr];
  return t ? t.name : (abbr || 'Opponent');
}

function teamNick(abbr) {
  const t = NFL_TEAMS[normAbbr(abbr)] || NFL_TEAMS[abbr];
  return t ? t.nick : (abbr || 'Opp');
}

function teamId(abbr) {
  const t = NFL_TEAMS[normAbbr(abbr)] || NFL_TEAMS[abbr];
  return t ? t.id : '';
}

function focusAbbr() {
  const w = (typeof getCurrentWatch === 'function') ? getCurrentWatch() : null;
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.focusAbbr && LIVE_GAME.eventId && w && String(LIVE_GAME.eventId) === String(w.eventId)) {
    return LIVE_GAME.focusAbbr;
  }
  if (w && w.focusAbbr) return w.focusAbbr;
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.eventId && LIVE_GAME.focusAbbr) return LIVE_GAME.focusAbbr;
  return 'HOU';
}

function isFocusPossession(state) {
  state = state || (typeof LIVE_GAME !== 'undefined' ? LIVE_GAME : null);
  if (!state) return false;
  const f = state.focusAbbr || focusAbbr();
  const p = String(state.possession || '').toUpperCase();
  if (p === 'OUR' || p === f) return true;
  if (p === 'HOU' && f === 'HOU') return true;
  const fid = String(state.focusId || teamId(f) || '');
  if (fid && p === fid) return true;
  return false;
}

/* ---------- Watch list / current game ---------- */
function loadWatchList() {
  try {
    const raw = localStorage.getItem(WATCH_LIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveWatchList(list) {
  try { localStorage.setItem(WATCH_LIST_KEY, JSON.stringify(list.slice(0, 24))); } catch (e) {}
}

function getCurrentWatch() {
  try {
    const raw = localStorage.getItem(CURRENT_WATCH_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw);
    return w && w.eventId ? w : null;
  } catch (e) { return null; }
}

function saveCurrentWatch(w) {
  try {
    if (!w) localStorage.removeItem(CURRENT_WATCH_KEY);
    else localStorage.setItem(CURRENT_WATCH_KEY, JSON.stringify(w));
  } catch (e) {}
}

function isWatched(eventId) {
  const id = String(eventId || '');
  return loadWatchList().some(function (g) { return String(g.eventId) === id; });
}

function upsertWatch(game, focus) {
  if (!game || !game.eventId) return;
  const list = loadWatchList().filter(function (g) { return String(g.eventId) !== String(game.eventId); });
  const row = watchRowFromGame(game, focus);
  list.unshift(row);
  saveWatchList(list);
  return row;
}

function removeWatch(eventId) {
  saveWatchList(loadWatchList().filter(function (g) { return String(g.eventId) !== String(eventId); }));
  const cur = getCurrentWatch();
  if (cur && String(cur.eventId) === String(eventId)) saveCurrentWatch(null);
}

function toggleWatch(game) {
  if (!game || !game.eventId) return false;
  if (isWatched(game.eventId)) {
    removeWatch(game.eventId);
    return false;
  }
  upsertWatch(game, defaultFocusForGame(game));
  return true;
}

function defaultFocusForGame(g) {
  if (!g) return 'HOU';
  if (g.hasHou || g.homeAbbr === 'HOU' || g.awayAbbr === 'HOU' || g.oppAbbr && g.home === true) {
    if (g.homeAbbr === 'HOU' || g.awayAbbr === 'HOU') return 'HOU';
    if (g.oppAbbr && (g.home === true || g.home === false) && !g.homeAbbr) return 'HOU';
  }
  return g.homeAbbr || 'HOU';
}

function watchRowFromGame(game, focus) {
  return {
    eventId: String(game.eventId),
    awayAbbr: game.awayAbbr,
    homeAbbr: game.homeAbbr,
    awayName: game.awayName || teamName(game.awayAbbr),
    homeName: game.homeName || teamName(game.homeAbbr),
    date: game.date,
    kickMs: game.kickMs || 0,
    tv: game.tv || '',
    focusAbbr: focus || defaultFocusForGame(game),
    hasHou: !!(game.hasHou || game.homeAbbr === 'HOU' || game.awayAbbr === 'HOU'),
    week: game.week,
    shortName: game.shortName || ((game.awayAbbr || '') + ' @ ' + (game.homeAbbr || ''))
  };
}

function setCurrentGame(game, focus) {
  if (!game || !game.eventId) return;
  const f = focus || defaultFocusForGame(game);
  const row = upsertWatch(game, f);
  saveCurrentWatch(row);
  if (typeof LIVE_GAME !== 'undefined') {
    LIVE_GAME.eventId = row.eventId;
    LIVE_GAME.focusAbbr = f;
    LIVE_GAME.focusId = teamId(f);
    LIVE_GAME.status = LIVE_GAME.status || 'pre';
  }
}

/* ---------- Scout memory (per team, every watched game) ---------- */
function emptyScout() { return { _schema: 1, teams: {} }; }

function loadScoutMemory() {
  try {
    const raw = localStorage.getItem(SCOUT_MEMORY_KEY);
    if (!raw) return emptyScout();
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return emptyScout();
    if (!p.teams || typeof p.teams !== 'object') p.teams = {};
    return p;
  } catch (e) { return emptyScout(); }
}

function saveScoutMemory(mem) {
  try { localStorage.setItem(SCOUT_MEMORY_KEY, JSON.stringify(mem)); } catch (e) {}
}

function scoutTeam(abbr) {
  const mem = loadScoutMemory();
  const k = normAbbr(abbr);
  if (!mem.teams[k]) mem.teams[k] = { games: [], weights: {}, nextPlay: { correct: 0, total: 0 } };
  if (!Array.isArray(mem.teams[k].games)) mem.teams[k].games = [];
  if (!mem.teams[k].weights) mem.teams[k].weights = {};
  if (!mem.teams[k].nextPlay) mem.teams[k].nextPlay = { correct: 0, total: 0 };
  return { mem: mem, rec: mem.teams[k], key: k };
}

function recordScoutGame(abbr, entry) {
  if (!abbr || !entry) return;
  const s = scoutTeam(abbr);
  s.rec.games = s.rec.games.filter(function (g) {
    return !(g.eventId && entry.eventId && String(g.eventId) === String(entry.eventId));
  });
  s.rec.games.push(entry);
  if (s.rec.games.length > 24) s.rec.games = s.rec.games.slice(-24);
  if (entry.phase === 'reg' || entry.phase === 'post') {
    (entry.fallen || []).forEach(function (id) {
      s.rec.weights[id] = Math.min(1.25, (s.rec.weights[id] || 1) + 0.03);
    });
    (entry.broken || []).forEach(function (id) {
      s.rec.weights[id] = Math.max(0.85, (s.rec.weights[id] || 1) - 0.02);
    });
  }
  saveScoutMemory(s.mem);
}

function recordScoutNextPlay(abbr, correct) {
  if (!abbr || abbr === 'HOU') return; // HOU official book is separate
  const s = scoutTeam(abbr);
  s.rec.nextPlay.total += 1;
  if (correct) s.rec.nextPlay.correct += 1;
  saveScoutMemory(s.mem);
}

function scoutCount(abbr) {
  const s = scoutTeam(abbr);
  return (s.rec.games || []).length;
}

function scoutRecap(abbr) {
  const s = scoutTeam(abbr);
  const games = s.rec.games || [];
  if (!games.length) return null;
  let w = 0, l = 0, expFor = 0, expAg = 0, to = 0;
  games.forEach(function (g) {
    if (g.result === 'W') w++;
    else if (g.result === 'L') l++;
    expFor += g.explosivesFor || 0;
    expAg += g.explosivesAgainst || 0;
    to += g.turnovers || 0;
  });
  const last = games[games.length - 1];
  const np = s.rec.nextPlay || { correct: 0, total: 0 };
  return { n: games.length, w: w, l: l, expFor: expFor, expAg: expAg, turnovers: to, last: last, nextPlay: np };
}

/* ---------- Week slate (scoreboard, NOT live PBP) ---------- */
let WEEK_SLATE = { week: 1, season: 2026, fetchedAt: 0, games: [], label: 'Week 1' };
let slatePollTimer = null;
let slateInflight = null;
let slateFailAt = 0;
let schedView = 'week';
try { schedView = localStorage.getItem(SCHED_VIEW_KEY) || 'week'; } catch (e) {}

function chicagoParts(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', weekday: '', monthDay: '', time: '', kickMs: 0 };
  const bits = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d); // YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).format(d);
  const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true
  }).format(d);
  return { date: bits, weekday: weekday, monthDay: monthDay, time: time, kickMs: d.getTime() };
}

function parseEspnEvent(ev) {
  const c = (ev.competitions && ev.competitions[0]) || {};
  const comps = c.competitors || [];
  let home = null, away = null;
  comps.forEach(function (t) {
    if (t.homeAway === 'home') home = t;
    else away = t;
  });
  if (!home && comps[0]) home = comps[0];
  if (!away && comps[1]) away = comps[1];
  const homeAbbr = normAbbr(mapEspnTeamAbbr(home));
  const awayAbbr = normAbbr(mapEspnTeamAbbr(away));
  const odds = (c.odds && c.odds[0]) || {};
  const broadcasts = c.broadcasts || [];
  let tv = '';
  if (broadcasts[0] && Array.isArray(broadcasts[0].names)) tv = broadcasts[0].names.join('/');
  else if (c.broadcast) tv = String(c.broadcast);
  const st = (ev.status && ev.status.type) || (c.status && c.status.type) || {};
  const stateName = st.state || '';
  const state = (st.name === 'STATUS_IN_PROGRESS' || st.name === 'STATUS_HALFTIME' || stateName === 'in')
    ? 'in'
    : (st.name === 'STATUS_FINAL' || stateName === 'post') ? 'final' : 'pre';
  const parts = chicagoParts(ev.date || c.date);
  const hasHou = homeAbbr === 'HOU' || awayAbbr === 'HOU';
  const week = (ev.week && ev.week.number) || WEEK_SLATE.week || 1;
  const venue = (c.venue && (c.venue.fullName || c.venue.displayName)) || '';
  let favorite = '—';
  if (odds.details) {
    const d = String(odds.details);
    const m = d.match(/^([A-Z]{2,3})\s/);
    if (m) favorite = normAbbr(m[1]);
  }
  const homeScore = parseInt(home && home.score, 10);
  const awayScore = parseInt(away && away.score, 10);
  return {
    eventId: String(ev.id),
    iso: ev.date || c.date,
    date: parts.date,
    weekday: parts.weekday,
    monthDay: parts.monthDay,
    timeLabel: parts.time,
    kickMs: parts.kickMs,
    homeAbbr: homeAbbr,
    awayAbbr: awayAbbr,
    homeName: (home && home.team && (home.team.displayName || home.team.name)) || teamName(homeAbbr),
    awayName: (away && away.team && (away.team.displayName || away.team.name)) || teamName(awayAbbr),
    homeId: String((home && home.team && home.team.id) || teamId(homeAbbr)),
    awayId: String((away && away.team && away.team.id) || teamId(awayAbbr)),
    homeScore: isNaN(homeScore) ? 0 : homeScore,
    awayScore: isNaN(awayScore) ? 0 : awayScore,
    tv: tv,
    venue: venue,
    line: odds.details || '',
    ou: odds.overUnder != null ? String(odds.overUnder) : '',
    spread: odds.spread,
    favorite: favorite,
    state: state,
    detail: st.shortDetail || st.detail || '',
    week: week,
    type: 'reg',
    hasHou: hasHou,
    shortName: ev.shortName || (awayAbbr + ' @ ' + homeAbbr),
    // Texans-compat fields for existing detail renderer
    home: hasHou ? homeAbbr === 'HOU' : true,
    oppAbbr: hasHou ? (homeAbbr === 'HOU' ? awayAbbr : homeAbbr) : awayAbbr,
    opp: hasHou ? (homeAbbr === 'HOU'
      ? ((away && away.team && away.team.displayName) || teamName(awayAbbr))
      : ((home && home.team && home.team.displayName) || teamName(homeAbbr)))
      : ((away && away.team && away.team.displayName) || teamName(awayAbbr)),
    time: null,
    note: venue && /melbourne|london|wembley|munich|mexico/i.test(venue) ? venue : '',
    result: state === 'final' ? formatNflResult(homeAbbr, homeScore, awayAbbr, awayScore, hasHou) : null
  };
}

function formatNflResult(homeAbbr, hs, awayAbbr, as, hasHou) {
  if (hs == null || as == null) return null;
  if (hasHou) {
    const hou = homeAbbr === 'HOU' ? hs : as;
    const opp = homeAbbr === 'HOU' ? as : hs;
    if (hou > opp) return 'W ' + hou + '-' + opp;
    if (hou < opp) return 'L ' + hou + '-' + opp;
    return 'T ' + hou + '-' + opp;
  }
  return (awayAbbr || 'AWY') + ' ' + as + '–' + hs + ' ' + (homeAbbr || 'HOM');
}

async function loadWeekSlate(force) {
  const now = Date.now();
  if (!force && WEEK_SLATE.games.length && (now - WEEK_SLATE.fetchedAt) < 55000) {
    return WEEK_SLATE;
  }
  if (slateInflight) return slateInflight;
  if (!force && slateFailAt && (now - slateFailAt) < 45000) {
    return WEEK_SLATE;
  }
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(WEEK_SLATE_KEY) || 'null');
      if (cached && Array.isArray(cached.games) && cached.games.length && (now - (cached.fetchedAt || 0)) < 10 * 60 * 1000) {
        WEEK_SLATE = cached;
        if (now - (cached.fetchedAt || 0) < 55000) return WEEK_SLATE;
      }
    } catch (e) {}
  }
  slateInflight = (async function loadSlateInner() {
    try {
      const res = await fetch(espnUrl('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=80'), espnFetchOpts());
      if (!res.ok) throw new Error('scoreboard ' + res.status);
      const data = await res.json();
      const week = (data.week && data.week.number) || 1;
      const year = (data.season && data.season.year) || new Date().getFullYear();
      const games = (data.events || []).map(parseEspnEvent).sort(function (a, b) { return a.kickMs - b.kickMs; });
      WEEK_SLATE = {
        week: week,
        season: year,
        fetchedAt: Date.now(),
        games: games,
        label: 'Week ' + week
      };
      slateFailAt = 0;
      try { localStorage.setItem(WEEK_SLATE_KEY, JSON.stringify(WEEK_SLATE)); } catch (e) {}
      return WEEK_SLATE;
    } catch (e) {
      slateFailAt = Date.now();
      if (WEEK_SLATE.games.length) return WEEK_SLATE;
      try {
        const cached = JSON.parse(localStorage.getItem(WEEK_SLATE_KEY) || 'null');
        if (cached && cached.games) { WEEK_SLATE = cached; return WEEK_SLATE; }
      } catch (e2) {}
      return WEEK_SLATE;
    } finally {
      slateInflight = null;
    }
  })();
  return slateInflight;
}

function startSlatePoll() {
  if (slatePollTimer) clearInterval(slatePollTimer);
  slatePollTimer = setInterval(async function () {
    if (typeof currentSection !== 'undefined' && currentSection !== 'schedule') return;
    try {
      await loadWeekSlate(true);
      if (currentSection === 'schedule' && schedView === 'week') renderSchedule();
    } catch (e) {}
  }, 70000);
}

function bootstrapCurrentGame() {
  if (getCurrentWatch()) return;
  const games = WEEK_SLATE.games || [];
  if (!games.length) return;
  const now = Date.now();
  const live = games.find(function (g) { return g.state === 'in'; });
  if (live) {
    setCurrentGame(live, defaultFocusForGame(live));
    return;
  }
  const soon = games.filter(function (g) {
    return g.state === 'pre' && g.kickMs >= now - 30 * 60 * 1000 && g.kickMs <= now + 8 * 3600 * 1000;
  }).sort(function (a, b) { return a.kickMs - b.kickMs; })[0];
  if (soon) setCurrentGame(soon, defaultFocusForGame(soon));
}

function gameByEventId(eventId) {
  const id = String(eventId || '');
  return (WEEK_SLATE.games || []).find(function (g) { return String(g.eventId) === id; })
    || loadWatchList().find(function (g) { return String(g.eventId) === id; })
    || null;
}

/* ---------- Insights from odds + scout ---------- */
function insightForLeagueGame(g) {
  if (!g) return GAME_INSIGHTS.DEFAULT;
  if (g.hasHou && GAME_INSIGHTS[g.oppAbbr]) return GAME_INSIGHTS[g.oppAbbr];
  const fav = g.favorite && g.favorite !== '—' ? g.favorite : '—';
  const favLabel = fav === 'HOU' ? 'Houston' : (fav === '—' ? '—' : fav);
  const recA = scoutRecap(g.awayAbbr);
  const recH = scoutRecap(g.homeAbbr);
  const keys = ['Protect the QB', 'Early-down success', 'No explosives the other way', 'Hidden yardage / ST'];
  if (g.line) keys.unshift('Market: ' + g.line + (g.ou ? ' · O/U ' + g.ou : ''));
  let note = g.awayName + ' at ' + g.homeName;
  if (g.venue) note += ' · ' + g.venue;
  if (recA) note += ' · You’ve watched ' + teamNick(g.awayAbbr) + ' ' + recA.n + '× (' + recA.w + '-' + recA.l + ').';
  if (recH) note += ' · You’ve watched ' + teamNick(g.homeAbbr) + ' ' + recH.n + '× (' + recH.w + '-' + recH.l + ').';
  if (!recA && !recH) note += ' · First watch deposits scouting memory for both clubs.';
  return {
    favorite: favLabel,
    line: g.line || 'Line posts closer to kickoff',
    ou: g.ou ? ('O/U ' + g.ou) : '—',
    note: note,
    keys: keys
  };
}

function genericDominosFor(focus, opp) {
  const fn = teamNick(focus);
  const on = teamNick(opp);
  const fp = (typeof SCHEME_FINGERPRINTS !== 'undefined' && SCHEME_FINGERPRINTS[normAbbr(opp)]) || null;
  const rec = (typeof scoutRecap === 'function') ? scoutRecap(opp) : null;
  const list = [
    { id: 'gen-protect', text: 'Protect the ' + fn + ' QB — limit free runners', category: 'offense', priority: 90, preGame: true, phase: 'full', why: 'Pocket is the foundation of the ' + fn + ' win path' },
    { id: 'gen-explosive', text: 'Prevent ' + on + ' explosive plays (≥20 yd)', category: 'defense', priority: 87, preGame: true, phase: 'full', why: 'Explosives collapse paths fast' },
    { id: 'gen-3rd', text: 'Win the 3rd-down battle vs the ' + on, category: 'offense', priority: 85, preGame: true, phase: 'full', why: 'Sustains scoring drives and forces punts' },
    { id: 'gen-run', text: 'Establish ' + fn + ' early-down run efficiency', category: 'offense', priority: 82, preGame: true, phase: 'full', why: 'Sets up play-action later' },
    { id: 'gen-takeaways', text: 'Create at least one takeaway vs ' + on, category: 'defense', priority: 80, preGame: true, phase: 'full', why: 'Short fields change scripts' },
    { id: 'gen-st', text: 'Win the hidden-yardage / ST battle', category: 'special', priority: 70, preGame: true, phase: 'full', why: 'Field position compounds' }
  ];
  if (fp) {
    if (fp.shotgun >= 0.62) {
      list.push({ id: 'gen-spread', text: 'Stay sound vs ' + on + ' shotgun / spread looks', category: 'defense', priority: 84, preGame: true, phase: 'full', why: 'Public fingerprint: shotgun-heavy offense' });
    }
    if (fp.playAction >= 0.16) {
      list.push({ id: 'gen-pa', text: 'Do not over-pursue ' + on + ' play-action', category: 'defense', priority: 81, preGame: true, phase: 'full', why: 'Play-action is a real part of their diet' });
    }
    if (fp.family === 'shanahan-zone') {
      list.push({ id: 'gen-zone', text: 'Set the edge vs ' + on + ' outside-zone / boot', category: 'defense', priority: 83, preGame: true, phase: 'full', why: 'Zone-family offenses win on the edge' });
    }
  }
  if (rec && rec.n >= 1 && rec.expAg) {
    list.push({ id: 'gen-scout-exp', text: 'You have seen ' + on + ' give up explosives — force one', category: 'defense', priority: 79, preGame: true, phase: 'full', why: 'From your scouting file on this club' });
  }
  return list.sort(function (a, b) { return b.priority - a.priority; }).slice(0, 6);
}

function seedsForMatchup(focus, opp) {
  if (focus === 'HOU') return (PRE_GAME_DOMINOS[opp] || PRE_GAME_DOMINOS.DEFAULT);
  return genericDominosFor(focus, opp);
}

function expandSchemeFingerprints() {
  if (typeof SCHEME_FINGERPRINTS === 'undefined') return;
  const extra = {
    NE: { shotgun: 0.68, playAction: 0.14, motion: 0.52, underCenter: 0.24, multiTE: 0.22, tempo: 0.24, family: 'spread-shotgun' },
    SEA: { shotgun: 0.58, playAction: 0.16, motion: 0.55, underCenter: 0.32, multiTE: 0.28, tempo: 0.22, family: 'balanced-explosive' },
    GB: { shotgun: 0.62, playAction: 0.15, motion: 0.50, underCenter: 0.28, multiTE: 0.26, tempo: 0.20, family: 'balanced-spread' },
    MIN: { shotgun: 0.66, playAction: 0.13, motion: 0.48, underCenter: 0.24, multiTE: 0.22, tempo: 0.22, family: 'spread-shotgun' },
    CHI: { shotgun: 0.55, playAction: 0.16, motion: 0.52, underCenter: 0.36, multiTE: 0.30, tempo: 0.20, family: 'balanced-spread' },
    NO: { shotgun: 0.60, playAction: 0.14, motion: 0.50, underCenter: 0.30, multiTE: 0.32, tempo: 0.18, family: 'multi-te' },
    TB: { shotgun: 0.64, playAction: 0.13, motion: 0.47, underCenter: 0.26, multiTE: 0.24, tempo: 0.20, family: 'spread-shotgun' },
    ATL: { shotgun: 0.52, playAction: 0.18, motion: 0.58, underCenter: 0.40, multiTE: 0.30, tempo: 0.22, family: 'shanahan-zone' },
    PIT: { shotgun: 0.58, playAction: 0.14, motion: 0.46, underCenter: 0.32, multiTE: 0.28, tempo: 0.18, family: 'balanced-spread' },
    NYJ: { shotgun: 0.63, playAction: 0.13, motion: 0.48, underCenter: 0.26, multiTE: 0.24, tempo: 0.20, family: 'spread-shotgun' },
    TEN: { shotgun: 0.50, playAction: 0.16, motion: 0.44, underCenter: 0.40, multiTE: 0.30, tempo: 0.18, family: 'balanced-spread' },
    IND: { shotgun: 0.60, playAction: 0.15, motion: 0.50, underCenter: 0.30, multiTE: 0.26, tempo: 0.22, family: 'balanced-spread' },
    CLE: { shotgun: 0.54, playAction: 0.15, motion: 0.46, underCenter: 0.36, multiTE: 0.32, tempo: 0.16, family: 'multi-te' },
    JAX: { shotgun: 0.64, playAction: 0.14, motion: 0.50, underCenter: 0.26, multiTE: 0.24, tempo: 0.22, family: 'spread-shotgun' },
    MIA: { shotgun: 0.72, playAction: 0.12, motion: 0.48, underCenter: 0.18, multiTE: 0.18, tempo: 0.32, family: 'spread-shotgun' },
    WSH: { shotgun: 0.62, playAction: 0.15, motion: 0.52, underCenter: 0.28, multiTE: 0.26, tempo: 0.22, family: 'balanced-spread' },
    ARI: { shotgun: 0.70, playAction: 0.14, motion: 0.54, underCenter: 0.20, multiTE: 0.22, tempo: 0.26, family: 'spread-shotgun' },
    DAL: { shotgun: 0.64, playAction: 0.14, motion: 0.50, underCenter: 0.26, multiTE: 0.24, tempo: 0.22, family: 'spread-shotgun' },
    NYG: { shotgun: 0.58, playAction: 0.14, motion: 0.48, underCenter: 0.32, multiTE: 0.28, tempo: 0.18, family: 'balanced-spread' },
    DEN: { shotgun: 0.60, playAction: 0.15, motion: 0.50, underCenter: 0.30, multiTE: 0.26, tempo: 0.20, family: 'balanced-spread' }
  };
  Object.keys(extra).forEach(function (k) {
    if (!SCHEME_FINGERPRINTS[k]) SCHEME_FINGERPRINTS[k] = extra[k];
  });
}

/* ---------- Live apply from ONE summary ---------- */
function eventFromSummary(summary, eventId) {
  const header = summary.header || {};
  const competitions = header.competitions || summary.competitions || [];
  const comp = competitions[0] || {};
  return {
    id: header.id || eventId,
    date: comp.date || header.date,
    season: header.season,
    week: header.week,
    status: comp.status || header.status,
    competitions: competitions
  };
}

function parseInjuriesFromSummary(summary, focus) {
  const rows = [];
  (summary.injuries || []).forEach(function (block) {
    const abbr = normAbbr((block.team && block.team.abbreviation) || '');
    const isFocus = abbr === normAbbr(focus);
    (block.injuries || []).slice(0, isFocus ? 8 : 6).forEach(function (inj) {
      const name = (inj.athlete && (inj.athlete.displayName || inj.athlete.fullName)) || 'Player';
      const pos = (inj.athlete && inj.athlete.position && inj.athlete.position.abbreviation) || '';
      rows.push({
        name: name,
        pos: pos,
        status: inj.status || '—',
        note: (isFocus ? teamNick(abbr) : teamNick(abbr)) + (inj.details || inj.longComment || inj.comment ? ' · ' + (inj.details || inj.longComment || inj.comment || '') : ''),
        team: abbr,
        focus: isFocus
      });
    });
  });
  rows.sort(function (a, b) { return (a.focus === b.focus) ? 0 : a.focus ? -1 : 1; });
  return rows;
}

function applySummaryToLiveGame(summary, eventId, focus) {
  const event = eventFromSummary(summary, eventId);
  const competition = (event.competitions && event.competitions[0]) || {};
  const statusName = (event.status && event.status.type && event.status.type.name) || '';
  const statusState = (event.status && event.status.type && event.status.type.state) || '';
  const isIn = statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME' || statusState === 'in';
  const isFinal = statusName === 'STATUS_FINAL' || statusState === 'post';
  const isPre = statusName === 'STATUS_SCHEDULED' || statusName === 'STATUS_PRE' || statusState === 'pre' || (!isIn && !isFinal);

  const competitors = competition.competitors || [];
  focus = normAbbr(focus);
  let ours = null, opp = null;
  competitors.forEach(function (c) {
    const abbr = normAbbr((c.team && c.team.abbreviation) || '');
    const id = String((c.team && c.team.id) || '');
    if (abbr === focus || id === teamId(focus)) ours = c;
    else opp = c;
  });
  if (!ours) {
    LIVE_GAME.active = false;
    return false;
  }
  const oppAbbr = opp ? normAbbr(mapEspnTeamAbbr(opp)) : 'OPP';

  LIVE_GAME.eventId = String(event.id || eventId);
  LIVE_GAME.focusAbbr = focus;
  LIVE_GAME.focusId = String((ours.team && ours.team.id) || teamId(focus));
  LIVE_GAME.ourAbbr = focus;
  LIVE_GAME.houScore = parseInt(ours.score, 10) || 0;
  LIVE_GAME.oppScore = opp ? (parseInt(opp.score, 10) || 0) : 0;
  LIVE_GAME.oppAbbr = oppAbbr;
  LIVE_GAME.oppName = opp && opp.team ? (opp.team.displayName || oppAbbr) : '';
  LIVE_GAME.home = ours.homeAway === 'home';
  LIVE_GAME.homeAbbr = LIVE_GAME.home ? focus : oppAbbr;
  LIVE_GAME.awayAbbr = LIVE_GAME.home ? oppAbbr : focus;
  LIVE_GAME.qtr = (event.status && event.status.period) || 1;
  LIVE_GAME.clockDisplay = (event.status && event.status.displayClock) || '';
  LIVE_GAME.clockSeconds = parseClockToSeconds(LIVE_GAME.clockDisplay);
  LIVE_GAME.detail = (event.status && event.status.type && event.status.type.detail) || '';
  LIVE_GAME.lastUpdated = Date.now();
  LIVE_GAME.seasonType = (event.season && event.season.type) || null;
  LIVE_GAME.phase = inferSeasonPhase(event, competition);
  LIVE_GAME.injuryRows = parseInjuriesFromSummary(summary, focus);
  LIVE_GAME.lastFive = summary.lastFiveGames || null;
  LIVE_GAME.predictor = summary.predictor || null;
  LIVE_GAME.gameInfo = summary.gameInfo || null;
  if (summary.gameInfo && summary.gameInfo.weather) LIVE_GAME.weather = summary.gameInfo.weather;

  const sit = situationFromEspn(summary, competition);
  LIVE_GAME.down = sit.down;
  LIVE_GAME.distance = sit.distance;
  LIVE_GAME.yardNum = sit.yardNum;
  LIVE_GAME.yardSide = sit.yardSide;
  LIVE_GAME.yardline = sit.yardline || LIVE_GAME.clockDisplay;
  LIVE_GAME.possession = sit.possession;
  LIVE_GAME.toGoal = sit.toGoal;
  LIVE_GAME.special = sit.special || '';
  LIVE_GAME.isRedZone = !!sit.isRedZone;
  if (sit.lastPlayText) LIVE_GAME.lastPlayText = sit.lastPlayText;

  if (isIn) {
    LIVE_GAME.active = true;
    LIVE_GAME.final = false;
    LIVE_GAME.status = 'in';
    LIVE_GAME.recentPlays = playsFromEspnSummary(summary);
    if (sit.lastPlayText) {
      const already = (LIVE_GAME.recentPlays || []).some(function (p) {
        return p && p.desc === sit.lastPlayText;
      });
      if (!already) {
        LIVE_GAME.recentPlays = [{
          qtr: LIVE_GAME.qtr,
          clock: LIVE_GAME.clockDisplay,
          team: LIVE_GAME.possession,
          desc: sit.lastPlayText,
          big: /touchdown|intercept|fumble|sack|field goal/i.test(sit.lastPlayText),
          td: /touchdown/i.test(sit.lastPlayText)
        }].concat(LIVE_GAME.recentPlays || []).slice(0, 12);
      }
    }
    return true;
  }
  if (isFinal) {
    LIVE_GAME.active = false;
    LIVE_GAME.final = true;
    LIVE_GAME.status = 'final';
    try {
      LIVE_GAME.recentPlays = playsFromEspnSummary(summary);
      const result = evaluateDominos(Object.assign({}, LIVE_GAME, { possession: LIVE_GAME.possession, focusAbbr: focus }));
      if (focus === 'HOU') recordDominosSeasonResult(LIVE_GAME.oppAbbr, result.allDominos);
      depositScoutFromFinal(LIVE_GAME, result);
    } catch (e) { /* ok */ }
    return true;
  }
  LIVE_GAME.active = false;
  LIVE_GAME.final = false;
  LIVE_GAME.status = isPre ? 'pre' : 'idle';
  return false;
}

function depositScoutFromFinal(state, result) {
  if (!state || !state.eventId) return;
  const focus = normAbbr(state.focusAbbr || 'HOU');
  const opp = normAbbr(state.oppAbbr || 'OPP');
  const signals = (result && result.signals) || extractPlaySignals(state.recentPlays || []);
  const ourScore = state.houScore || 0;
  const oppScore = state.oppScore || 0;
  const ourResult = ourScore > oppScore ? 'W' : ourScore < oppScore ? 'L' : 'T';
  const oppResult = ourScore > oppScore ? 'L' : ourScore < oppScore ? 'W' : 'T';
  const fallen = (result && result.allDominos) ? result.allDominos.filter(function (d) { return d.status === 'fallen'; }).map(function (d) { return d.id; }) : [];
  const broken = (result && result.allDominos) ? result.allDominos.filter(function (d) { return d.status === 'broken'; }).map(function (d) { return d.id; }) : [];
  const catFallen = {};
  ((result && result.allDominos) || []).forEach(function (d) {
    if (d.status === 'fallen') catFallen[d.category] = (catFallen[d.category] || 0) + 1;
    if (d.status === 'broken') catFallen['broke_' + d.category] = (catFallen['broke_' + d.category] || 0) + 1;
  });
  const base = {
    date: new Date().toISOString().slice(0, 10),
    eventId: String(state.eventId),
    phase: state.phase || currentScoringPhase(),
    explosivesFor: signals.houExplosive || 0,
    explosivesAgainst: signals.oppExplosive || 0,
    turnovers: signals.houTurnover || 0,
    sacksAllowed: signals.houSackAllowed || 0
  };
  recordScoutGame(focus, Object.assign({}, base, {
    opp: opp,
    weWereFocus: true,
    result: ourResult,
    ourScore: ourScore,
    oppScore: oppScore,
    fallen: fallen,
    broken: broken,
    categories: catFallen
  }));
  recordScoutGame(opp, Object.assign({}, base, {
    opp: focus,
    weWereFocus: false,
    result: oppResult,
    ourScore: oppScore,
    oppScore: ourScore,
    fallen: broken,
    broken: fallen,
    categories: {},
    explosivesFor: signals.oppExplosive || 0,
    explosivesAgainst: signals.houExplosive || 0,
    turnovers: signals.oppTurnover || 0
  }));
}

/* ---------- Schedule UI ---------- */
function bindSchedToggle() {
  const w = document.getElementById('schedViewWeek');
  const t = document.getElementById('schedViewTexans');
  if (w && !w.dataset.bound) {
    w.dataset.bound = '1';
    w.addEventListener('click', function () {
      schedView = 'week';
      try { localStorage.setItem(SCHED_VIEW_KEY, 'week'); } catch (e) {}
      renderSchedule();
    });
  }
  if (t && !t.dataset.bound) {
    t.dataset.bound = '1';
    t.addEventListener('click', function () {
      schedView = 'texans';
      try { localStorage.setItem(SCHED_VIEW_KEY, 'texans'); } catch (e) {}
      renderSchedule();
    });
  }
  if (w) w.classList.toggle('active', schedView === 'week');
  if (t) t.classList.toggle('active', schedView === 'texans');
  const title = document.getElementById('schedTitle');
  if (title) title.textContent = schedView === 'texans' ? '2026 Texans' : (WEEK_SLATE.label || 'This week');
  const hint = document.getElementById('schedHint');
  if (hint) {
    hint.textContent = schedView === 'texans'
      ? 'Houston’s full slate · tap a game for line, keys, Game Center.'
      : 'NFL week slate · star games to watch · live updates only run for the game on Game Center.';
  }
}

function starBtnHtml(eventId, watched) {
  return '<button type="button" class="star-btn' + (watched ? ' on' : '') + '" data-star="' + eventId + '" aria-label="' + (watched ? 'Unwatch' : 'Watch') + '">' + (watched ? '★' : '☆') + '</button>';
}

function renderWatchStripAt(el) {
  if (!el) return;
  const list = loadWatchList();
  const cur = getCurrentWatch();
  if (!list.length) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  el.style.display = '';
  el.innerHTML = list.map(function (g) {
    const id = String(g.eventId);
    const liveGame = gameByEventId(id);
    const st = liveGame ? liveGame.state : '';
    const on = cur && String(cur.eventId) === id;
    const label = (g.awayAbbr || '') + '@' + (g.homeAbbr || '');
    const pill = st === 'in' ? ' LIVE' : (st === 'final' ? ' Final' : '');
    return '<button type="button" class="watch-chip' + (on ? ' on' : '') + (st === 'in' ? ' live' : '') + '" data-watch="' + id + '">' + label + pill + '</button>';
  }).join('');
  el.querySelectorAll('[data-watch]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const g = gameByEventId(btn.getAttribute('data-watch')) || loadWatchList().find(function (x) { return String(x.eventId) === btn.getAttribute('data-watch'); });
      if (!g) return;
      const prev = getCurrentWatch();
      const focus = (prev && String(prev.eventId) === String(g.eventId) && prev.focusAbbr) ? prev.focusAbbr : defaultFocusForGame(g);
      setCurrentGame(g, focus);
      if (typeof showSection === 'function') showSection('game');
      refreshLiveGame().then(function () { renderGameCenter(); renderWatchStrips(); });
    });
  });
}

function renderWatchStrips() {
  renderWatchStripAt(document.getElementById('watchStrip'));
  renderWatchStripAt(document.getElementById('gameWatchBar'));
}

function renderFocusPicker(g, mountHtml) {
  if (!g) return '';
  const cur = getCurrentWatch();
  const focus = (cur && String(cur.eventId) === String(g.eventId) && cur.focusAbbr) ? cur.focusAbbr : defaultFocusForGame(g);
  const a = g.awayAbbr, h = g.homeAbbr;
  return '<div class="focus-row">' +
    '<span class="focus-label">Analyze as</span>' +
    '<button type="button" class="focus-pill' + (focus === a ? ' on' : '') + '" data-focus="' + a + '">' + a + '</button>' +
    '<button type="button" class="focus-pill' + (focus === h ? ' on' : '') + '" data-focus="' + h + '">' + h + '</button>' +
    '</div>';
}

function bindFocusPills(g) {
  document.querySelectorAll('[data-focus]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      const f = btn.getAttribute('data-focus');
      setCurrentGame(g, f);
      if (typeof LIVE_GAME !== 'undefined') {
        LIVE_GAME.focusAbbr = f;
        LIVE_GAME.focusId = teamId(f);
      }
      refreshLiveGame().then(function () {
        renderGameCenter();
        if (schedView === 'week' && selectedGame && selectedGame.eventId) renderLeagueDetail(g);
      });
    });
  });
}

function renderWeekSchedule() {
  const list = document.getElementById('scheduleList');
  if (!list) return;
  list.innerHTML = '';
  const games = WEEK_SLATE.games || [];
  if (!games.length) {
    if (slateInflight) {
      list.innerHTML = '<div class="empty">Loading this week’s NFL slate…</div>';
      return;
    }
    if (slateFailAt) {
      list.innerHTML = '<div class="empty">Couldn’t load this week’s slate.<br><button type="button" class="btn" id="slateRetryBtn" style="margin-top:10px">Retry</button></div>';
      const retry = document.getElementById('slateRetryBtn');
      if (retry) {
        retry.addEventListener('click', function () {
          slateFailAt = 0;
          list.innerHTML = '<div class="empty">Loading this week’s NFL slate…</div>';
          loadWeekSlate(true).then(function () {
            if (schedView === 'week') renderSchedule();
          });
        });
      }
      return;
    }
    list.innerHTML = '<div class="empty">Loading this week’s NFL slate…</div>';
    loadWeekSlate(true).then(function () {
      if (schedView === 'week') renderSchedule();
    });
    return;
  }
  const now = Date.now();
  const cur = getCurrentWatch();
  let lastDay = '';
  games.forEach(function (g) {
    const dayKey = g.date;
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      const hdr = document.createElement('div');
      hdr.className = 'sched-day-head';
      hdr.textContent = g.weekday + ' · ' + g.monthDay;
      list.appendChild(hdr);
    }
    const isNext = g.state === 'pre' && g.kickMs > now - 5 * 60 * 1000 &&
      !games.some(function (x) { return x.state === 'pre' && x.kickMs < g.kickMs && x.kickMs > now - 5 * 60 * 1000; });
    const isCurrent = cur && String(cur.eventId) === String(g.eventId);
    const row = document.createElement('div');
    row.className = 'game-row' + (isNext ? ' is-next' : '') + (g.hasHou ? ' is-hou' : '') + (isCurrent ? ' is-current' : '');
    let rightHtml = '';
    if (g.state === 'in') {
      rightHtml = '<div class="game-result w">LIVE</div>';
    } else if (g.state === 'final') {
      rightHtml = '<div class="game-result">' + (g.awayScore + '–' + g.homeScore) + '</div>';
    } else {
      rightHtml = '<div class="game-week">Wk ' + g.week + '</div>';
    }
    const houBadge = g.hasHou ? ' <span class="hou-badge">HOU</span>' : '';
    const liveBadge = g.state === 'in' ? ' <span class="next-badge">LIVE</span>' : (isNext ? ' <span class="next-badge">NEXT</span>' : '');
    const watched = isWatched(g.eventId);
    row.innerHTML =
      starBtnHtml(g.eventId, watched) +
      '<div class="game-date"><span class="day">' + g.weekday + '</span>' + g.monthDay + '</div>' +
      '<div class="game-info">' +
        '<div class="game-opp">' + g.awayAbbr + ' @ ' + g.homeAbbr + houBadge + liveBadge + '</div>' +
        '<div class="game-meta">' + (g.timeLabel || '') + ' CT' + (g.tv ? ' · <span class="tv-badge' + (g.tv.indexOf('Prime') >= 0 ? ' prime' : '') + '">' + g.tv + '</span>' : '') + (g.line ? ' · ' + g.line : '') + (g.note ? ' · ' + g.note : '') + '</div>' +
      '</div>' + rightHtml;
    row.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('[data-star]')) return;
      selectedGame = g;
      renderLeagueDetail(g);
    });
    const star = row.querySelector('[data-star]');
    if (star) {
      star.addEventListener('click', function (ev) {
        ev.stopPropagation();
        toggleWatch(g);
        renderSchedule();
        renderWatchStrips();
      });
    }
    list.appendChild(row);
  });
}

function renderLeagueDetail(g) {
  const list = document.getElementById('scheduleList');
  if (!list || !g) return;
  const insight = insightForLeagueGame(g);
  const favLabel = insight.favorite === 'HOU' ? 'Houston favored' :
    insight.favorite === '—' ? 'Line TBD' :
    insight.favorite + ' favored';
  const kickLabel = (g.weekday || '') + ' ' + (g.monthDay || g.date || '') + (g.timeLabel ? ' · ' + g.timeLabel + ' CT' : '');
  list.innerHTML =
    '<button type="button" class="section-back" id="schedBackBtn">← Back to schedule</button>' +
    '<div class="game-detail-card">' +
      '<div class="game-detail-title">' + (g.awayName || g.awayAbbr) + ' at ' + (g.homeName || g.homeAbbr) + '</div>' +
      '<div class="small" style="margin:4px 0 10px">Week ' + g.week + (g.note ? ' · ' + g.note : '') + ' · ' + kickLabel + (g.tv ? ' · ' + g.tv : '') + (g.venue ? ' · ' + g.venue : '') + '</div>' +
      renderFocusPicker(g) +
      '<div class="insight-grid">' +
        '<div class="insight-chip"><span class="insight-label">Market</span><strong>' + favLabel + '</strong></div>' +
        '<div class="insight-chip"><span class="insight-label">Line</span><strong>' + (insight.line || '—') + '</strong></div>' +
        '<div class="insight-chip"><span class="insight-label">Total</span><strong>' + (insight.ou || '—') + '</strong></div>' +
      '</div>' +
      '<p class="small" style="margin:10px 0 8px">' + insight.note + '</p>' +
      '<div class="small" style="font-weight:700;margin-bottom:4px">What to watch</div>' +
      '<ul class="opp-bullets">' + (insight.keys || []).map(function (k) { return '<li>' + k + '</li>'; }).join('') + '</ul>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
        '<button type="button" class="btn" id="schedOpenPlays">Open Plays</button>' +
        '<button type="button" class="btn secondary" id="schedOpenGame">Game Center</button>' +
        '<button type="button" class="btn secondary" id="schedStarBtn">' + (isWatched(g.eventId) ? '★ Watching' : '☆ Watch') + '</button>' +
      '</div>' +
      '<p class="tend-note" style="margin-top:10px">Lines are public consensus for discussion only — not betting advice. Live play-by-play runs only for the game on Game Center, so the feed stays fast.</p>' +
    '</div>';
  const back = document.getElementById('schedBackBtn');
  if (back) back.addEventListener('click', function () { selectedGame = null; renderSchedule(); });
  bindFocusPills(g);
  const open = function () {
    const cur = getCurrentWatch();
    const focus = (cur && String(cur.eventId) === String(g.eventId) && cur.focusAbbr) ? cur.focusAbbr : defaultFocusForGame(g);
    setCurrentGame(g, focus);
    renderWatchStrips();
  };
  const plays = document.getElementById('schedOpenPlays');
  if (plays) plays.addEventListener('click', function () {
    open();
    showSection('pbp');
    refreshLiveGame().then(function () { renderPBP(); });
  });
  const gc = document.getElementById('schedOpenGame');
  if (gc) gc.addEventListener('click', function () {
    open();
    showSection('game');
    refreshLiveGame().then(function () { renderGameCenter(); });
  });
  const star = document.getElementById('schedStarBtn');
  if (star) star.addEventListener('click', function () {
    toggleWatch(g);
    renderLeagueDetail(g);
    renderWatchStrips();
  });
}

function renderTexansSchedule() {
  const list = document.getElementById('scheduleList');
  if (!list) return;
  list.innerHTML = '';
  const now = new Date();
  let nextIdx = -1;
  SCHEDULE_2026.forEach(function (g, idx) {
    if (nextIdx >= 0 || g.type === 'bye' || !g.date || g.result) return;
    const d = new Date(g.date + 'T' + (g.time || '12:00') + ':00');
    if (d > now) nextIdx = idx;
  });
  SCHEDULE_2026.forEach(function (g, idx) {
    if (g.type === 'bye') {
      const row = document.createElement('div');
      row.className = 'game-row';
      row.innerHTML = '<div class="game-date"><span class="day">BYE</span></div><div class="game-info"><div class="game-opp">Week 8 — Bye Week</div></div><div class="game-week">Wk 8</div>';
      list.appendChild(row);
      return;
    }
    const d = new Date(g.date + 'T' + (g.time || '12:00') + ':00');
    const isNext = idx === nextIdx;
    const row = document.createElement('div');
    row.className = 'game-row' + (isNext ? ' is-next' : '');
    let rightHtml = '';
    if (g.result) {
      const cls = g.result.startsWith('W') ? 'w' : g.result.startsWith('L') ? 'l' : 't';
      rightHtml = '<div class="game-result ' + cls + '">' + g.result + '</div>';
    } else {
      const weekLabel = g.type === 'pre' ? g.week : ('Wk ' + g.week);
      rightHtml = '<div class="game-week">' + weekLabel + '</div>';
    }
    row.innerHTML =
      '<div class="game-date"><span class="day">' + d.toLocaleDateString('en-US', { weekday: 'short' }) + '</span>' +
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div>' +
      '<div class="game-info"><div class="game-opp">' + (g.home ? 'vs' : '@') + ' ' + g.opp + (isNext ? ' <span class="next-badge">NEXT</span>' : '') + '</div>' +
      '<div class="game-meta">' + (g.type === 'pre' ? 'Preseason' : 'Week ' + g.week) + (g.note ? ' · ' + g.note : '') + ' · ' + (g.time ? formatTime(g.time) : '') +
      (g.tv ? ' · <span class="tv-badge' + (g.tv === 'Prime Video' ? ' prime' : '') + '">' + g.tv + '</span>' : '') + '</div></div>' + rightHtml;
    row.addEventListener('click', function () {
      selectedGame = g;
      // If this Texans game exists on the week slate, attach eventId so Game Center can follow it
      const hit = (WEEK_SLATE.games || []).find(function (x) {
        return x.hasHou && x.date === g.date;
      });
      if (hit) selectedGame = Object.assign({}, g, hit, { opp: g.opp, oppAbbr: g.oppAbbr, home: g.home, type: g.type, week: g.week });
      renderScheduleDetail(selectedGame);
    });
    list.appendChild(row);
  });
}


function isDockWindow() {
  try {
    return new URLSearchParams(location.search).get('dock') === '1';
  } catch (e) {
    return false;
  }
}

/**
 * Official book = regular season + postseason only.
 * Preseason and unknown-phase live games stay in the lab book.
 */
function isOfficialScoringPhase(phase) {
  return phase === 'reg' || phase === 'post';
}

function inferSeasonPhase(event, competition) {
  const raw = (event && event.season && event.season.type)
    || (competition && competition.season && competition.season.type)
    || (event && event.seasonType)
    || null;
  const n = raw != null ? parseInt(raw, 10) : NaN;
  if (n === 1) return 'pre';
  if (n === 2) return 'reg';
  if (n === 3) return 'post';

  const iso = (event && event.date) ? String(event.date).slice(0, 10) : '';
  if (iso && typeof SCHEDULE_2026 !== 'undefined') {
    const hit = SCHEDULE_2026.find((g) => g.date === iso);
    if (hit && hit.type === 'pre') return 'pre';
    if (hit && hit.type === 'reg') return 'reg';
    if (hit && hit.type === 'post') return 'post';
  }
  // August NFL games without a schedule hit are almost always preseason
  if (iso && /-08-/.test(iso)) return 'pre';
  return 'unk';
}

function currentScoringPhase() {
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.phase && LIVE_GAME.phase !== 'unk') {
    return LIVE_GAME.phase;
  }
  const next = typeof getNextGame === 'function' ? getNextGame() : null;
  if (next && next.type === 'pre') return 'pre';
  if (next && next.type === 'reg') return 'reg';
  return (LIVE_GAME && LIVE_GAME.phase) || 'unk';
}

function loadDominosMemory() {
  try {
    const raw = localStorage.getItem(DOMINOS_MEMORY_KEY);
    if (!raw) return { games: [], weights: {} };
    const parsed = JSON.parse(raw);
    return {
      games: Array.isArray(parsed.games) ? parsed.games : [],
      labGames: Array.isArray(parsed.labGames) ? parsed.labGames : [],
      weights: parsed.weights && typeof parsed.weights === 'object' ? parsed.weights : {}
    };
  } catch (e) {
    return { games: [], weights: {} };
  }
}

function saveDominosMemory(mem) {
  try {
    localStorage.setItem(DOMINOS_MEMORY_KEY, JSON.stringify(mem));
  } catch (e) { /* ignore quota */ }
}

/**
 * After a final game, record which dominos fell/broke so future priority improves.
 */
function recordDominosSeasonResult(oppAbbr, allDominos) {
  if (!allDominos || !allDominos.length) return;
  const mem = loadDominosMemory();
  const phase = currentScoringPhase();
  const fallen = allDominos.filter((d) => d.status === 'fallen').map((d) => d.id);
  const broken = allDominos.filter((d) => d.status === 'broken').map((d) => d.id);
  const catFallen = {};
  allDominos.forEach((d) => {
    if (d.status === 'fallen') catFallen[d.category] = (catFallen[d.category] || 0) + 1;
    if (d.status === 'broken') catFallen['broke_' + d.category] = (catFallen['broke_' + d.category] || 0) + 1;
  });
  const entry = {
    date: new Date().toISOString().slice(0, 10),
    opp: oppAbbr,
    phase: phase,
    fallen: fallen,
    broken: broken,
    categories: catFallen
  };
  if (!isOfficialScoringPhase(phase)) {
    // Lab only — reviewable, never moves official priority weights
    mem.labGames = (mem.labGames || []).filter((g) => !(g.date === entry.date && g.opp === entry.opp));
    mem.labGames.push(entry);
    if (mem.labGames.length > 20) mem.labGames = mem.labGames.slice(-20);
    saveDominosMemory(mem);
    return;
  }
  // avoid duplicate same-day same-opp
  mem.games = (mem.games || []).filter((g) => !(g.date === entry.date && g.opp === entry.opp));
  mem.games.push(entry);
  if (mem.games.length > 40) mem.games = mem.games.slice(-40);

  // Soft weight bumps: categories that fell often in wins get slight priority lift later
  const w = mem.weights || {};
  fallen.forEach((id) => { w[id] = Math.min(1.25, (w[id] || 1) + 0.03); });
  broken.forEach((id) => { w[id] = Math.max(0.85, (w[id] || 1) - 0.02); });
  mem.weights = w;
  saveDominosMemory(mem);
}

function memoryWeightFor(id) {
  const f = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  if (f !== 'HOU' && typeof scoutTeam === 'function') {
    try {
      const s = scoutTeam(f);
      return (s.rec.weights && s.rec.weights[id]) || 1;
    } catch (e) { return 1; }
  }
  const mem = loadDominosMemory();
  return (mem.weights && mem.weights[id]) || 1;
}

function parseClockToSeconds(display) {
  if (!display || typeof display !== 'string') return 0;
  if (/half|end|final/i.test(display)) return 0;
  const parts = display.trim().split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  return 0;
}

function mapEspnTeamAbbr(team) {
  if (!team) return 'OPP';
  return (team.team && (team.team.abbreviation || team.team.shortDisplayName)) || team.abbreviation || 'OPP';
}

/**
 * Pull plays from ESPN summary drives into our recentPlays shape (newest first).
 */
function playsFromEspnSummary(summary) {
  const plays = [];
  const drives = (summary && summary.drives && summary.drives.previous) || [];
  drives.forEach((drive) => {
    const teamAbbr = (drive.team && drive.team.abbreviation) || '';
    (drive.plays || []).forEach((p) => {
      const text = p.text || p.description || '';
      if (!text) return;
      const period = (p.period && p.period.number) || p.period || '';
      const clock = (p.clock && p.clock.displayValue) || '';
      const big = /touchdown|intercept|fumble|sack|for (2[0-9]|[3-9][0-9]) yards/i.test(text);
      plays.push({
        qtr: period,
        clock: clock,
        team: teamAbbr === 'HOU' || teamAbbr === 'HOU' ? 'HOU' : teamAbbr,
        desc: text,
        big: big,
        td: /touchdown/i.test(text)
      });
    });
  });
  // also check current drive
  const cur = summary && summary.drives && summary.drives.current;
  if (cur && cur.plays) {
    const teamAbbr = (cur.team && cur.team.abbreviation) || '';
    cur.plays.forEach((p) => {
      const text = p.text || p.description || '';
      if (!text) return;
      const period = (p.period && p.period.number) || '';
      const clock = (p.clock && p.clock.displayValue) || '';
      const big = /touchdown|intercept|fumble|sack|for (2[0-9]|[3-9][0-9]) yards/i.test(text);
      plays.push({
        qtr: period,
        clock: clock,
        team: teamAbbr === 'HOU' ? 'HOU' : teamAbbr,
        desc: text,
        big: big,
        td: /touchdown/i.test(text)
      });
    });
  }
  return plays.slice(-12).reverse();
}

function abbrFromTeamId(id) {
  const sid = String(id || '');
  if (!sid) return '';
  if (sid === String((typeof LIVE_GAME !== 'undefined' && LIVE_GAME.focusId) || ESPN_TEAM_ID)) {
    return (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.focusAbbr) || (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  }
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.oppAbbr && sid !== String(LIVE_GAME.focusId || '')) {
    // only safe when we know this id is the other competitor
    if (sid === String(LIVE_GAME.focusId)) return LIVE_GAME.focusAbbr;
  }
  if (typeof teamId === 'function') {
    const f = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.focusAbbr) || 'HOU';
    if (sid === String(teamId(f))) return f;
    if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.oppAbbr && sid === String(teamId(LIVE_GAME.oppAbbr))) return LIVE_GAME.oppAbbr;
  }
  return '';
}

function parseSituationText(text) {
  const out = {};
  if (!text || typeof text !== 'string') return out;
  const t = text.replace(/\s+/g, ' ').trim();
  const downM = t.match(/\b(1st|2nd|3rd|4th|1|2|3|4)\s*&\s*(\d+|Goal|Inches|inch)\b/i);
  if (downM) {
    const raw = downM[1].toLowerCase();
    out.down = raw.indexOf('1') === 0 ? 1 : raw.indexOf('2') === 0 ? 2 : raw.indexOf('3') === 0 ? 3 : 4;
    const distRaw = downM[2].toLowerCase();
    if (distRaw === 'goal') out.distance = 0;
    else if (distRaw.indexOf('inch') === 0) out.distance = 1;
    else out.distance = parseInt(distRaw, 10) || 10;
  }
  const atM = t.match(/\bat\s+([A-Z]{2,3})\s+(\d{1,2})\b/);
  if (atM) {
    out.spotAbbr = atM[1].toUpperCase();
    out.yardNum = parseInt(atM[2], 10);
  } else {
    const possM = t.match(/\b([A-Z]{2,3})\s+(\d{1,2})\b/);
    if (possM && !/Q[1-4]|OT/.test(possM[1])) {
      out.spotAbbr = possM[1].toUpperCase();
      out.yardNum = parseInt(possM[2], 10);
    }
  }
  return out;
}

function resolvePossession(sit, summary, prev) {
  const focus = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.focusAbbr) || (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  const opp = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.oppAbbr) || 'OPP';

  function fromPossField(poss) {
    if (poss == null || poss === '') return '';
    if (typeof poss === 'object') {
      const ab = String(poss.abbreviation || (poss.team && poss.team.abbreviation) || '').toUpperCase();
      if (ab) return ab;
      const id = String(poss.id || (poss.team && poss.team.id) || '');
      return abbrFromTeamId(id);
    }
    const s = String(poss).toUpperCase();
    if (/^[A-Z]{2,3}$/.test(s)) return s;
    return abbrFromTeamId(s);
  }

  let p = fromPossField(sit && sit.possession);
  if (!p && sit && sit.team) p = fromPossField(sit.team);
  if (!p && sit && sit.lastPlay) {
    p = fromPossField(sit.lastPlay.team) || fromPossField(sit.lastPlay.end && sit.lastPlay.end.team);
  }
  const cur = summary && summary.drives && summary.drives.current;
  if (!p && cur && cur.team) p = fromPossField(cur.team);
  if (p === 'OUR') p = focus;
  if (p && p !== focus && p !== opp && p !== 'HOU') {
    // map unknown abbr via id already attempted
  }
  if (!p && prev && prev.possession) p = prev.possession;
  if (!p) p = focus;
  return String(p).toUpperCase();
}

function yardsToGoalForOffense(possession, spotAbbr, yardNum) {
  const n = Number(yardNum);
  if (!Number.isFinite(n)) return null;
  const spot = String(spotAbbr || '').toUpperCase();
  const poss = String(possession || '').toUpperCase();
  if (!spot) {
    // treat yardNum as already yards-to-goal if 1-50 without side is unsafe
    return null;
  }
  if (spot === poss) return 100 - n; // ball on own 25 → 75 to goal
  return n; // ball on opponent 25 → 25 to goal
}

function situationFromEspn(summary, competition) {
  const sit = (competition && competition.situation)
    || (summary && summary.header && summary.header.competitions && summary.header.competitions[0] && summary.header.competitions[0].situation)
    || (summary && summary.situation)
    || null;
  const prev = (typeof LIVE_GAME !== 'undefined') ? LIVE_GAME : null;

  let down = null;
  let distance = null;
  let yardNum = null;
  let yardSide = null;
  let yardline = '—';
  let possession = null;
  let spotAbbr = null;
  let lastPlayText = '';
  let special = '';

  const texts = [];
  if (sit) {
    if (sit.downDistanceText) texts.push(sit.downDistanceText);
    if (sit.shortDownDistanceText) texts.push(sit.shortDownDistanceText);
    if (sit.possessionText) texts.push(sit.possessionText);
    if (sit.lastPlay && (sit.lastPlay.text || sit.lastPlay.description)) {
      lastPlayText = sit.lastPlay.text || sit.lastPlay.description;
      texts.push(lastPlayText);
    }
  }

  texts.forEach(function (tx) {
    const parsed = parseSituationText(tx);
    if (parsed.down != null) down = parsed.down;
    if (parsed.distance != null) distance = parsed.distance;
    if (parsed.yardNum != null) yardNum = parsed.yardNum;
    if (parsed.spotAbbr) spotAbbr = parsed.spotAbbr;
  });

  if (sit) {
    if (sit.down != null && sit.down !== '' && Number(sit.down) > 0) down = Number(sit.down);
    if (sit.distance != null && sit.distance !== '') {
      const d = Number(sit.distance);
      if (Number.isFinite(d)) distance = d;
    }
    if (sit.possessionText) yardline = sit.possessionText;
    else if (sit.downDistanceText) yardline = sit.downDistanceText;
  }

  possession = resolvePossession(sit, summary, prev);

  if (sit && typeof sit.yardLine === 'number') {
    const yl = sit.yardLine;
    if (yl >= 0 && yl <= 100 && yardNum == null) {
      // ESPN yardLine is usually 0–100 from the HOME goal line.
      const homeAbbr = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.homeAbbr) || '';
      const awayAbbr = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.awayAbbr) || '';
      if (yl === 50) {
        yardNum = 50;
        spotAbbr = spotAbbr || possession;
      } else if (yl < 50) {
        yardNum = yl === 0 ? 0 : yl;
        spotAbbr = spotAbbr || homeAbbr;
      } else {
        yardNum = 100 - yl;
        spotAbbr = spotAbbr || awayAbbr;
      }
    }
  }

  if (spotAbbr && yardNum != null) {
    yardline = spotAbbr + ' ' + yardNum;
    yardSide = (spotAbbr === String(possession).toUpperCase()) ? 'own' : 'opp';
  } else if (yardNum != null && possession) {
    yardSide = yardSide || 'own';
  }

  if (sit && sit.down === 0) {
    down = 0;
    const lp = (lastPlayText || '').toLowerCase();
    if (/kickoff/.test(lp)) special = 'Kickoff';
    else if (/extra point|pat /.test(lp)) special = 'PAT';
    else if (/two-point|2-pt/.test(lp)) special = '2-pt';
    else if (/field goal/.test(lp)) special = 'FG play';
    else if (/punt/.test(lp)) special = 'Punt';
    else special = 'Between plays';
  }

  if (down == null && prev && prev.down != null) down = prev.down;
  if (distance == null && prev && prev.distance != null) distance = prev.distance;
  if (yardNum == null && prev && prev.yardNum != null) yardNum = prev.yardNum;
  if (!yardSide && prev && prev.yardSide) yardSide = prev.yardSide;
  if ((!yardline || yardline === '—') && prev && prev.yardline) yardline = prev.yardline;
  if (!possession && prev && prev.possession) possession = prev.possession;

  if (down == null) down = 1;
  if (distance == null) distance = 10;
  if (yardNum == null) yardNum = 50;
  if (!yardSide) yardSide = 'own';
  if (!possession) possession = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');

  const toGoal = yardsToGoalForOffense(possession, spotAbbr, yardNum);

  return {
    down: down,
    distance: distance,
    yardNum: yardNum,
    yardSide: yardSide,
    yardline: yardline,
    possession: possession,
    toGoal: toGoal,
    special: special,
    lastPlayText: lastPlayText,
    isRedZone: !!(sit && sit.isRedZone) || (toGoal != null && toGoal <= 20)
  };
}

/**
 * Live path never searches the league for Houston.
 * Discovery is the week slate + the user's current watch eventId.
 */
async function fetchTexansEvent() {
  return null;
}

async function fetchEventSummary(eventId) {
  const url = espnUrl('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=' + eventId);
  const res = await fetch(url, espnFetchOpts());
  if (!res.ok) throw new Error('summary ' + res.status);
  return res.json();
}

/**
 * Refresh LIVE_GAME from network. ONE request: summary?event={current}.
 */
async function refreshLiveGame() {
  try {
    const watch = typeof getCurrentWatch === 'function' ? getCurrentWatch() : null;
    if (!watch || !watch.eventId) {
      LIVE_GAME.active = false;
      LIVE_GAME.final = false;
      if (!LIVE_GAME.eventId) LIVE_GAME.status = 'idle';
      return false;
    }
    const eventId = String(watch.eventId);
    const focus = watch.focusAbbr || (typeof defaultFocusForGame === 'function' ? defaultFocusForGame(watch) : 'HOU');
    const summary = await fetchEventSummary(eventId);
    if (typeof applySummaryToLiveGame === 'function') {
      return applySummaryToLiveGame(summary, eventId, focus);
    }
    return false;
  } catch (e) {
    return false;
  }
}

function stopLiveGamePoll() {
  if (livePollTimer) {
    clearTimeout(livePollTimer);
    clearInterval(livePollTimer);
    livePollTimer = null;
  }
}

function livePollDelayMs() {
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden' && !isDockWindow();
  const live = typeof LIVE_GAME !== 'undefined' && LIVE_GAME.active;
  if (hidden && !live) return 120000;
  if (hidden) return LIVE_POLL_MS_HIDDEN;
  if (!live) return 60000; // idle / upcoming — no need to hammer ESPN
  return LIVE_POLL_MS;
}

function startLiveGamePoll() {
  stopLiveGamePoll();
  const tick = async () => {
    try {
      await refreshLiveGame();
      if (typeof currentSection === 'undefined' || currentSection === 'game' || isDockWindow()) {
        try { renderGameCenter(); } catch (e) { /* keep UI stable */ }
      }
    } catch (e) { /* keep polling */ }
    stopLiveGamePoll();
    livePollTimer = setTimeout(tick, livePollDelayMs());
  };
  livePollTimer = setTimeout(tick, 250);
}

async function refreshLiveGameIfVisible() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !isDockWindow()) return;
  try {
    await refreshLiveGame();
    if (typeof currentSection === 'undefined' || currentSection === 'game' || isDockWindow()) {
      renderGameCenter();
    }
  } catch (e) { /* ok */ }
}

function bindLiveKeepAlive() {
  if (bindLiveKeepAlive._bound) return;
  bindLiveKeepAlive._bound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshLiveGameIfVisible();
      startLiveGamePoll();
    }
  });
  window.addEventListener('focus', () => { refreshLiveGameIfVisible(); });
  window.addEventListener('pageshow', () => { refreshLiveGameIfVisible(); });
}

function openGameDock() {
  const url = new URL(location.href);
  url.searchParams.set('dock', '1');
  const features = 'popup=yes,width=420,height=780,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
  const w = window.open(url.toString(), 'texansHqDock', features);
  if (!w) {
    alert('Pop-out was blocked. Allow pop-ups for this site, then try again — or snap this window beside Prime / NFL+.');
    return;
  }
  try { w.focus(); } catch (e) {}
}


/* ============================================================
   NEXT PLAY LEAN  (v14.9)
   Situation-based lean for father-son arguments.
   Seeded with 2025 Texans tendencies + NFL situational norms.
   Preseason is NEVER used for accuracy tracking or model updates.
   Regular season + postseason only.
   ============================================================ */
const NEXT_PLAY_STORAGE_KEY = 'texans-hq-nextplay-log-v1';

/* 2025 Texans baseline (public-style aggregates)
   Overall ~56-59% pass. Clear short-yardage run lean.
   Pass lean on 2nd & medium. ~23% play-action. Low RPO. */
const BASE_TENDENCIES = {
  overallPass: 0.57,
  shortYardageRun: 0.72,      // 1-3 yards (especially 2nd/3rd & short)
  mediumPass: 0.64,           // 4-6 yards
  longPass: 0.71,             // 7-10
  veryLongPass: 0.78,         // 11+
  redZonePass: 0.55,
  goalLineRun: 0.68,          // inside opponent 5
  leadingRun: 0.08,           // extra run lean when leading late
  trailingPass: 0.12,         // extra pass lean when trailing
  playActionBase: 0.23,
  screenBase: 0.05
};

function emptyNextPlayLog() {
  return {
    predictions: [],
    accuracy: { correct: 0, total: 0, bySituation: {} },
    lab: { correct: 0, total: 0 }
  };
}

function loadNextPlayLog() {
  try {
    const raw = localStorage.getItem(NEXT_PLAY_STORAGE_KEY);
    if (!raw) return emptyNextPlayLog();
    const parsed = JSON.parse(raw);
    if (!parsed.accuracy) parsed.accuracy = { correct: 0, total: 0, bySituation: {} };
    if (!parsed.lab) parsed.lab = { correct: 0, total: 0 };
    if (!Array.isArray(parsed.predictions)) parsed.predictions = [];
    return parsed;
  } catch (e) {
    return emptyNextPlayLog();
  }
}

function saveNextPlayLog(log) {
  try {
    localStorage.setItem(NEXT_PLAY_STORAGE_KEY, JSON.stringify(log));
  } catch (e) { /* ignore quota */ }
}

/** Zero the official book only. Preseason lab rows stay. */
function resetOfficialNextPlayBook() {
  const log = loadNextPlayLog();
  const kept = (log.predictions || []).filter((p) => !isOfficialScoringPhase(p.phase));
  log.predictions = kept;
  log.accuracy = { correct: 0, total: 0, bySituation: {} };
  if (!log.lab) log.lab = { correct: 0, total: 0 };
  saveNextPlayLog(log);
  return log;
}

function resetLabNextPlayBook() {
  const log = loadNextPlayLog();
  const kept = (log.predictions || []).filter((p) => isOfficialScoringPhase(p.phase));
  log.predictions = kept;
  log.lab = { correct: 0, total: 0 };
  saveNextPlayLog(log);
  return log;
}

/** Core predictor — returns ranked leans with reasons */
function predictNextPlay(sit) {
  // sit: { down, distance, yardNum, yardSide, scoreDiff, qtr, clockSeconds, isPreseason }
  const down = sit.down || 1;
  const dist = sit.distance || 10;
  const yardNum = sit.yardNum || 50;
  const side = sit.yardSide || 'own'; // 'own' or 'opp'
  const scoreDiff = sit.scoreDiff || 0; // HOU - OPP
  const qtr = sit.qtr || 1;
  const clock = sit.clockSeconds || 900;
  const isRedZone = side === 'opp' && yardNum <= 20;
  const isGoalLine = side === 'opp' && yardNum <= 5;
  const isLate = (qtr === 4 && clock < 300) || (qtr === 2 && clock < 120);
  const isTwoMin = (qtr === 2 || qtr === 4) && clock <= 120;

  // Distance buckets
  let distBucket = 'long';
  if (dist <= 3) distBucket = 'short';
  else if (dist <= 6) distBucket = 'medium';
  else if (dist <= 10) distBucket = 'long';
  else distBucket = 'veryLong';

  // Base pass probability from Texans 2025 + situation
  let passP = BASE_TENDENCIES.overallPass;
  if (distBucket === 'short') passP = 1 - BASE_TENDENCIES.shortYardageRun;
  else if (distBucket === 'medium') passP = BASE_TENDENCIES.mediumPass;
  else if (distBucket === 'long') passP = BASE_TENDENCIES.longPass;
  else passP = BASE_TENDENCIES.veryLongPass;

  // Field position adjustments
  if (isGoalLine) passP = 1 - BASE_TENDENCIES.goalLineRun;
  else if (isRedZone) passP = BASE_TENDENCIES.redZonePass;

  // Game script
  if (scoreDiff > 7 && isLate) passP -= BASE_TENDENCIES.leadingRun;
  if (scoreDiff < -7) passP += BASE_TENDENCIES.trailingPass;
  if (isTwoMin && scoreDiff <= 0) passP = Math.min(0.92, passP + 0.15);

  // Down-specific Texans flavor (from 2025 notes)
  if (down === 2 && distBucket === 'medium') passP += 0.08; // they loved 2nd & medium pass
  if (down === 2 && distBucket === 'short') passP -= 0.10;
  if (down === 3 && distBucket === 'short') passP -= 0.09;

  passP = Math.max(0.12, Math.min(0.92, passP));
  const runP = 1 - passP;

  // Sub-types
  const leans = [];

  // Run options
  if (runP > 0.18) {
    if (distBucket === 'short' || isGoalLine) {
      leans.push({ type: 'Run', detail: 'Inside / short-yardage', pct: Math.round(runP * 0.72 * 100), reason: 'Texans lean heavy run on short yardage & goal line (2025 pattern)' });
      leans.push({ type: 'Run', detail: 'Outside zone / edge', pct: Math.round(runP * 0.28 * 100), reason: 'Secondary option when defense packs the box' });
    } else {
      leans.push({ type: 'Run', detail: 'Between the tackles', pct: Math.round(runP * 0.55 * 100), reason: 'Early-down balance + Montgomery power' });
      leans.push({ type: 'Run', detail: 'Outside / stretch', pct: Math.round(runP * 0.30 * 100), reason: 'Stretch the edge or set up play-action' });
      if (runP > 0.35) leans.push({ type: 'Run', detail: 'Draw / delayed', pct: Math.round(runP * 0.15 * 100), reason: 'Change-up vs aggressive fronts' });
    }
  }

  // Pass options
  if (passP > 0.18) {
    const paRate = isRedZone || distBucket === 'short' ? 0.12 : BASE_TENDENCIES.playActionBase;
    const screenRate = distBucket === 'long' || distBucket === 'veryLong' ? 0.08 : BASE_TENDENCIES.screenBase;

    if (distBucket === 'short' || isGoalLine) {
      leans.push({ type: 'Pass', detail: 'Short / quick (slant, flat, TE)', pct: Math.round(passP * 0.55 * 100), reason: 'High-percentage to move the chains' });
      leans.push({ type: 'Pass', detail: 'Play-action boot / TE seam', pct: Math.round(passP * 0.25 * 100), reason: 'Sell the run then hit the soft spot' });
      leans.push({ type: 'Pass', detail: 'Fade / corner (goal-line)', pct: Math.round(passP * 0.20 * 100), reason: 'Contested catch opportunities for Collins / Hutchinson' });
    } else if (distBucket === 'medium') {
      leans.push({ type: 'Pass', detail: 'Intermediate (cross, dig, out)', pct: Math.round(passP * 0.45 * 100), reason: 'Texans 2025 strength on 2nd & medium' });
      leans.push({ type: 'Pass', detail: 'Play-action', pct: Math.round(passP * paRate * 100), reason: 'PA rate ~23% overall; higher value here' });
      leans.push({ type: 'Pass', detail: 'Short / quick game', pct: Math.round(passP * 0.25 * 100), reason: 'Rhythm throws to Schultz or backs' });
      if (passP > 0.55) leans.push({ type: 'Pass', detail: 'Deep shot (go, post)', pct: Math.round(passP * 0.12 * 100), reason: 'Vertical threat keeps defense honest' });
    } else {
      leans.push({ type: 'Pass', detail: 'Intermediate / intermediate-deep', pct: Math.round(passP * 0.40 * 100), reason: 'Standard conversion range' });
      leans.push({ type: 'Pass', detail: 'Deep vertical', pct: Math.round(passP * 0.28 * 100), reason: 'Collins / Hutchinson / Noel vertical ability' });
      leans.push({ type: 'Pass', detail: 'Screen / swing', pct: Math.round(passP * screenRate * 100), reason: 'Ease pressure or create YAC' });
      leans.push({ type: 'Pass', detail: 'Play-action deep', pct: Math.round(passP * 0.18 * 100), reason: 'Sell run, attack soft coverage' });
    }
  }

  // Normalize top leans to roughly 100% for display clarity
  leans.sort((a, b) => b.pct - a.pct);
  const top = leans.slice(0, 4).filter(l => l.pct >= 8);
  const sum = top.reduce((s, l) => s + l.pct, 0) || 1;
  top.forEach(l => { l.pct = Math.round((l.pct / sum) * 100); });

  // Primary lean label
  const primary = top[0] || { type: 'Pass', detail: 'Balanced', pct: 50, reason: 'Default' };
  const primaryLabel = primary.type === 'Run' ? `Run lean (${primary.pct}%)` : `Pass lean (${primary.pct}%)`;

  return {
    primaryLabel,
    primaryType: primary.type,
    leans: top,
    situationSummary: `${ordSuffix(down)} & ${dist} · ${side === 'opp' ? 'Opp' : 'Own'} ${yardNum}`,
    isPreseason: !!sit.isPreseason,
    meta: { passP: Math.round(passP * 100), runP: Math.round(runP * 100), distBucket, isRedZone, isGoalLine, isLate }
  };
}

/* ---------- Automatic accuracy capture ---------- */
let _pendingPrediction = null; // { fingerprint, pred, ts }
let _lastSeenPlayKey = null;

function situationFingerprint(sit) {
  return `${sit.down}|${sit.distance}|${sit.yardSide}|${sit.yardNum}|${sit.qtr}`;
}

/** Classify a play description as 'Run' or 'Pass' (simple, robust keywords) */
function classifyPlayType(desc) {
  if (!desc || typeof desc !== 'string') return null;
  const d = desc.toLowerCase();
  // Pass indicators first (more specific)
  if (/\b(pass|passes|passed|complete|incomplete|sack|scrambles?|thrown|throwing|intercepted|int\b|deep|slant|out\b|dig\b|post\b|fade|screen pass)\b/.test(d)) {
    return 'Pass';
  }
  if (/\b(rush|rushes|rushed|run|runs|running|carry|carries|up the middle|left tackle|right tackle|left end|right end|draw|zone)\b/.test(d)) {
    return 'Run';
  }
  // Fallback heuristics
  if (d.includes(' to the ') && (d.includes('yard') || d.includes('yd'))) {
    // often "X rush ... for Y yards to the ..."
    if (d.includes('pass')) return 'Pass';
    return 'Run';
  }
  return null;
}

/** Call when a new actual play is known. Auto-scores the pending lean if one exists. */
function resolvePendingPrediction(actualPlayDesc, phase) {
  if (!_pendingPrediction) return;
  const actualType = classifyPlayType(actualPlayDesc);
  if (!actualType) return; // can't classify → leave pending

  const pred = _pendingPrediction.pred;
  const primaryType = pred.primaryType; // 'Run' or 'Pass'
  const correct = primaryType === actualType;
  const usePhase = phase || currentScoringPhase();

  const log = loadNextPlayLog();
  const entry = {
    ts: _pendingPrediction.ts,
    situation: pred.situationSummary,
    primary: pred.primaryLabel,
    primaryType,
    leans: pred.leans.map(l => `${l.type}: ${l.detail} (${l.pct}%)`),
    meta: pred.meta,
    actual: actualType,
    actualDesc: (actualPlayDesc || '').slice(0, 120),
    correct,
    phase: usePhase
  };
  log.predictions.unshift(entry);
  if (log.predictions.length > 300) log.predictions.length = 300;

  const focusNow = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  if (focusNow !== 'HOU') {
    if (typeof recordScoutNextPlay === 'function') recordScoutNextPlay(focusNow, correct);
  } else if (isOfficialScoringPhase(usePhase)) {
    log.accuracy.total += 1;
    if (correct) log.accuracy.correct += 1;
  } else {
    // Preseason / unknown / explicit lab — visible for Thursday testing, never official
    log.lab.total += 1;
    if (correct) log.lab.correct += 1;
  }
  saveNextPlayLog(log);
  _pendingPrediction = null;
}

/** Watch recent plays / situation and auto-resolve + re-predict (LIVE_GAME only) */
function autoTrackNextPlay() {
  if (typeof LIVE_GAME === 'undefined' || !LIVE_GAME.active) return;

  const plays = LIVE_GAME.recentPlays || [];
  if (plays.length > 0) {
    const latest = plays[0];
    const playKey = (latest.qtr || '') + '|' + (latest.clock || '') + '|' + (latest.desc || '');
    if (_lastSeenPlayKey && playKey !== _lastSeenPlayKey) {
      const fTrack = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
      const playTeam = (typeof normAbbr === 'function' ? normAbbr(latest.team) : latest.team);
      if (playTeam === (typeof normAbbr === 'function' ? normAbbr(fTrack) : fTrack)) {
        if (fTrack === 'HOU') resolvePendingPrediction(latest.desc, currentScoringPhase());
        else {
          resolvePendingPrediction(latest.desc, currentScoringPhase());
        }
      }
    }
    _lastSeenPlayKey = playKey;
  }

  if (typeof isFocusPossession === 'function' ? isFocusPossession(LIVE_GAME) : LIVE_GAME.possession === 'HOU') {
    const sit = {
      down: LIVE_GAME.down,
      distance: LIVE_GAME.distance,
      yardNum: LIVE_GAME.yardNum,
      yardSide: LIVE_GAME.yardSide,
      scoreDiff: (LIVE_GAME.houScore || 0) - (LIVE_GAME.oppScore || 0),
      qtr: LIVE_GAME.qtr,
      clockSeconds: LIVE_GAME.clockSeconds,
      isPreseason: currentScoringPhase() === 'pre'
    };
    const fp = situationFingerprint(sit);
    if (!_pendingPrediction || _pendingPrediction.fingerprint !== fp) {
      const pred = predictNextPlay(sit);
      _pendingPrediction = { fingerprint: fp, pred: pred, ts: Date.now() };
    }
  }
}

function renderNextPlayLean() {
  const card = $('#nextPlayCard');
  const content = $('#nextPlayContent');
  const accEl = $('#nextPlayAccuracy');
  if (!card || !content) return;

  // Always run the auto-tracker first so accuracy stays current
  autoTrackNextPlay();

  const src = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.active) ? LIVE_GAME : null;
  if (!src || (typeof isFocusPossession === 'function' ? !isFocusPossession(src) : src.possession !== 'HOU')) {
    const fb = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
    content.innerHTML = `<div class="empty">Available when ${fb} has the ball in a live game.</div>`;
    if (accEl) accEl.style.display = 'none';
    return;
  }

  const scoreDiff = (src.houScore || 0) - (src.oppScore || 0);
  const phase = currentScoringPhase();
  const pred = predictNextPlay({
    down: src.down,
    distance: src.distance,
    yardNum: src.yardNum,
    yardSide: src.yardSide,
    scoreDiff,
    qtr: src.qtr,
    clockSeconds: src.clockSeconds,
    isPreseason: phase === 'pre'
  });

  // Keep pending in sync with what is displayed
  const fp = situationFingerprint({
    down: src.down, distance: src.distance,
    yardNum: src.yardNum, yardSide: src.yardSide, qtr: src.qtr
  });
  _pendingPrediction = { fingerprint: fp, pred, ts: Date.now() };

  let html = `
    <div class="nextplay-primary">${pred.primaryLabel}</div>
    <div class="small" style="margin:2px 0 10px">${pred.situationSummary} · Pass base ${pred.meta.passP}% / Run ${pred.meta.runP}%</div>
    <div class="nextplay-leans">
  `;
  pred.leans.forEach((l, i) => {
    const barColor = l.type === 'Run' ? 'var(--navy)' : 'var(--danger)';
    html += `
      <div class="nextplay-row">
        <div class="nextplay-label"><strong>${i + 1}. ${l.type}</strong> — ${l.detail}</div>
        <div class="nextplay-bar-track"><div class="nextplay-bar-fill" style="width:${l.pct}%; background:${barColor}"></div></div>
        <div class="nextplay-pct">${l.pct}%</div>
        <div class="nextplay-reason small">${l.reason}</div>
      </div>
    `;
  });
  html += `</div>
    <p class="tend-note" style="margin-top:10px">Transparent lean based on 2025 Texans situational rates + current down/distance/field/score/clock. Not a guarantee — for argument purposes only.</p>
    <p class="small" style="margin-top:6px; opacity:0.9">${phase === 'pre' ? 'Preseason lab is scoring this game. Official regular-season book stays untouched.' : 'Accuracy is captured automatically when the next play is known. Preseason never counts in the official book.'}</p>
    <div style="margin-top:8px">
      <button type="button" class="btn secondary" id="btnViewAccuracy" style="padding:6px 12px; font-size:0.85rem">View accuracy log</button>
    </div>
  `;
  content.innerHTML = html;

  // Accuracy summary
  const log = loadNextPlayLog();
  if (accEl) {
    accEl.style.display = '';
    const lab = log.lab || { correct: 0, total: 0 };
    const off = log.accuracy || { correct: 0, total: 0 };
    const labPct = lab.total ? Math.round((lab.correct / lab.total) * 100) + '%' : '—';
    const offPct = off.total ? Math.round((off.correct / off.total) * 100) + '%' : '—';
    accEl.innerHTML = `Lab (preseason): <strong>${labPct}</strong> (${lab.correct}/${lab.total}) · Official book: <strong>${offPct}</strong> (${off.correct}/${off.total})`;
  }

  const viewBtn = $('#btnViewAccuracy');
  if (viewBtn) {
    viewBtn.onclick = () => {
      const log = loadNextPlayLog();
      const lab = log.lab || { correct: 0, total: 0 };
      let msg = `Automatic accuracy log (local only)\n\n`;
      msg += `Official book (reg + post): ${log.accuracy.correct} / ${log.accuracy.total}\n`;
      msg += `Lab (preseason / test): ${lab.correct} / ${lab.total}\n\n`;
      if (log.predictions.length === 0) {
        msg += `No predictions scored yet.`;
      } else {
        msg += `Recent scored leans:\n`;
        log.predictions.slice(0, 12).forEach((p, i) => {
          const mark = p.correct === true ? '✓' : (p.correct === false ? '✗' : '?');
          const ph = p.phase ? ' [' + p.phase + ']' : '';
          msg += `${i + 1}. ${mark}${ph} ${p.situation} → ${p.primary} (actual: ${p.actual || '?'})\n`;
        });
      }
      msg += `\nPreseason is lab-only and never moves the official book.`;
      alert(msg);
    };
  }
}

/* ============================================================
   DOMINOS TO WIN  (v15.6)
   Causal path model — re-evaluated after every play.
   Live glance (≤20s): top remaining dominos + derived Key Insight.
   Pre-game: matchup-seeded must-achieve set (phase-aware for preseason).
   Resolution: play text marks fallen / broken when available.
   Historical calibration improves priority weighting.
   ============================================================ */

/**
 * Domino shape:
 * {
 *   id, text, status: 'live'|'fallen'|'broken'|'pending',
 *   priority, category, preGame,
 *   phase?: 'starter'|'depth'|'full',  // preseason evaluation windows
 *   why?: string,                      // short rationale for scan depth
 *   unit?, player?, playType?, note?
 * }
 */

const CAT_LABEL = {
  offense: 'OFF',
  defense: 'DEF',
  special: 'ST',
  player: 'PLY',
  momentum: 'MOM',
  coaching: 'COA',
  context: 'CTX'
};

/** Pre-game matchup seeds — LAC is first preseason priority */
const PRE_GAME_DOMINOS = {
  BUF: [
    { id: 'buf-protect', text: 'Keep Stroud clean vs Bills edge pressure', category: 'offense', priority: 92, preGame: true, phase: 'full', why: 'Buffalo wins with free runners' },
    { id: 'buf-explosive-d', text: 'Limit Bills explosive pass plays', category: 'defense', priority: 90, preGame: true, phase: 'full', why: 'One shot can flip AFC scripts' },
    { id: 'buf-rz', text: 'Finish red-zone drives (Bills strength)', category: 'offense', priority: 88, preGame: true, phase: 'full', why: 'Points at a premium vs this D' },
    { id: 'buf-3rd', text: 'Win 3rd-down battle both ways', category: 'offense', priority: 85, preGame: true, phase: 'full', why: 'Sustains drives / forces punts' },
    { id: 'buf-st', text: 'No special-teams points allowed', category: 'special', priority: 78, preGame: true, phase: 'full', why: 'Hidden points decide tight games' }
  ],
  LAC: [
    { id: 'lac-protect', text: 'Stroud stays clean in the starter window', category: 'offense', priority: 94, preGame: true, phase: 'starter', why: 'First real live pressure of 2026' },
    { id: 'lac-ol', text: 'OL calls and fits hold vs Chargers front', category: 'offense', priority: 91, preGame: true, phase: 'starter', why: 'Teller/Rutledge live communication test' },
    { id: 'lac-edge', text: 'Anderson + Clowney win early downs', category: 'defense', priority: 88, preGame: true, phase: 'starter', why: 'Edge rotation is a camp focus' },
    { id: 'lac-higgins', text: 'Higgins earns separation in live reps', category: 'player', priority: 86, preGame: true, phase: 'starter', why: 'Year-2 chemistry under real speed' },
    { id: 'lac-ball', text: 'No turnovers in the starter window', category: 'offense', priority: 84, preGame: true, phase: 'starter', why: 'Evaluation over box score' },
    { id: 'lac-st', text: 'ST coverage and tackle stay clean', category: 'special', priority: 82, preGame: true, phase: 'full', why: 'Preseason truth often lives here' },
    { id: 'lac-depth', text: 'Depth units play assignment football', category: 'offense', priority: 78, preGame: true, phase: 'depth', why: 'After starters sit, this is the game' },
    { id: 'lac-mills', text: 'Mills operates without major negatives', category: 'player', priority: 74, preGame: true, phase: 'depth', why: 'Backup evaluation window' }
  ],
  DEFAULT: [
    { id: 'def-protect', text: 'Protect Stroud — limit free runners', category: 'offense', priority: 90, preGame: true, phase: 'full', why: 'Foundation of every win path' },
    { id: 'def-explosive', text: 'Prevent opponent explosive plays (≥20 yd)', category: 'defense', priority: 87, preGame: true, phase: 'full', why: 'Explosives collapse paths fast' },
    { id: 'def-3rd', text: 'Convert 3rd downs at or above season rate', category: 'offense', priority: 85, preGame: true, phase: 'full', why: 'Sustains scoring drives' },
    { id: 'def-run', text: 'Establish early-down run efficiency', category: 'offense', priority: 82, preGame: true, phase: 'full', why: 'Sets up play-action later' },
    { id: 'def-takeaways', text: 'Create at least one takeaway', category: 'defense', priority: 80, preGame: true, phase: 'full', why: 'Short fields change scripts' },
    { id: 'def-st', text: 'Win the hidden-yardage / ST battle', category: 'special', priority: 70, preGame: true, phase: 'full', why: 'Field position compounds' }
  ]
};

const HISTORICAL_WEIGHTS = {
  protectQB: 1.15,
  thirdDown: 1.12,
  redZoneFinish: 1.18,
  noExplosivesAgainst: 1.14,
  earlyDownSuccess: 1.10,
  takeaway: 1.08
};

/**
 * Parse recent play descriptions into path signals.
 * Used to mark dominos fallen / broken when play text exists.
 */
function extractPlaySignals(plays) {
  const signals = {
    houSackAllowed: 0,
    houTd: 0,
    houTurnover: 0,
    houFirstDown: 0,
    houExplosive: 0,
    oppExplosive: 0,
    oppTd: 0,
    oppTurnover: 0,
    houPressure: 0,
    bigHou: 0,
    bigOpp: 0
  };
  (plays || []).forEach((p) => {
    const d = (p.desc || '').toLowerCase();
    const team = p.team || '';
    const f = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
    const isHou = (typeof normAbbr === 'function' ? normAbbr(team) : team) === (typeof normAbbr === 'function' ? normAbbr(f) : f);
    if (p.big && isHou) signals.bigHou++;
    if (p.big && !isHou) signals.bigOpp++;
    if (isHou) {
      if (/sack/.test(d)) signals.houSackAllowed++;
      if (/touchdown|\. td\b/.test(d) || p.td) signals.houTd++;
      if (/intercept|fumble|lost/.test(d)) signals.houTurnover++;
      if (/first down/.test(d)) signals.houFirstDown++;
      if (/for (2[0-9]|[3-9][0-9]) yards/.test(d)) signals.houExplosive++;
    } else {
      if (/touchdown|\. td\b/.test(d) || p.td) signals.oppTd++;
      if (/intercept|fumble recovered by hou|fumble.*hou/.test(d)) signals.oppTurnover++;
      if (/for (2[0-9]|[3-9][0-9]) yards/.test(d)) signals.oppExplosive++;
      if (/sack/.test(d)) signals.houPressure++;
    }
  });
  return signals;
}

/**
 * Apply signals to a domino list — real fallen / broken resolution.
 */
function resolveDominoStatuses(dominos, signals, state) {
  const possHou = typeof isFocusPossession === 'function' ? isFocusPossession(state) : state.possession === 'HOU';
  return dominos.map((d) => {
    let status = d.status || 'live';
    const t = (d.text || '').toLowerCase();
    const id = d.id || '';

    // Protection / clean pocket
    if (/protect|clean|free runner|sack/.test(t) || /protect|clean/.test(id)) {
      if (signals.houSackAllowed >= 2) status = 'broken';
      else if (signals.houSackAllowed === 0 && signals.houFirstDown >= 2) status = 'fallen';
    }
    // No turnovers
    if (/turnover|ball security|no turnover/.test(t)) {
      if (signals.houTurnover >= 1) status = 'broken';
      else if ((state.qtr || 1) >= 2 && signals.houTurnover === 0 && signals.houFirstDown >= 1) status = 'fallen';
    }
    // Explosive prevention
    if (/explosive|limit.*pass play/.test(t)) {
      if (signals.oppExplosive >= 1 || signals.bigOpp >= 2) status = 'broken';
      else if (signals.oppExplosive === 0 && (signals.bigOpp === 0)) {
        if ((state.qtr || 1) >= 2) status = 'fallen';
      }
    }
    // Edge pressure / Anderson
    if (/anderson|clowney|edge|pressure|generate/.test(t) && d.category === 'defense') {
      if (signals.houPressure >= 1) status = 'fallen';
    }
    // Takeaway
    if (/takeaway/.test(t)) {
      if (signals.oppTurnover >= 1) status = 'fallen';
    }
    // Red-zone / finish / TD
    if (/red-zone|red zone|finish.*td|touchdown/.test(t)) {
      if (signals.houTd >= 1) status = 'fallen';
    }
    // ST — if opponent scored via special teams language (rare in short list)
    if (d.category === 'special' && /st |special|tackle|coverage/.test(t)) {
      // stays live until explicit ST score language; no false broken
    }
    // Situational 3rd — only live while on that down; not resolved from history here
    if (id === 'sit-3rd' || id === 'sit-2nd-long' || id === 'sit-rz-finish' || id === 'sit-def-stop') {
      status = 'live';
    }
    return { ...d, status };
  });
}

/**
 * Core evaluator — pure function of current game state.
 * Returns { dominos, allDominos, keyInsight, statusSummary, phaseNote }
 */

/* ============================================================
   DUAL-PATH / POSSESSION MIRROR  (v15.9)
   When HOU has the ball → Texans path + HOU lean
   When OPP has the ball → same rigor for opponent tendency +
   Houston defensive path + scheme-similarity priors
   ============================================================ */

/** Compact offense fingerprints (public-style season tendencies).
 *  Values are illustrative anchors for similarity — live plays still win. */
const SCHEME_FINGERPRINTS = {
  HOU: { shotgun: 0.61, playAction: 0.15, motion: 0.54, underCenter: 0.35, multiTE: 0.28, tempo: 0.25, family: 'balanced-spread' },
  LAC: { shotgun: 0.70, playAction: 0.16, motion: 0.49, underCenter: 0.22, multiTE: 0.22, tempo: 0.20, family: 'spread-shotgun' },
  BUF: { shotgun: 0.50, playAction: 0.16, motion: 0.56, underCenter: 0.40, multiTE: 0.30, tempo: 0.30, family: 'balanced-explosive' },
  KC:  { shotgun: 0.80, playAction: 0.16, motion: 0.50, underCenter: 0.18, multiTE: 0.25, tempo: 0.22, family: 'spread-shotgun' },
  SF:  { shotgun: 0.53, playAction: 0.14, motion: 0.66, underCenter: 0.45, multiTE: 0.35, tempo: 0.18, family: 'shanahan-zone' },
  LAR: { shotgun: 0.40, playAction: 0.21, motion: 0.63, underCenter: 0.50, multiTE: 0.32, tempo: 0.20, family: 'shanahan-zone' },
  BAL: { shotgun: 0.64, playAction: 0.14, motion: 0.53, underCenter: 0.30, multiTE: 0.40, tempo: 0.22, family: 'multi-te' },
  PHI: { shotgun: 0.78, playAction: 0.12, motion: 0.43, underCenter: 0.20, multiTE: 0.28, tempo: 0.35, family: 'spread-shotgun' },
  CIN: { shotgun: 0.82, playAction: 0.12, motion: 0.50, underCenter: 0.15, multiTE: 0.20, tempo: 0.18, family: 'spread-shotgun' },
  DET: { shotgun: 0.50, playAction: 0.17, motion: 0.53, underCenter: 0.42, multiTE: 0.30, tempo: 0.28, family: 'balanced-aggressive' },
  LV:  { shotgun: 0.66, playAction: 0.16, motion: 0.48, underCenter: 0.25, multiTE: 0.24, tempo: 0.22, family: 'spread-shotgun' },
  CAR: { shotgun: 0.65, playAction: 0.14, motion: 0.50, underCenter: 0.28, multiTE: 0.26, tempo: 0.22, family: 'balanced-spread' },
  DEFAULT: { shotgun: 0.60, playAction: 0.14, motion: 0.50, underCenter: 0.30, multiTE: 0.25, tempo: 0.22, family: 'balanced-spread' }
};

/** Opponent-on-offense path seeds (what Houston’s defense must achieve) */
const OPP_ON_OFFENSE_DOMINOS = {
  LAC: [
    { id: 'opp-lac-exp', text: 'No Chargers explosive play this drive', category: 'defense', priority: 93, preGame: false, why: 'One shot flips preseason scripts' },
    { id: 'opp-lac-edge', text: 'Edge sets the edge on early downs', category: 'defense', priority: 88, preGame: false, why: 'Anderson / Clowney live test' },
    { id: 'opp-lac-3rd', text: 'Get off the field on 3rd down', category: 'defense', priority: 90, preGame: false, why: 'Force punt / field-goal range only' }
  ],
  BUF: [
    { id: 'opp-buf-exp', text: 'Limit Bills chunk pass plays', category: 'defense', priority: 95, preGame: false, why: 'Buffalo wins with explosives' },
    { id: 'opp-buf-edge', text: 'Contain designed QB runs / boots', category: 'defense', priority: 88, preGame: false, why: 'Script often includes movement' },
    { id: 'opp-buf-3rd', text: 'Win 3rd-down defense', category: 'defense', priority: 92, preGame: false, why: 'Sustained drives kill the path' }
  ],
  DEFAULT: [
    { id: 'opp-def-exp', text: 'Prevent an explosive (≥20 yd) this drive', category: 'defense', priority: 92, preGame: false, why: 'Path protection starts here' },
    { id: 'opp-def-early', text: 'Win early downs — force 3rd-and-long', category: 'defense', priority: 88, preGame: false, why: 'Sets up the pass rush' },
    { id: 'opp-def-3rd', text: 'Get a stop on 3rd down', category: 'defense', priority: 90, preGame: false, why: 'End the possession' },
    { id: 'opp-def-rz', text: 'If red zone: hold to FG or less', category: 'defense', priority: 94, preGame: false, why: 'Points allowed shrink the path' }
  ]
};

function schemeDistance(a, b) {
  const keys = ['shotgun', 'playAction', 'motion', 'underCenter', 'multiTE', 'tempo'];
  let s = 0;
  keys.forEach((k) => { s += Math.abs((a[k] || 0) - (b[k] || 0)); });
  return s;
}

/** Top scheme neighbors for an opponent (excludes HOU and self). */
function similarSchemes(oppAbbr, limit) {
  limit = limit || 2;
  const base = SCHEME_FINGERPRINTS[oppAbbr] || SCHEME_FINGERPRINTS.DEFAULT;
  const scored = Object.keys(SCHEME_FINGERPRINTS)
    .filter((k) => k !== oppAbbr && k !== 'HOU' && k !== 'DEFAULT')
    .map((k) => ({ abbr: k, family: SCHEME_FINGERPRINTS[k].family, d: schemeDistance(base, SCHEME_FINGERPRINTS[k]) }))
    .sort((x, y) => x.d - y.d);
  return scored.slice(0, limit);
}

/**
 * Opponent tendency lean for current situation (mirror of HOU tendency).
 * Uses scheme fingerprint as prior; situation adjusts pass/run split.
 */
function predictOppTendency(state) {
  const abbr = state.oppAbbr || 'DEFAULT';
  const fp = SCHEME_FINGERPRINTS[abbr] || SCHEME_FINGERPRINTS.DEFAULT;
  const down = state.down || 1;
  const dist = state.distance || 10;
  const scoreDiff = (state.houScore || 0) - (state.oppScore || 0); // HOU perspective
  // Base pass rate from fingerprint shotgun + play-action flavor
  let passP = Math.round(40 + fp.shotgun * 25 + fp.playAction * 10);
  if (down === 3 && dist >= 5) passP = Math.min(92, passP + 18);
  if (down === 3 && dist <= 2) passP = Math.max(35, passP - 12);
  if (down === 1 && dist === 10) passP = Math.round(passP * 0.92);
  // Trailing teams pass more late
  const qtr = state.qtr || 1;
  if (scoreDiff > 7 && qtr >= 3) passP = Math.min(90, passP + 10); // HOU leading → opp trails → more pass
  if (scoreDiff < -7 && qtr >= 3) passP = Math.max(30, passP - 8);
  passP = Math.max(28, Math.min(92, passP));
  const runP = 100 - passP;
  const neighbors = similarSchemes(abbr, 2);
  const simNote = neighbors.length
    ? 'Scheme family ~ ' + fp.family + ' (near ' + neighbors.map((n) => n.abbr).join(', ') + ')'
    : 'Scheme family ~ ' + fp.family;
  return {
    passP: passP,
    runP: runP,
    primary: passP >= runP ? 'Pass lean' : 'Run lean',
    detail: passP >= runP
      ? ('Expect pass concepts — shotgun/PA profile ' + Math.round(fp.shotgun * 100) + '% / ' + Math.round(fp.playAction * 100) + '% PA prior')
      : ('Expect run or run-look — force early-down stops'),
    simNote: simNote,
    neighbors: neighbors,
    family: fp.family
  };
}

function renderOppTendencyCard(state) {
  const card = $('#oppTendencyCard');
  const content = $('#oppTendencyContent');
  const title = $('#oppTendencyCardTitle');
  if (!card || !content) return;
  card.style.display = '';
  const abbr = state.oppAbbr || 'OPP';
  if (title) title.textContent = 'Opponent tendency (' + abbr + ' ball)';
  const t = predictOppTendency(state);
  content.innerHTML =
    '<div class="tendency-bars">' +
      '<div class="tend-row"><span class="tend-label">Pass</span><div class="tend-track"><div class="tend-fill pass" style="width:' + t.passP + '%"></div></div><span class="tend-pct">' + t.passP + '%</span></div>' +
      '<div class="tend-row"><span class="tend-label">Run</span><div class="tend-track"><div class="tend-fill run" style="width:' + t.runP + '%"></div></div><span class="tend-pct">' + t.runP + '%</span></div>' +
    '</div>' +
    '<div class="tend-note" style="margin-top:8px"><strong>' + t.primary + '</strong> — ' + t.detail + '</div>' +
    '<div class="small" style="margin-top:6px">' + t.simNote + '. Prior only — live plays rewrite Dominos.</div>';
}

function renderOppNextPlayLean(state) {
  const card = $('#oppNextPlayCard');
  const content = $('#oppNextPlayContent');
  const title = $('#oppNextPlayCardTitle');
  if (!card || !content) return;
  card.style.display = '';
  const abbr = state.oppAbbr || 'OPP';
  if (title) title.textContent = abbr + ' Next Play Lean';
  const t = predictOppTendency(state);
  const down = state.down || 1;
  const dist = state.distance || 10;
  let leans = [];
  if (t.passP >= t.runP) {
    leans.push({ type: 'Pass', pct: t.passP, detail: down === 3 ? 'Convert 3rd-and-' + dist : 'Dropback / PA family', reason: t.family + ' prior + situation' });
    leans.push({ type: 'Run', pct: t.runP, detail: 'Early-down or short-yardage look', reason: 'Balance / play-action setup' });
  } else {
    leans.push({ type: 'Run', pct: t.runP, detail: 'Zone or gap early down', reason: t.family + ' prior + situation' });
    leans.push({ type: 'Pass', pct: t.passP, detail: 'Play-action or boot', reason: 'Keep defense honest' });
  }
  let html = '<div class="nextplay-primary">' + leans[0].type + ' lean for ' + abbr + '</div>';
  html += '<div class="small" style="margin:2px 0 10px">' + ordSuffix(down) + ' & ' + dist + ' · ' + t.simNote + '</div>';
  html += '<div class="nextplay-leans">';
  leans.forEach(function (l, i) {
    const barColor = l.type === 'Run' ? 'var(--navy)' : 'var(--danger)';
    html += '<div class="nextplay-row"><div class="nextplay-label"><strong>' + (i + 1) + '. ' + l.type + '</strong> — ' + l.detail + '</div>';
    html += '<div class="nextplay-bar-track"><div class="nextplay-bar-fill" style="width:' + l.pct + '%; background:' + barColor + '"></div></div>';
    html += '<div class="nextplay-pct">' + l.pct + '%</div><div class="nextplay-reason small">' + l.reason + '</div></div>';
  });
  html += '</div>';
  html += '<p class="tend-note" style="margin-top:10px">Opponent lean for argument — what Houston’s defense should be ready for. Not a guarantee.</p>';
  content.innerHTML = html;
}

function hideOppCards() {
  const a = $('#oppTendencyCard');
  const b = $('#oppNextPlayCard');
  if (a) a.style.display = 'none';
  if (b) b.style.display = 'none';
}

/**
 * Build dominos for the team currently on offense.
 * side: 'hou' | 'opp'
 */
function evaluateDominosForSide(state, side) {
  const base = evaluateDominos(state);
  if (side !== 'opp') return base;

  // Opponent has the ball — prioritize Houston defensive path
  const abbr = state.oppAbbr || 'DEFAULT';
  const oppSeeds = (OPP_ON_OFFENSE_DOMINOS[abbr] || OPP_ON_OFFENSE_DOMINOS.DEFAULT).map(function (d) {
    return Object.assign({}, d, { status: 'live' });
  });
  const signals = extractPlaySignals(state.recentPlays || []);
  let all = oppSeeds.concat((base.allDominos || []).filter(function (d) {
    return d.category === 'defense' || d.category === 'momentum' || d.id === 'sit-def-stop';
  }));
  // Similarity insight as a soft context domino
  const neighbors = similarSchemes(abbr, 1);
  if (neighbors.length) {
    all.push({
      id: 'sch-sim',
      text: 'Familiar family: looks like ' + neighbors[0].abbr + ' tendencies',
      status: 'live',
      priority: 70,
      category: 'context',
      preGame: false,
      why: 'Scheme prior — not a copy of that team'
    });
  }
  all = resolveDominoStatuses(all, signals, state);
  all.forEach(function (d) {
    if (typeof memoryWeightFor === 'function') {
      d.priority = Math.round((d.priority || 50) * memoryWeightFor(d.id));
    }
  });
  all.sort(function (a, b) { return b.priority - a.priority; });
  const liveOnes = all.filter(function (d) { return d.status === 'live'; });
  const brokenOnes = all.filter(function (d) { return d.status === 'broken'; });
  const fallenOnes = all.filter(function (d) { return d.status === 'fallen'; });
  let visible = liveOnes.slice(0, 4);
  if (visible.length < 4 && brokenOnes.length) {
    visible = visible.concat(brokenOnes.slice(0, 4 - visible.length));
  }
  if (!visible.length) visible = all.slice(0, 4);

  let keyInsight = 'Opponent ball — Houston’s path is defensive this series.';
  if (state.down === 3) keyInsight = '3rd-and-' + (state.distance || '') + ' for ' + abbr + ' — highest leverage stop on the field.';
  else if (brokenOnes.length) keyInsight = 'Path stress: a defensive domino broke — next snap matters more.';
  else if (fallenOnes.length >= 2) keyInsight = 'Defense is holding — early-down wins are stacking.';
  else if (visible[0] && visible[0].why) keyInsight = visible[0].why;

  return {
    dominos: visible,
    allDominos: all,
    keyInsight: keyInsight,
    statusSummary: liveOnes.length + ' live · ' + fallenOnes.length + ' fallen · ' + brokenOnes.length + ' broken',
    signals: signals,
    side: 'opp'
  };
}


function evaluateDominos(state) {
  const scoreDiff = (state.houScore || 0) - (state.oppScore || 0);
  const qtr = state.qtr || 1;
  const clock = state.clockSeconds || 900;
  const possHou = typeof isFocusPossession === 'function' ? isFocusPossession(state) : state.possession === 'HOU';
  const down = state.down || 1;
  const dist = state.distance || 10;
  const yardNum = state.yardNum || 50;
  const side = state.yardSide || 'own';
  const isRedZone = side === 'opp' && yardNum <= 20;
  const isLate = qtr >= 4 || (qtr === 3 && clock < 300);
  const oppAbbr = state.oppAbbr || 'DEFAULT';
  const recent = state.recentPlays || [];
  const weatherNote = (state.weather && state.weather.note) || '';
  const signals = extractPlaySignals(recent);

  // 1. Matchup seeds
  const focusNow = state.focusAbbr || (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  const seedSrc = (typeof seedsForMatchup === 'function')
    ? seedsForMatchup(focusNow, oppAbbr)
    : (PRE_GAME_DOMINOS[oppAbbr] || PRE_GAME_DOMINOS.DEFAULT);
  let seeds = seedSrc.map((d) => ({ ...d, status: 'live' }));

  // 2. Situational dominos
  const situational = [];
  if (possHou) {
    if (down === 3) {
      situational.push({
        id: 'sit-3rd',
        text: 'Convert this 3rd-and-' + dist,
        status: 'live',
        priority: 96,
        category: 'offense',
        preGame: false,
        why: 'Highest leverage snap on the field'
      });
    } else if (down === 2 && dist >= 7) {
      situational.push({
        id: 'sit-2nd-long',
        text: 'Stay ahead of the chains on 2nd down',
        status: 'live',
        priority: 86,
        category: 'offense',
        preGame: false,
        why: 'Avoid 3rd-and-long'
      });
    }
    if (isRedZone) {
      situational.push({
        id: 'sit-rz-finish',
        text: 'Finish this red-zone trip with a TD',
        status: 'live',
        priority: 95,
        category: 'offense',
        preGame: false,
        why: 'Path value spikes inside the 20'
      });
    }
  } else {
    situational.push({
      id: 'sit-def-stop',
      text: 'Force a three-and-out or limited gain',
      status: 'live',
      priority: 92,
      category: 'defense',
      preGame: false,
      why: 'Offense path depends on this series'
    });
  }

  if (scoreDiff > 0 && isLate) {
    situational.push({
      id: 'sit-protect-lead',
      text: 'Protect the lead — no empty possessions',
      status: 'live',
      priority: 94,
      category: 'offense',
      preGame: false,
      why: 'Clock is now a teammate'
    });
  } else if (scoreDiff < 0 && isLate) {
    situational.push({
      id: 'sit-comeback',
      text: 'Need scoring drives + defensive stops',
      status: 'live',
      priority: 97,
      category: 'offense',
      preGame: false,
      why: 'Every possession is leveraged'
    });
  }

  const lastBig = recent.find((p) => p.big);
  if (lastBig && lastBig.team === 'HOU') {
    situational.push({
      id: 'mom-hou',
      text: 'Ride momentum from the last big play',
      status: 'live',
      priority: 83,
      category: 'momentum',
      preGame: false,
      why: 'Strike while the defense is unsettled'
    });
  } else if (lastBig && lastBig.team !== 'HOU') {
    situational.push({
      id: 'mom-opp',
      text: 'Answer the opponent explosive play',
      status: 'live',
      priority: 89,
      category: 'momentum',
      preGame: false,
      why: 'Path narrows if unanswered'
    });
  }

  if (weatherNote && !/dome|indoor|not a factor/i.test(weatherNote)) {
    situational.push({
      id: 'ctx-weather',
      text: 'Account for weather on ball / kicking',
      status: 'live',
      priority: 65,
      category: 'context',
      preGame: false,
      why: 'Real outdoor factor'
    });
  }

  // 3. Historical priority boost + season memory
  let all = seeds.concat(situational).map((d) => {
    let p = d.priority;
    if (/protect|clean|pressure/i.test(d.text)) p *= HISTORICAL_WEIGHTS.protectQB;
    if (/3rd|third/i.test(d.text)) p *= HISTORICAL_WEIGHTS.thirdDown;
    if (/red-zone|red zone|finish/i.test(d.text)) p *= HISTORICAL_WEIGHTS.redZoneFinish;
    if (/explosive/i.test(d.text)) p *= HISTORICAL_WEIGHTS.noExplosivesAgainst;
    if (/early-down|chains/i.test(d.text)) p *= HISTORICAL_WEIGHTS.earlyDownSuccess;
    if (/takeaway/i.test(d.text)) p *= HISTORICAL_WEIGHTS.takeaway;
    if (typeof memoryWeightFor === 'function') p *= memoryWeightFor(d.id);
    return Object.assign({}, d, { priority: Math.round(p) });
  });

  // 4. Resolve fallen / broken from play signals
  all = resolveDominoStatuses(all, signals, state);
  all.sort((a, b) => b.priority - a.priority);

  // Visible: prefer live, include one broken if it is high-signal, max 4
  const liveOnes = all.filter((d) => d.status === 'live');
  const brokenOnes = all.filter((d) => d.status === 'broken');
  const fallenOnes = all.filter((d) => d.status === 'fallen');
  let visible = liveOnes.slice(0, 4);
  if (visible.length < 4 && brokenOnes.length) {
    visible = visible.concat(brokenOnes.slice(0, 4 - visible.length));
  }
  // If everything is quiet early, still show top live seeds
  if (!visible.length) visible = all.slice(0, 4);

  const statusSummary =
    liveOnes.length + ' live · ' + fallenOnes.length + ' fallen · ' + brokenOnes.length + ' broken';

  // 5. Derived insight from top path state
  let keyInsight = '';
  const top = visible[0];
  if (brokenOnes.length >= 2) {
    keyInsight = 'Multiple path breaks — next two possessions decide if the win path survives.';
  } else if (top && top.status === 'broken') {
    keyInsight = 'Path narrowed: "' + top.text + '" went against the ' + (typeof teamNick === 'function' ? teamNick(focusNow) : focusNow) + '.';
  } else if (possHou && down === 3) {
    keyInsight = 'This 3rd-and-' + dist + ' is the highest-leverage snap on the field.';
  } else if (possHou && isRedZone) {
    keyInsight = 'Red-zone finish is the clearest remaining path to points.';
  } else if (!possHou) {
    keyInsight = 'Defense must force a stop to keep the offense path intact.';
  } else if (scoreDiff > 0 && isLate) {
    keyInsight = 'Leading late — remaining dominos favor controlled, low-risk football.';
  } else if (scoreDiff < 0 && isLate) {
    keyInsight = 'Trailing — every possession and every stop carries extra weight.';
  } else if (fallenOnes.length >= 2 && brokenOnes.length === 0) {
    keyInsight = 'Path is holding — early conditions falling the ' + (typeof teamNick === 'function' ? teamNick(focusNow) : focusNow) + '’s way.';
  } else if (top && top.why) {
    keyInsight = top.why;
  } else {
    keyInsight = 'Early-down success and protection remain the foundation of the win path.';
  }

  return {
    dominos: visible,
    allDominos: all,
    keyInsight: keyInsight,
    statusSummary: statusSummary,
    signals: signals
  };
}

/**
 * Render Dominos card.
 * mode: 'live' | 'pregame'
 */
function renderDominosCard(mode, oppAbbr) {
  const card = $('#dominosCard');
  const content = $('#dominosContent');
  const pill = $('#dominosStatusPill');
  if (!card || !content) return;

  function rowHtml(d) {
    const icon = d.status === 'fallen' ? '🟢' : d.status === 'broken' ? '🔴' : '🟡';
    const cls = d.status === 'fallen' ? 'domino-fallen' : d.status === 'broken' ? 'domino-broken' : 'domino-live';
    const cat = CAT_LABEL[d.category] || '—';
    const phase = d.phase === 'starter' ? ' · starters' : d.phase === 'depth' ? ' · depth' : '';
    return (
      '<div class="domino-row ' + cls + '">' +
        '<span class="domino-icon">' + icon + '</span>' +
        '<div class="domino-body">' +
          '<div class="domino-text">' + d.text + '</div>' +
          '<div class="domino-meta"><span class="domino-cat">' + cat + '</span>' + phase + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function activeState() {
    if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.active) return LIVE_GAME;
    // LIVE_DEMO never used as active state

    return null;
  }

  // LIVE (real feed or legacy demo) — dual path by possession
  if (mode === 'live' || activeState()) {
    const state = activeState() || LIVE_GAME;
    card.style.display = '';
    const possHou = typeof isFocusPossession === 'function' ? isFocusPossession(state) : state.possession === 'HOU';
    const result = (typeof evaluateDominosForSide === 'function')
      ? evaluateDominosForSide(state, possHou ? 'hou' : 'opp')
      : evaluateDominos(state);
    const dTitle = $('#dominosCardTitle');
    const focusLive = state.focusAbbr || (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
    const focusNickLive = (typeof teamNick === 'function') ? teamNick(focusLive) : focusLive;
    if (dTitle) {
      dTitle.textContent = possHou ? ('Dominos to Win · ' + focusNickLive) : ('Dominos — ' + focusNickLive + ' defense');
    }
    if (pill) pill.textContent = result.statusSummary + (possHou ? '' : ' · opp ball');
    if (!result.dominos.length) {
      content.innerHTML = '<div class="empty">Path being evaluated…</div>';
      return;
    }
    let html = '<div class="dominos-list">';
    result.dominos.forEach(function (d) { html += rowHtml(d); });
    html += '</div>';
    html += '<div class="dominos-insight">' + result.keyInsight + '</div>';
    content.innerHTML = html;
    return;
  }

  // POST-GAME hierarchy (Offense / Defense / ST)
  if (mode === 'postgame' || (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.final)) {
    const state = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.final) ? LIVE_GAME : { oppAbbr: oppAbbr || 'DEFAULT', recentPlays: [] };
    card.style.display = '';
    const result = evaluateDominos(state);
    if (pill) pill.textContent = 'Final path';
    const groups = { offense: [], defense: [], special: [], player: [], momentum: [], coaching: [], context: [] };
    (result.allDominos || result.dominos || []).forEach(function (d) {
      const key = groups[d.category] ? d.category : 'offense';
      groups[key].push(d);
    });
    const order = ['offense', 'defense', 'special', 'player', 'momentum', 'coaching', 'context'];
    let html = '';
    order.forEach(function (key) {
      if (!groups[key].length) return;
      html += '<div class="dominos-group-title">' + (CAT_LABEL[key] || key) + '</div>';
      html += '<div class="dominos-list">';
      groups[key].forEach(function (d) { html += rowHtml(d); });
      html += '</div>';
    });
    if (!html) html = '<div class="empty">Path summary unavailable.</div>';
    html += '<div class="dominos-insight">' + (result.keyInsight || 'Final path recorded for season memory.') + '</div>';
    content.innerHTML = html;
    return;
  }

  // PRE-GAME — always the monitored matchup (focus vs opponent), never Houston's next game by default
  const abbr = oppAbbr || 'DEFAULT';
  const focusNow = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  const seedSrc = (typeof seedsForMatchup === 'function')
    ? seedsForMatchup(focusNow, abbr)
    : ((PRE_GAME_DOMINOS[abbr] || PRE_GAME_DOMINOS.DEFAULT));
  const seeds = seedSrc
    .slice()
    .sort(function (a, b) { return b.priority - a.priority; })
    .slice(0, 5)
    .map(function (d) { return Object.assign({}, d, { status: 'live' }); });

  card.style.display = '';
  if (pill) pill.textContent = 'Before kickoff';
  const dTitlePre = $('#dominosCardTitle');
  const focusNick = (typeof teamNick === 'function') ? teamNick(focusNow) : focusNow;
  if (dTitlePre) dTitlePre.textContent = 'Dominos to Win · ' + focusNick;

  if (!seeds.length) {
    content.innerHTML = '<div class="empty">Matchup keys will appear closer to kickoff.</div>';
    return;
  }

  const starterCount = seeds.filter(function (d) { return d.phase === 'starter'; }).length;
  const depthCount = seeds.filter(function (d) { return d.phase === 'depth'; }).length;
  const oppLabel = (typeof teamNick === 'function' && abbr !== 'DEFAULT') ? teamNick(abbr) : abbr;
  let phaseNote = 'What has to go right vs the ' + oppLabel + ' for the ' + focusNick + ' to win.';
  if (focusNow === 'HOU') phaseNote = 'What has to go right vs ' + abbr + ' for Houston to win.';
  if (starterCount && depthCount) {
    phaseNote = 'Preseason path vs ' + oppLabel + ': starter window first, then depth evaluation. List updates live once the game starts.';
  } else if (starterCount) {
    phaseNote = 'Starter-window priorities vs ' + oppLabel + '. Updates live once the game starts.';
  }

  let html = '<div class="dominos-list">';
  seeds.forEach(function (d) { html += rowHtml(d); });
  html += '</div>';
  html += '<div class="dominos-insight">' + phaseNote + '</div>';
  content.innerHTML = html;
}

/* Injury / availability (camp / early preseason — public-style) */
const INJURY_REPORT = [
  { name: 'Jayden Higgins', pos: 'WR', status: 'IR · Out 2026', note: 'Torn ACL in Aug. 18 joint practice. Season over. Not in the Week 1 plan.' },
  { name: 'Braden Smith', pos: 'T', status: 'IR', note: 'Plantar fascia; expected to miss at least the first four games. Right-tackle plan is depth-dependent.' },
  { name: 'Tank Dell', pos: 'WR', status: 'Monitor', note: 'Working back from 2024 knee (missed 2025). Week 1 snaps are not assumed.' },
  { name: 'British Brooks', pos: 'RB', status: 'Out (hand)', note: 'Camp hand injury / surgery. Depth / ST only if activated.' },
  { name: 'D.J. Turner', pos: 'WR', status: 'IR', note: 'On injured reserve.' }
];

/* Opponent one-pager (low-bias, public facts style) keyed by abbr */
const OPPONENT_PREVIEWS = {
  BUF: {
    title: 'Buffalo Bills',
    record: '2025 context: perennial AFC contender',
    bullets: [
      'Elite QB play — game script often runs through the pass game.',
      'Strong skill group; expect condensed splits and motion.',
      'Defense can generate pressure; protect edges and help center.',
      'Red-zone efficiency is typically a strength — finish drives.',
      'Last meetings: competitive AFC-style games; points at a premium.'
    ],
    sources: 'Public season trends · neutral matchup notes · not a prediction'
  },
  LAC: {
    title: 'Los Angeles Chargers',
    record: 'Preseason Week 1 · Aug 13 (home)',
    bullets: [
      'Preseason Week 1 is evaluation more than final score — starters often play limited series.',
      'Watch: Stroud/Mills snap counts, early chemistry with Higgins & the new OL mix (Teller/Rutledge).',
      'Edge rotation: Anderson + Clowney vs Chargers OT depth is useful live data.',
      'Special teams and tackle consistency usually tell the real story in the first preseason game.',
      'Practical tip: local TV (KTRK). Set a reminder; preseason windows can shift slightly.'
    ],
    sources: 'Preseason evaluation priorities · public roster notes'
  },
  DEFAULT: {
    title: 'Opponent',
    record: 'Preview available closer to kickoff',
    bullets: [
      'Record, main weapons, schematic notes, and keys to the game will appear here.',
      'Injury line, TV channel, and history stay on the other cards.',
      'Preseason focus: depth evaluation and starter rest plans. Regular/post: matchup specifics.'
    ],
    sources: 'Updated from public sources before game week'
  }
};


/* Win probability series for demo graph (simplified model points, not ESPN) */
const WP_SERIES_DEMO = [
  { t: 0, hou: 52 }, { t: 1, hou: 48 }, { t: 2, hou: 55 }, { t: 3, hou: 61 },
  { t: 4, hou: 58 }, { t: 5, hou: 64 }, { t: 6, hou: 62 }, { t: 7, hou: 67 }
];

/* Depth chart simplified — camp / early preseason view */
const DEPTH_CHART = {
  offense: [
    { unit: 'QB', players: ['C.J. Stroud', 'Davis Mills', 'Graham Mertz'] },
    { unit: 'RB', players: ['David Montgomery', 'Woody Marks', 'Jawhar Jordan', 'British Brooks'] },
    { unit: 'WR', players: ['Nico Collins', 'Xavier Hutchinson', 'Jaylin Noel', 'Tank Dell', 'Justin Watson'] },
    { unit: 'TE', players: ['Dalton Schultz', 'Foster Moreau', 'Brevin Jordan', 'Cade Stover', 'Marlin Klein'] },
    { unit: 'OL (core)', players: ['Aireontae Ersery', 'Wyatt Teller', 'Keylan Rutledge / Jake Andrews', 'Ed Ingram', 'Blake Fisher / Trent Brown'] }
  ],
  defense: [
    { unit: 'EDGE', players: ['Will Anderson Jr.', 'Danielle Hunter', 'Jadeveon Clowney'] },
    { unit: 'DL', players: ['Sheldon Rankins', 'Tommy Togiai', 'Logan Hall', 'Kayden McDonald'] },
    { unit: 'LB', players: ['Azeez Al-Shaair', 'Henry To\'oTo\'o', 'Marte Mapu', 'E.J. Speed'] },
    { unit: 'CB', players: ['Derek Stingley Jr.', 'Kamari Lassiter', 'Jaylin Smith', 'Tremon Smith'] },
    { unit: 'S', players: ['Calen Bullock', 'Jalen Pitre', 'Reed Blankenship'] }
  ]
};

/* ---------- Full searchable roster (training camp / preseason 2026) ----------
   Phase notes: Camp roster is larger (~90). Regular season cuts to 53 + practice squad.
   Postseason uses the active 53. Numbers & roles can shift after cuts.
   Insights focus on things typical apps skip: camp status, role clarity, father-son watch points, practical viewing notes.
*/
const FULL_ROSTER = [
  // ===== QB =====
  { name: 'C.J. Stroud', num: '7', pos: 'QB', ht: '6-3', wt: '218', exp: 4, college: 'Ohio State', status: 'Starter', note: 'Franchise QB. Pocket presence and deep ball remain the offense’s identity.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4432577/cj-stroud' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/S/StroCJ00.htm' },
    { label: 'NFL.com', url: 'https://www.nfl.com/players/c-j-stroud/' }
  ] },
  { name: 'Davis Mills', num: '10', pos: 'QB', ht: '6-4', wt: '225', exp: 6, college: 'Stanford', status: 'Backup', note: 'Reliable No. 2. Preseason evaluation window after starters sit.' },
  { name: 'Graham Mertz', num: '18', pos: 'QB', ht: '6-3', wt: '216', exp: 'R', college: 'Florida', status: 'Roster battle', note: 'Developmental third QB. Camp/preseason snaps decide 53 vs PS.' },

  // ===== RB =====
  { name: 'David Montgomery', num: '32', pos: 'RB', ht: '5-11', wt: '230', exp: 8, college: 'Iowa State', status: 'Starter', note: 'New lead back. Power, short-yardage, early downs.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4035538/david-montgomery' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/M/MontDa01.htm' }
  ] },
  { name: 'Woody Marks', num: '4', pos: 'RB', ht: '5-10', wt: '208', exp: 2, college: 'USC', status: 'Change of pace', note: 'Year-2 all-around back. Complementary role + ST value.' },
  { name: 'Jawhar Jordan', num: '25', pos: 'RB', ht: '5-10', wt: '185', exp: 1, college: 'Louisville', status: 'Speed / depth', note: 'Juice and vision. Camp riser candidate.' },
  { name: 'British Brooks', num: '44', pos: 'RB', ht: '5-11', wt: '225', exp: 3, college: 'North Carolina', status: 'ST / depth · Injured', note: 'Hand injury in camp (surgery timeline). Special-teams ace.' },
  { name: 'Noah Whittington', num: '26', pos: 'RB', ht: '5-10', wt: '200', exp: 'R', college: 'Oregon', status: 'Rookie depth', note: 'UDFA. Preseason opportunity if Brooks misses time.' },
  { name: 'Joshua Pitsenberger', num: '31', pos: 'RB', ht: '6-0', wt: '215', exp: 'R', college: 'Yale', status: 'Rookie', note: 'Camp body / practice-squad candidate.' },
  { name: 'Evan Hull', num: '42', pos: 'RB', ht: '5-10', wt: '209', exp: 3, college: 'Northwestern', status: 'Depth', note: 'Versatile back competing for a late roster or PS spot.' },

  // ===== WR =====
  { name: 'Nico Collins', num: '12', pos: 'WR', ht: '6-4', wt: '222', exp: 6, college: 'Michigan', status: 'WR1', note: 'Primary vertical and contested-catch threat.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4258179/nico-collins' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/C/CollNi00.htm' }
  ] },
  { name: 'Jayden Higgins', num: '81', pos: 'WR', ht: '6-4', wt: '215', exp: 2, college: 'Iowa State', status: 'IR · Out 2026 (ACL)', note: 'Season-ending ACL in August. Listed so the name still searches; not a Week 1 option.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4689388/jayden-higgins' },
    { label: 'NFL.com', url: 'https://www.nfl.com/players/jayden-higgins/' }
  ] },
  { name: 'Tank Dell', num: '1', pos: 'WR', ht: '5-10', wt: '165', exp: 4, college: 'Houston', status: 'Returning', note: 'Working back from prior knee. Monitor live preseason snaps.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4688819/tank-dell' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/D/DellTa00.htm' }
  ] },
  { name: 'Xavier Hutchinson', num: '19', pos: 'WR', ht: '6-3', wt: '210', exp: 4, college: 'Iowa State', status: 'WR2 candidate', note: 'Size target opposite Collins with Higgins out for the year.' },
  { name: 'Kayshon Boutte', num: '—', pos: 'WR', ht: '5-11', wt: '197', exp: 4, college: 'LSU', status: 'Acquired after Higgins IR', note: 'Added after the Higgins ACL. Role depends on Week 1 activation — verify live roster before kickoff.' },
  { name: 'Jaylin Noel', num: '13', pos: 'WR', ht: '5-11', wt: '190', exp: 1, college: 'Iowa State', status: 'Young depth', note: 'Speed and separation traits; fighting for snaps.' },
  { name: 'Justin Watson', num: '84', pos: 'WR', ht: '6-3', wt: '215', exp: 9, college: 'Penn', status: 'Veteran depth', note: 'Special teams + situational deep threat.' },
  { name: 'Lewis Bond', num: '82', pos: 'WR', ht: '5-11', wt: '190', exp: 'R', college: 'Boston College', status: 'Rookie', note: '2026 rookie WR. Camp/preseason evaluation for 53 or practice squad.', aliases: ['louis bond'] },
  { name: 'Jared Wayne', num: '89', pos: 'WR', ht: '6-3', wt: '210', exp: 2, college: 'Pittsburgh', status: 'Depth', note: 'Size on the outside; competing through cuts.' },
  { name: 'Daniel Sobkowicz', num: '17', pos: 'WR', ht: '6-3', wt: '205', exp: 'R', college: 'Illinois State', status: 'Rookie', note: 'Camp invite / UDFA path. Preseason reps matter.' },
  { name: 'Treyvhon Saunders', num: '14', pos: 'WR', ht: '5-10', wt: '190', exp: 'R', college: 'Colgate', status: 'Rookie', note: 'Small-school speed; long-shot 53, realistic PS candidate.' },
  { name: 'Josh Kelly', num: '85', pos: 'WR', ht: '6-1', wt: '192', exp: 1, college: 'Texas Tech', status: 'Depth', note: 'Competing for a receiver depth chart spot.' },
  { name: 'Jha\'Quan Jackson', num: '88', pos: 'WR', ht: '5-9', wt: '188', exp: 2, college: 'Tulane', status: 'Depth / returns', note: 'Slot and return flexibility.' },
  { name: 'D.J. Turner', num: '16', pos: 'WR', ht: '5-11', wt: '205', exp: 4, college: 'Pittsburgh', status: 'IR', note: 'On injured reserve — listed for completeness.' },

  // ===== TE =====
  { name: 'Dalton Schultz', num: '86', pos: 'TE', ht: '6-5', wt: '242', exp: 9, college: 'Stanford', status: 'Starter', note: 'Primary TE in the pass game and red zone.' },
  { name: 'Cade Stover', num: '8', pos: 'TE', ht: '6-4', wt: '251', exp: 3, college: 'Ohio State', status: 'Blocking / depth', note: 'Inline and move TE versatility.' },
  { name: 'Brevin Jordan', num: '9', pos: 'TE', ht: '6-3', wt: '245', exp: 6, college: 'Miami', status: 'Pass threat', note: 'Athletic mismatch piece when healthy.' },
  { name: 'Foster Moreau', num: '87', pos: 'TE', ht: '6-4', wt: '250', exp: 7, college: 'LSU', status: 'Blocking TE', note: 'Veteran inline blocker and red-zone body.' },
  { name: 'Marlin Klein', num: '83', pos: 'TE', ht: '6-6', wt: '250', exp: 'R', college: 'Michigan', status: 'Rookie', note: 'Size and blocking; early camp physicality notes.' },
  { name: 'Layne Pryor', num: '49', pos: 'TE', ht: '6-2', wt: '250', exp: 1, college: 'Northern Iowa', status: 'Depth', note: 'Fighting for a TE depth chart spot.' },
  { name: 'Louis Hansen', num: '47', pos: 'TE', ht: '6-5', wt: '240', exp: 'R', college: 'Connecticut', status: 'Rookie', note: 'Camp TE depth.' },

  // ===== OL =====
  { name: 'Aireontae Ersery', num: '79', pos: 'T', ht: '6-6', wt: '330', exp: 2, college: 'Minnesota', status: 'LT starter', note: 'Year-2 LT. Consistency and pass-pro sets are the focus.' },
  { name: 'Wyatt Teller', num: '75', pos: 'G', ht: '6-4', wt: '315', exp: 9, college: 'Virginia Tech', status: 'LG starter', note: 'Veteran free-agent addition. Anchors the left interior.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/3121422/wyatt-teller' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/T/TellWy00.htm' }
  ] },
  { name: 'Keylan Rutledge', num: '66', pos: 'G/C', ht: '6-4', wt: '330', exp: 'R', college: 'Georgia Tech', status: '1st-round pick (#26)', note: '2026 1st-rounder. Natural guard; competing at center. All-American (2025).', aliases: ['kentan', 'rutlage', 'rutledg'], links: [
    { label: 'ESPN player page', url: 'https://www.espn.com/nfl/player/_/id/4839498/keylan-rutledge' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/R/RutlKe00.htm' },
    { label: 'NFL.com roster', url: 'https://www.nfl.com/players/keylan-rutledge/' }
  ] },
  { name: 'Ed Ingram', num: '69', pos: 'G', ht: '6-3', wt: '307', exp: 5, college: 'LSU', status: 'RG', note: 'Steady interior. Pairing with Teller improves the middle.' },
  { name: 'Braden Smith', num: '71', pos: 'T', ht: '6-6', wt: '312', exp: 9, college: 'Auburn', status: 'IR (foot)', note: 'Plantar fascia; expected out at least Weeks 1–4. Do not list as Week 1 RT starter.' },
  { name: 'Jake Andrews', num: '60', pos: 'C', ht: '6-3', wt: '308', exp: 4, college: 'Troy', status: 'Center battle', note: 'Competing with Rutledge for the starting C role.' },
  { name: 'Trent Brown', num: '77', pos: 'T', ht: '6-8', wt: '380', exp: 12, college: 'Florida', status: 'Swing tackle', note: 'Massive veteran depth at either tackle.' },
  { name: 'Blake Fisher', num: '57', pos: 'T', ht: '6-6', wt: '312', exp: 3, college: 'Notre Dame', status: 'Tackle depth', note: 'Developmental tackle with starting upside if injuries hit.' },
  { name: 'Jarrett Patterson', num: '54', pos: 'C/G', ht: '6-4', wt: '310', exp: 4, college: 'Notre Dame', status: 'Interior depth', note: 'Flexible C/G depth for the 53 or injury replacements.' },
  { name: 'Febechi Nwaiwu', num: '64', pos: 'G', ht: '6-4', wt: '319', exp: 'R', college: 'Oklahoma', status: 'Rookie G', note: 'Interior developmental piece; camp evaluation.' },
  { name: 'Evan Brown', num: '67', pos: 'C/G', ht: '6-3', wt: '320', exp: 8, college: 'SMU', status: 'Veteran depth', note: 'Experienced interior who can play C or G.' },
  { name: 'Eli Cox', num: '65', pos: 'C', ht: '6-4', wt: '309', exp: 1, college: 'Kentucky', status: 'Depth', note: 'Young center depth behind the starter battle.' },
  { name: 'Jarrett Kingston', num: '63', pos: 'T', ht: '6-4', wt: '308', exp: 3, college: 'USC', status: 'Depth', note: 'Tackle depth competing through cuts.' },
  { name: 'Sam Hagen', num: '76', pos: 'OL', ht: '6-6', wt: '320', exp: 'R', college: 'South Dakota State', status: 'Rookie', note: 'Camp OL body.' },
  { name: 'James Neal III', num: '70', pos: 'T', ht: '6-5', wt: '310', exp: 1, college: '—', status: 'Depth', note: 'Tackle depth / camp invite path.' },

  // ===== EDGE / DL =====
  { name: 'Will Anderson Jr.', num: '51', pos: 'DE', ht: '6-4', wt: '243', exp: 4, college: 'Alabama', status: 'All-Pro edge', note: 'Primary pass-rush force. Alignment with Clowney/Hunter is a weekly storyline.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4429013/will-anderson-jr' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/A/AndeWi01.htm' }
  ] },
  { name: 'Danielle Hunter', num: '55', pos: 'DE', ht: '6-5', wt: '263', exp: 12, college: 'LSU', status: 'Pro Bowl edge', note: 'Veteran production. Core of the front.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/2969939/danielle-hunter' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/H/HuntDa01.htm' }
  ] },
  { name: 'Jadeveon Clowney', num: '90', pos: 'DE', ht: '6-5', wt: '266', exp: 13, college: 'South Carolina', status: 'Hometown return', note: 'Rotational early-down + situational rush. Still produces.' },
  { name: 'Logan Hall', num: '90', pos: 'DE', ht: '6-6', wt: '283', exp: 5, college: 'Houston', status: 'Interior / edge flex', note: 'Rotation piece; number may share timeline with Clowney listing.' },
  { name: 'Sheldon Rankins', num: '98', pos: 'DT', ht: '6-2', wt: '305', exp: 11, college: 'Louisville', status: 'Interior starter', note: 'Veteran DT production and run defense.' },
  { name: 'Tommy Togiai', num: '72', pos: 'DT', ht: '6-2', wt: '296', exp: 5, college: 'Ohio State', status: 'Rotation DT', note: 'Interior rotation and run fits.' },
  { name: 'Kayden McDonald', num: '93', pos: 'DT', ht: '6-3', wt: '310', exp: 'R', college: '—', status: 'Rookie', note: 'Developmental DT.' },
  { name: 'Solomon Byrd', num: '50', pos: 'DE', ht: '6-3', wt: '250', exp: 1, college: 'USC', status: 'Edge depth', note: 'Young edge rotation candidate.' },
  { name: 'Ali Gaye', num: '95', pos: 'DE', ht: '6-6', wt: '265', exp: 3, college: 'LSU', status: 'Edge depth', note: 'Length on the edge; competing for snaps.' },
  { name: 'Dylan Horton', num: '92', pos: 'DE', ht: '6-4', wt: '275', exp: 4, college: 'TCU', status: 'Edge / DE', note: 'Rotation defensive end.' },
  { name: 'Dominique Robinson', num: '94', pos: 'DE', ht: '6-5', wt: '275', exp: 5, college: 'Miami (OH)', status: 'Edge depth', note: 'Veteran edge depth.' },
  { name: 'Dominic Bailey', num: '96', pos: 'DT', ht: '6-3', wt: '292', exp: 'R', college: 'Tennessee', status: 'Rookie DT', note: 'Interior developmental piece.' },
  { name: 'Kyonte Hamilton', num: '58', pos: 'DT', ht: '6-4', wt: '304', exp: 2, college: 'Rutgers', status: 'DT depth', note: 'Nose/3-tech flexibility.' },
  { name: 'Naquan Jones', num: '91', pos: 'DT', ht: '6-3', wt: '313', exp: 6, college: 'Michigan State', status: 'DT depth', note: 'Veteran interior body.' },
  { name: 'Junior Tafuna', num: '53', pos: 'DT', ht: '6-3', wt: '305', exp: 1, college: 'Utah', status: 'Depth', note: 'Young DT depth.' },
  { name: 'Sabastian Harsh', num: '94', pos: 'DE', ht: '6-2', wt: '255', exp: 'R', college: 'N.C. State', status: 'Rookie', note: 'Camp edge body.' },
  { name: 'Mario Edwards', num: '97', pos: 'DT', ht: '6-3', wt: '280', exp: 11, college: 'Florida State', status: 'Veteran DT', note: 'Experienced interior when active on the 90.' },

  // ===== LB =====
  { name: 'Azeez Al-Shaair', num: '0', pos: 'LB', ht: '6-2', wt: '228', exp: 8, college: 'Florida Atlantic', status: 'MIKE leader', note: 'Defensive communicator and tackle machine.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/3915373/azeez-al-shaair' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/A/AlShAz00.htm' }
  ] },
  { name: 'Henry To\'oTo\'o', num: '39', pos: 'LB', ht: '6-2', wt: '228', exp: 4, college: 'Alabama', status: 'Starter LB', note: 'Range and coverage ability in the second level.' },
  { name: 'E.J. Speed', num: '45', pos: 'LB', ht: '6-4', wt: '227', exp: 8, college: 'Tarleton State', status: 'WILL / depth', note: 'Veteran speed and ST value.' },
  { name: 'Marte Mapu', num: '14', pos: 'LB', ht: '6-3', wt: '230', exp: 2, college: '—', status: 'LB / hybrid', note: 'Athletic hybrid linebacker.' },
  { name: 'Jamal Hill', num: '56', pos: 'LB', ht: '6-0', wt: '226', exp: 3, college: 'Oregon', status: 'Depth / ST', note: 'Special teams and LB depth.' },
  { name: 'K.C. Ossai', num: '52', pos: 'LB', ht: '6-2', wt: '241', exp: 1, college: 'Louisiana', status: 'Young LB', note: 'Developmental linebacker.' },
  { name: 'Aiden Fisher', num: '59', pos: 'LB', ht: '6-1', wt: '231', exp: 'R', college: 'Indiana', status: 'Rookie', note: 'Camp LB evaluation.' },
  { name: 'Jake Hansen', num: '35', pos: 'LB', ht: '6-1', wt: '230', exp: 5, college: 'Illinois', status: 'ST / depth', note: 'Special teams core candidate.' },
  { name: 'Jacob Hummel', num: '33', pos: 'LB', ht: '6-1', wt: '229', exp: 5, college: 'Iowa State', status: 'ST / depth', note: 'Veteran special teamer.' },
  { name: 'Wade Woodaz', num: '30', pos: 'LB', ht: '6-2', wt: '230', exp: 'R', college: '—', status: 'Rookie', note: 'Camp linebacker.' },
  { name: 'Sione Takitaki', num: '47', pos: 'LB', ht: '6-1', wt: '238', exp: 7, college: 'BYU', status: 'Veteran LB', note: 'Experienced depth when on the active roster.' },

  // ===== DB =====
  { name: 'Derek Stingley Jr.', num: '24', pos: 'CB', ht: '6-1', wt: '195', exp: 5, college: 'LSU', status: 'CB1', note: 'Shutdown corner and tone-setter.', links: [
    { label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/4430001/derek-stingley-jr' },
    { label: 'Pro Football Reference', url: 'https://www.pro-football-reference.com/players/S/StinDe00.htm' }
  ] },
  { name: 'Kamari Lassiter', num: '3', pos: 'CB', ht: '6-0', wt: '180', exp: 2, college: 'Georgia', status: 'CB2', note: 'Young starter opposite Stingley.' },
  { name: 'Jalen Pitre', num: '5', pos: 'S', ht: '6-0', wt: '200', exp: 5, college: 'Baylor', status: 'SS / nickel', note: 'Versatile safety and box defender.' },
  { name: 'Calen Bullock', num: '2', pos: 'S', ht: '6-3', wt: '190', exp: 3, college: 'USC', status: 'FS', note: 'Range and ball skills in the back end.' },
  { name: 'Reed Blankenship', num: '6', pos: 'S', ht: '6-1', wt: '203', exp: 5, college: 'Middle Tennessee', status: 'Safety depth', note: 'Veteran safety with starting experience.' },
  { name: 'Tremon Smith', num: '11', pos: 'CB', ht: '5-11', wt: '190', exp: 9, college: 'Central Arkansas', status: 'ST / depth', note: 'Special teams ace and CB depth.' },
  { name: 'Jaylin Smith', num: '22', pos: 'CB', ht: '5-11', wt: '190', exp: 2, college: 'USC', status: 'CB depth', note: 'Young corner competing for snaps.' },
  { name: 'Brandon Codrington', num: '17', pos: 'CB', ht: '5-9', wt: '185', exp: 3, college: 'North Carolina Central', status: 'Nickel / ST', note: 'Slot and return flexibility.' },
  { name: 'Ja\'Marcus Ingram', num: '20', pos: 'CB', ht: '6-2', wt: '190', exp: 3, college: 'Buffalo', status: 'CB depth', note: 'Length on the outside.' },
  { name: 'Alijah Huzzie', num: '28', pos: 'CB', ht: '5-10', wt: '195', exp: 1, college: 'North Carolina', status: 'Young CB', note: 'Developmental corner.' },
  { name: 'Jaylen Reed', num: '23', pos: 'S', ht: '6-0', wt: '212', exp: 2, college: 'Penn State', status: 'Safety depth', note: 'Young safety depth.' },
  { name: 'Kamari Ramsey', num: '27', pos: 'S', ht: '6-0', wt: '204', exp: 'R', college: 'USC', status: 'Rookie S', note: 'Camp safety evaluation.' },
  { name: 'Kaevon Merriweather', num: '21', pos: 'S', ht: '6-0', wt: '210', exp: 2, college: '—', status: 'Safety depth', note: 'Competing for a safety spot.' },
  { name: 'M.J. Stewart', num: '29', pos: 'S', ht: '5-11', wt: '205', exp: 9, college: 'North Carolina', status: 'Veteran DB', note: 'Experienced defensive back depth.' },
  { name: 'Stephen Hall', num: '41', pos: 'CB', ht: '6-0', wt: '202', exp: 'R', college: 'Missouri', status: 'Rookie CB', note: 'Camp corner.' },
  { name: 'Collin Wright', num: '37', pos: 'CB', ht: '6-0', wt: '190', exp: 'R', college: '—', status: 'Rookie', note: 'Camp CB body.' },

  // ===== ST =====
  { name: 'Ka\'imi Fairbairn', num: '15', pos: 'K', ht: '6-0', wt: '183', exp: 11, college: 'UCLA', status: 'Kicker', note: 'Reliable veteran. Leg strength and accuracy remain high.' },
  { name: 'Kai Kroeger', num: '38', pos: 'P', ht: '6-4', wt: '213', exp: 2, college: 'South Carolina', status: 'Punter', note: 'Primary punter. Hang time and directional control.' },
  { name: 'Jack Stonehouse', num: '36', pos: 'P', ht: '6-1', wt: '215', exp: 'R', college: 'Syracuse', status: 'Punter battle', note: 'Competing for the punting job in camp/preseason.' },
  { name: 'Austin Brinkman', num: '40', pos: 'LS', ht: '6-4', wt: '241', exp: 2, college: 'West Virginia', status: 'Long snapper', note: 'Steady long snapper.' }
];



/* ============================================================
   LIVE ROSTER + MIN-SIZE GUARD (v15.10)
   Source order: ESPN live → offline cache → baked FULL_ROSTER
   Integrity: warn if active list is thinner than expected phase
   ============================================================ */

const OL_POS = new Set(['T','G','C','OL','OT','OG','OC','G/C','C/G','OT/G','T/G']);
function isOffensiveLinePos(pos) {
  const raw = String(pos || '').toUpperCase().replace(/\s+/g, '');
  if (!raw) return false;
  if (OL_POS.has(raw)) return true;
  if (raw === 'LS' || raw === 'K' || raw === 'P') return false;
  // slash combos that are still line only
  if (/^(OT|OG|OC|T|G|C|OL)[\/\-](OT|OG|OC|T|G|C|OL)$/.test(raw)) return true;
  return false;
}

const ROSTER_CACHE_KEY = 'texans-hq-roster-cache-v1';
const ROSTER_ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/34/roster';
/** Camp ~90; after final cuts expect >= 53 active-style names */
const ROSTER_MIN_CAMP = 80;
const ROSTER_MIN_REGULAR = 50;

/** Working roster used by UI — always start from baked list */
let ACTIVE_ROSTER = FULL_ROSTER.slice();
let ROSTER_META = { source: 'baked', savedAt: null, count: FULL_ROSTER.length, warning: null };

function heightInToStr(inches) {
  if (inches == null || isNaN(inches)) return '—';
  const n = Math.round(Number(inches));
  return Math.floor(n / 12) + '-' + (n % 12);
}

function normalizeEspnAthlete(it) {
  const pos = (it.position && it.position.abbreviation) || '—';
  const years = it.experience && typeof it.experience.years === 'number' ? it.experience.years : null;
  const exp = years === 0 ? 'R' : (years != null ? years : '—');
  const college = (it.college && (it.college.shortName || it.college.name)) || '';
  const statusName = (it.status && (it.status.abbreviation || it.status.name)) || 'Active';
  const ht = it.displayHeight
    ? String(it.displayHeight).replace("'", '-').replace('"', '').replace(/\s/g, '')
    : heightInToStr(it.height);
  const wt = it.displayWeight
    ? String(it.displayWeight).replace(/\s*lbs?/i, '')
    : (it.weight != null ? String(Math.round(it.weight)) : '—');
  const id = it.id ? String(it.id) : '';
  const links = id
    ? [{ label: 'ESPN', url: 'https://www.espn.com/nfl/player/_/id/' + id + '/' + String(it.displayName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') }]
    : [];
  return {
    name: it.displayName || ((it.firstName || '') + ' ' + (it.lastName || '')).trim(),
    num: it.jersey != null ? String(it.jersey) : '',
    pos: pos,
    ht: ht,
    wt: wt,
    exp: exp,
    college: college,
    status: statusName,
    note: '',
    espnId: id,
    links: links,
    source: 'espn'
  };
}

function mergeRosterNotes(liveList, localList) {
  const byName = {};
  (localList || []).forEach(function (p) {
    byName[String(p.name || '').toLowerCase()] = p;
  });
  return (liveList || []).map(function (live) {
    const local = byName[String(live.name || '').toLowerCase()];
    if (!local) return live;
    const merged = Object.assign({}, live);
    if (local.note) merged.note = local.note;
    if (local.aliases) merged.aliases = local.aliases;
    if (local.status && (!live.status || live.status === 'Active')) merged.status = local.status;
    // Prefer richer local links + ESPN
    const links = [];
    const seen = {};
    (local.links || []).concat(live.links || []).forEach(function (L) {
      if (!L || !L.url || seen[L.url]) return;
      seen[L.url] = true;
      links.push(L);
    });
    if (links.length) merged.links = links;
    return merged;
  });
}

function rosterIntegrityCheck(list) {
  const arr = list || [];
  const n = arr.length;
  const nextG = typeof getNextGame === 'function' ? getNextGame() : null;
  const min = (nextG && nextG.type === 'reg') ? ROSTER_MIN_REGULAR : ROSTER_MIN_CAMP;
  const names = new Set(arr.map(function (p) { return p && p.name; }));
  const missing = (typeof REQUIRED_ROSTER_NAMES !== 'undefined' ? REQUIRED_ROSTER_NAMES : []).filter(function (n) {
    return !names.has(n);
  });
  if (n < min) {
    return {
      ok: false,
      warning: 'Roster integrity warning: only ' + n + ' players loaded (expected ≥' + min + ' in camp/preseason). Tap Refresh. Missing critical names: ' + (missing.length ? missing.join(', ') : 'n/a')
    };
  }
  if (missing.length) {
    return {
      ok: false,
      warning: 'Roster integrity warning: missing required player(s): ' + missing.join(', ') + '. Tap Refresh to pull the live ESPN list.'
    };
  }
  return { ok: true, warning: null };
}

function applyActiveRoster(list, source, savedAt) {
  ACTIVE_ROSTER = (list && list.length) ? list.slice() : FULL_ROSTER.slice();
  const integrity = rosterIntegrityCheck(ACTIVE_ROSTER);
  ROSTER_META = {
    source: source || 'baked',
    savedAt: savedAt || null,
    count: ACTIVE_ROSTER.length,
    warning: integrity.warning
  };
  return integrity;
}

function readRosterCache() {
  try {
    const raw = localStorage.getItem(ROSTER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const need = (CACHE_SCHEMA && CACHE_SCHEMA.roster) || 1;
    if (!parsed || parsed._schema !== need) {
      localStorage.removeItem(ROSTER_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch (e) { return null; }
}

function writeRosterCache(players) {
  try {
    localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify({
      _schema: (CACHE_SCHEMA && CACHE_SCHEMA.roster) || 1,
      savedAt: Date.now(),
      count: (players || []).length,
      players: players
    }));
  } catch (e) { /* quota / private mode */ }
}

async function fetchLiveRoster() {
  const res = await fetch(espnUrl(ROSTER_ESPN_URL), espnFetchOpts());
  if (!res.ok) throw new Error('Roster HTTP ' + res.status);
  const data = await res.json();
  const items = [];
  (data.athletes || []).forEach(function (g) {
    (g.items || []).forEach(function (it) { items.push(normalizeEspnAthlete(it)); });
  });
  if (!items.length) throw new Error('Empty roster payload');
  return mergeRosterNotes(items, FULL_ROSTER);
}

/**
 * Load order: live ESPN → cache → baked.
 * Always runs integrity check. Safe to call on boot and on Refresh.
 */
async function loadRoster(forceNetwork) {
  let list = null;
  let source = 'baked';
  let savedAt = null;

  if (forceNetwork !== false) {
    try {
      list = await fetchLiveRoster();
      source = 'espn';
      savedAt = Date.now();
      writeRosterCache(list);
    } catch (e) {
      /* fall through */
    }
  }

  if (!list || !list.length) {
    const cached = readRosterCache();
    if (cached && cached.players && cached.players.length) {
      list = mergeRosterNotes(cached.players, FULL_ROSTER);
      source = 'cache';
      savedAt = cached.savedAt || null;
    }
  }

  if (!list || !list.length) {
    list = FULL_ROSTER.slice();
    source = 'baked';
  }

  applyActiveRoster(list, source, savedAt);
  return ROSTER_META;
}

function rosterSourceLabel() {
  const m = ROSTER_META || {};
  if (m.source === 'espn') return 'Live ESPN · ' + m.count + ' players' + (m.savedAt ? ' · ' + timeAgo(m.savedAt) : '');
  if (m.source === 'cache') return 'Offline cache · ' + m.count + ' players' + (m.savedAt ? ' · saved ' + timeAgo(m.savedAt) : '');
  return 'Built-in list · ' + m.count + ' players';
}


/* Game-level insights for Schedule (preseason / season) — public lines + matchup notes */
const GAME_INSIGHTS = {
  LAC: {
    favorite: 'LAC',
    line: 'Chargers −2 (preseason consensus)',
    ou: 'O/U ~38.5 (preseason)',
    note: 'Preseason Week 1 is evaluation first. Starter snaps limited; depth and ST often decide the scoreboard.',
    keys: ['Stroud clean in limited series', 'OL communication (Teller / Rutledge)', 'Anderson–Clowney early pressure', 'ST tackle consistency']
  },
  LV: {
    favorite: 'HOU',
    line: 'Texans favored (home preseason)',
    ou: '—',
    note: 'Preseason Week 2 often features more extended evaluation of the middle of the roster.',
    keys: ['Depth OL continuity', 'Secondary vs vertical shots', 'Return game discipline']
  },
  CAR: {
    favorite: 'HOU',
    line: 'Texans slight road edge (preseason)',
    ou: '—',
    note: 'Final preseason tune-up before cuts. Focus on players fighting for the 53.',
    keys: ['Bubble players on ST', 'No major injuries', 'Clean operation from backups']
  },
  BUF: {
    favorite: 'BUF',
    line: 'Bills favored (AFC benchmark)',
    ou: '—',
    note: 'Regular-season measuring stick. Protection and explosives allowed are the early dominos.',
    keys: ['Protect Stroud vs edge', 'Limit Buffalo explosives', 'Red-zone finish']
  },
  DEFAULT: {
    favorite: '—',
    line: 'Line posts closer to kickoff',
    ou: '—',
    note: 'Matchup notes and market lines fill in as the week approaches.',
    keys: ['Protection', 'Early downs', 'Explosives']
  }
};

/* What to watch this week */
const WATCH_THIS_WEEK = [
  { title: 'Protect Stroud vs Buffalo edges', detail: 'Week 1 home vs BUF. Higgins is out for the year; RT plan is without Braden Smith (IR). Pocket and early downs decide the path.' },
  { title: 'WR room without Higgins', detail: 'Collins is WR1. Hutchinson / Noel / Dell / Watson (and Boutte if active) share the vacated WR2 work. Do not lean on Higgins in any live call.' },
  { title: 'Edge pressure package', detail: 'Anderson + Hunter + Clowney rotation — how often two of them are on the field on obvious passing downs.' },
  { title: 'Run-game efficiency', detail: 'Montgomery early-down success sets up play-action. Short-yardage is a Week 1 identity tell.' },
  { title: 'TV', detail: 'Week 1 vs BUF is CBS, Sunday Sept 13, 12:00 CT at NRG.' }
];

/* Recent history vs opponents (public-style sample) */
const OPPONENT_HISTORY = {
  BUF: [
    { year: '2024', result: 'L', score: '20-24', note: 'Home' },
    { year: '2023', result: 'L', score: '22-31', note: 'Away' }
  ],
  LAC: [
    { year: '2025', result: 'W', score: '32-27', note: 'Sample prior' },
    { year: '2022', result: 'L', score: '24-27', note: 'Away' }
  ],
  DEFAULT: [
    { year: '—', result: '', score: 'No recent listed', note: 'Will fill as season progresses' }
  ]
};

let liveRefreshTimer = null;

/* Sample completed game recap (demo) */
/* SAMPLE_RECAP removed — no demo recap */

/* ---------- State ---------- */
let currentSection = 'game';
let selectedGame = null;

/* ---------- DOM helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- Navigation ---------- */
function showSection(id) {
  currentSection = id;
  $$('.section').forEach((s) => s.classList.remove('active'));
  $(`#sec-${id}`).classList.add('active');
  $$('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.sec === id);
  });
  if (id === 'pbp') renderPBP();
  if (id === 'news') loadNews(false);
  if (id === 'camp') loadCamp(false);
  if (id === 'stats') renderStats();
  if (id === 'roster') renderRoster();
  if (id === 'videos') loadVideos(false);
  if (id === 'notes' && typeof updateBackupStatusLine === 'function') updateBackupStatusLine();
}


$$('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => showSection(btn.dataset.sec));
});

/* ---------- Schedule ---------- */
function renderSchedule() {
  if (typeof bindSchedToggle === 'function') bindSchedToggle();
  if (typeof renderWatchStrips === 'function') renderWatchStrips();
  if (typeof schedView !== 'undefined' && schedView === 'texans' && typeof renderTexansSchedule === 'function') {
    renderTexansSchedule();
    return;
  }
  if (typeof renderWeekSchedule === 'function') {
    renderWeekSchedule();
    return;
  }
  const list = $('#scheduleList');
  if (!list) return;
  list.innerHTML = '';
  const now = new Date();

  // Find the single true next game (first future game with no result)
  let nextIdx = -1;
  SCHEDULE_2026.forEach((g, idx) => {
    if (nextIdx >= 0 || g.type === 'bye' || !g.date || g.result) return;
    const d = new Date(g.date + 'T' + (g.time || '12:00') + ':00');
    if (d > now) nextIdx = idx;
  });

  SCHEDULE_2026.forEach((g, idx) => {
    if (g.type === 'bye') {
      const row = document.createElement('div');
      row.className = 'game-row';
      row.innerHTML = `<div class="game-date"><span class="day">BYE</span></div>
        <div class="game-info"><div class="game-opp">Week 8 — Bye Week</div></div>
        <div class="game-week">Wk 8</div>`;
      list.appendChild(row);
      return;
    }

    const d = new Date(g.date + 'T' + (g.time || '12:00') + ':00');
    const isNext = idx === nextIdx;

    const row = document.createElement('div');
    row.className = 'game-row' + (isNext ? ' is-next' : '');
    row.dataset.idx = idx;

    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });

    // Right side: result if played, otherwise week number. NEXT badge only on true next (near opponent).
    let rightHtml = '';
    if (g.result) {
      const cls = g.result.startsWith('W') ? 'w' : g.result.startsWith('L') ? 'l' : 't';
      rightHtml = `<div class="game-result ${cls}">${g.result}</div>`;
    } else {
      const weekLabel = g.type === 'pre' ? g.week : ('Wk ' + g.week);
      rightHtml = `<div class="game-week">${weekLabel}</div>`;
    }

    row.innerHTML = `
      <div class="game-date">
        <span class="day">${weekday}</span>
        ${monthDay}
      </div>
      <div class="game-info">
        <div class="game-opp">${g.home ? 'vs' : '@'} ${g.opp}${isNext ? ' <span class="next-badge">NEXT</span>' : ''}</div>
        <div class="game-meta">${g.type === 'pre' ? 'Preseason' : 'Week ' + g.week}${g.note ? ' · ' + g.note : ''} · ${g.time ? formatTime(g.time) : ''}${g.tv ? ' · <span class="tv-badge' + (g.tv === 'Prime Video' ? ' prime' : '') + '">' + g.tv + '</span>' : ''}</div>
      </div>
      ${rightHtml}
    `;

    row.addEventListener('click', () => {
      selectedGame = g;
      showSection('schedule');
      renderScheduleDetail(g);
    });

    list.appendChild(row);
  });
}


/** Schedule game detail — insights, line, keys, then optional Plays */
function renderScheduleDetail(g) {
  const list = $('#scheduleList');
  if (!list || !g) return;
  const insight = GAME_INSIGHTS[g.oppAbbr] || GAME_INSIGHTS.DEFAULT;
  const favLabel = insight.favorite === 'HOU' ? 'Houston favored' :
    insight.favorite === '—' ? 'Line TBD' :
    insight.favorite + ' favored';
  list.innerHTML = `
    <button type="button" class="section-back" id="schedBackBtn">← Back to schedule</button>
    <div class="game-detail-card">
      <div class="game-detail-title">${g.home ? 'vs' : '@'} ${g.opp}</div>
      <div class="small" style="margin:4px 0 10px">${g.type === 'pre' ? 'Preseason' : 'Week ' + g.week}${g.note ? ' · ' + g.note : ''} · ${g.date || ''}${g.time ? ' · ' + formatTime(g.time) : ''}${g.tv ? ' · ' + g.tv : ''}</div>
      <div class="insight-grid">
        <div class="insight-chip"><span class="insight-label">Market</span><strong>${favLabel}</strong></div>
        <div class="insight-chip"><span class="insight-label">Line</span><strong>${insight.line}</strong></div>
        <div class="insight-chip"><span class="insight-label">Total</span><strong>${insight.ou}</strong></div>
      </div>
      <p class="small" style="margin:10px 0 8px">${insight.note}</p>
      <div class="small" style="font-weight:700;margin-bottom:4px">What to watch</div>
      <ul class="opp-bullets">${(insight.keys || []).map(k => '<li>' + k + '</li>').join('')}</ul>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button type="button" class="btn" id="schedOpenPlays">Open Plays</button>
        <button type="button" class="btn secondary" id="schedOpenGame">Game Center</button>
      </div>
      <p class="tend-note" style="margin-top:10px">Lines are public consensus for discussion only — not betting advice. Preseason lines move and often mean less than evaluation snaps.</p>
    </div>
  `;
  const back = $('#schedBackBtn');
  if (back) back.addEventListener('click', () => { selectedGame = null; renderSchedule(); });
  const plays = $('#schedOpenPlays');
  if (plays) plays.addEventListener('click', () => { showSection('pbp'); renderPBP(); });
  const gc = $('#schedOpenGame');
  if (gc) gc.addEventListener('click', () => {
    if (g && g.eventId && typeof setCurrentGame === 'function') setCurrentGame(g, g.hasHou ? 'HOU' : (typeof defaultFocusForGame === 'function' ? defaultFocusForGame(g) : 'HOU'));
    showSection('game');
    refreshLiveGame().then(function () { renderGameCenter(); });
  });
}

function formatTime(t) {
  if (!t || typeof t !== 'string' || t.indexOf(':') < 0) return t || '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm} CT`;
}

/* ---------- Game Center + Countdown ---------- */
function getNextGame() {
  const now = new Date();
  return SCHEDULE_2026.find((g) => g.date && new Date(g.date + 'T' + (g.time || '12:00') + ':00') > now);
}


function stopLiveRefresh() {
  if (liveRefreshTimer) {
    clearInterval(liveRefreshTimer);
    liveRefreshTimer = null;
  }
}

function startLiveRefresh() {
  stopLiveRefresh();
  if (typeof LIVE_DEMO !== 'undefined') LIVE_DEMO.active = false;
}

function formatClock(totalSec) {
  totalSec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ':' + s.toString().padStart(2, '0');
}

/* Special-teams range from yards-to-goal for the team WITH the ball.
   Approx kick length ≈ toGoal + 17 (snap + end zone). */
function fgRangeLabel(yardSide, yardNum, toGoalOpt) {
  let toGoal = (typeof toGoalOpt === 'number' && Number.isFinite(toGoalOpt))
    ? toGoalOpt
    : (yardSide === 'opp' ? Number(yardNum) : (100 - Number(yardNum)));
  if (!Number.isFinite(toGoal)) return { text: '', cls: 'fg-far', hide: true };
  if (toGoal <= 20) return { text: 'RZ · FG', cls: 'fg-in' };
  if (toGoal <= 33) return { text: 'FG range (~' + (toGoal + 17) + ' yd)', cls: 'fg-in' };
  if (toGoal <= 40) return { text: 'Long FG (~' + (toGoal + 17) + ' yd)', cls: 'fg-long' };
  return { text: '', cls: 'fg-far', hide: true };
}

function timeAgo(ts) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return sec + 's ago';
  const m = Math.floor(sec / 60);
  if (m < 60) return m + 'm ago';
  return Math.floor(m / 60) + 'h ago';
}



function renderWinProbCard() {
  const card = $('#winProbCard');
  const el = $('#winProbContent');
  if (!card || !el) return;
  if (!LIVE_DEMO.active) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  const series = WP_SERIES_DEMO;
  const last = series[series.length - 1].hou;
  const w = 280, h = 64, pad = 4;
  const maxT = series[series.length - 1].t || 1;
  const pts = series.map((p) => {
    const x = pad + (p.t / maxT) * (w - pad * 2);
    const y = pad + (1 - p.hou / 100) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  el.innerHTML = `
    <div class="wp-header">
      <span>HOU win %</span>
      <span class="wp-pct">${last}%</span>
    </div>
    <svg class="wp-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Simplified win probability chart">
      <polyline fill="none" stroke="#03202F" stroke-width="2.5" points="${pts}" />
      <line x1="${pad}" y1="${h/2}" x2="${w-pad}" y2="${h/2}" stroke="#E2E6EA" stroke-width="1" />
    </svg>
    <div class="wp-note">Simplified model (score + time + field tilt) — not ESPN’s official number.</div>
    <div class="live-updated" id="liveUpdatedAt">Updated ${new Date().toLocaleTimeString()}</div>
  `;
}

function renderWatchWeekCard() {
  const el = $('#watchWeekContent');
  if (!el) return;
  const f = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  const wch = typeof getCurrentWatch === 'function' ? getCurrentWatch() : null;
  if (wch && f !== 'HOU') {
    const g = (typeof gameByEventId === 'function' && gameByEventId(wch.eventId)) || wch;
    const insight = (typeof insightForLeagueGame === 'function') ? insightForLeagueGame(g) : null;
    const keys = (insight && insight.keys) || ['Protect the QB', 'Early downs', 'Explosives', 'Hidden yardage'];
    el.innerHTML = keys.map(function (k) {
      return '<div class="watch-item"><strong>' + k + '</strong></div>';
    }).join('');
    return;
  }
  el.innerHTML = WATCH_THIS_WEEK.map(w =>
    `<div class="watch-item"><strong>${w.title}</strong><br>${w.detail}</div>`
  ).join('');
}

function renderHistoryCard() {
  const el = $('#historyContent');
  if (!el) return;
  let abbr = 'BUF';
  const f = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.oppAbbr && LIVE_GAME.oppAbbr !== 'OPP') abbr = LIVE_GAME.oppAbbr;
  else if (LIVE_DEMO.active) abbr = LIVE_DEMO.oppAbbr;
  else {
    const next = getNextGame();
    if (next) abbr = next.oppAbbr;
  }
  const rec = (typeof scoutRecap === 'function') ? scoutRecap(abbr) : null;
  const five = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.lastFive) ? LIVE_GAME.lastFive : null;
  if (five && five.length) {
    let html = '';
    five.forEach(function (block) {
      const team = (block.team && (block.team.abbreviation || block.team.displayName)) || '';
      html += '<div class="small" style="font-weight:700;margin:8px 0 4px">' + team + ' — last five</div>';
      (block.events || []).slice(0, 5).forEach(function (ev) {
        const at = (ev.atVs || '') + ' ' + ((ev.opponent && (ev.opponent.abbreviation || ev.opponent.displayName)) || '');
        const res = (ev.gameResult || ev.result || '');
        const sc = ev.score || '';
        html += '<div class="hist-row"><span>' + at + '</span><span class="hist-result">' + res + ' ' + sc + '</span></div>';
      });
    });
    if (rec) html += '<p class="tend-note">Your file: ' + rec.n + ' watched (' + rec.w + '-' + rec.l + ').</p>';
    el.innerHTML = html;
    return;
  }
  if (rec && rec.n) {
    const rows = (scoutTeam(abbr).rec.games || []).slice().reverse().slice(0, 6);
    el.innerHTML = rows.map(function (g) {
      return '<div class="hist-row"><span>' + (g.date || '') + ' vs ' + (g.opp || '') + '</span><span class="hist-result ' + String(g.result || '').toLowerCase() + '">' + (g.result || '') + ' ' + (g.ourScore || 0) + '-' + (g.oppScore || 0) + '</span></div>';
    }).join('') + '<p class="tend-note">Games you actually watched on this device.</p>';
    return;
  }
  if (f === 'HOU') {
    const rows = OPPONENT_HISTORY[abbr] || OPPONENT_HISTORY.DEFAULT;
    el.innerHTML = rows.map(r => `
    <div class="hist-row">
      <span>${r.year} · ${r.note}</span>
      <span class="hist-result ${r.result.toLowerCase()}">${r.result} ${r.score}</span>
    </div>
  `).join('') + `<p class="tend-note">Sample public-style results for layout — verify official records.</p>`;
    return;
  }
  el.innerHTML = '<div class="empty">History fills after you watch this club, and from the live feed’s last-five when available.</div>';
}

function renderDepthChart() {
  const el = $('#depthChart');
  if (!el) return;
  const block = (title, units) => `
    <div class="depth-unit">
      <h4>${title}</h4>
      ${units.map(u => `
        <div class="small" style="margin:4px 0 2px;font-weight:600">${u.unit}</div>
        <div class="depth-line">
          ${u.players.map((name, i) =>
            `<button type="button" class="depth-chip${i === 0 ? ' starter' : ''}" data-depth-name="${String(name).replace(/"/g, '&quot;')}">${name}</button>`
          ).join('')}
        </div>
      `).join('')}
    </div>`;
  el.innerHTML = block('Offense', DEPTH_CHART.offense) + block('Defense', DEPTH_CHART.defense) +
    `<div id="depthDetail" class="player-detail hidden"></div>` +
    `<p class="tend-note">Tap a name for a short note when available. Simplified starters-first view — not an official depth chart.</p>`;

  el.querySelectorAll('[data-depth-name]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-depth-name') || '';
      const detail = document.getElementById('depthDetail');
      if (!detail) return;
      const exact = KEY_PLAYERS.find((x) => x.name === name);
      const hit = exact || KEY_PLAYERS.find((x) => name.includes(x.name) || x.name.includes(name));
      detail.classList.remove('hidden');
      if (hit) {
        detail.innerHTML = `<strong>${hit.name}</strong> · ${hit.pos}${hit.num && hit.num !== '—' ? ' #' + hit.num : ''}<br><span class="small">${hit.note}</span><br>${hit.detail || hit.stats || ''}`;
      } else {
        detail.innerHTML = `<strong>${name}</strong><br><span class="small">No extended card for this roster line yet — placeholder depth only.</span>`;
      }
    });
  });
}

function renderGameCenter() {
  const content = $('#gameCenterContent');
  if (!content) return;
  const modePill = $('#gameModePill');
  const tendencyCard = $('#tendencyCard');
  const efficiencyCard = $('#efficiencyCard');
  const driveCard = $('#driveCard');
  const injuryCard = $('#injuryCard');
  const opponentCard = $('#opponentCard');
  const recapCard = $('#recapCard');
  const upcomingCard = $('#upcomingCard');

  try { if (typeof renderWatchStrips === 'function') renderWatchStrips(); } catch (e) {}
  try { renderInjuryCard(); } catch (e) { /* never block Game Center */ }
  try { renderOpponentCard(); } catch (e) { /* never block Game Center */ }
  try { renderWatchWeekCard(); } catch (e) { /* never block Game Center */ }
  try { renderHistoryCard(); } catch (e) { /* never block Game Center */ }

  // ---- REAL LIVE GAME (ESPN feed) ----
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.active) {
    const backupRemLive = $('#backupReminder');
    if (backupRemLive) backupRemLive.style.display = 'none';
    if (modePill) {
      const ph = currentScoringPhase();
      modePill.textContent = ph === 'pre' ? 'LIVE · PRE LAB' : (ph === 'post' ? 'LIVE · POST' : 'LIVE');
      modePill.classList.add('live');
    }
    const possHou = typeof isFocusPossession === 'function' ? isFocusPossession(LIVE_GAME) : LIVE_GAME.possession === 'HOU';
    const fg = fgRangeLabel(LIVE_GAME.yardSide || 'own', LIVE_GAME.yardNum || 50, LIVE_GAME.toGoal);
    const downLabel = LIVE_GAME.special
      ? LIVE_GAME.special
      : (LIVE_GAME.down > 0
          ? (ordSuffix(LIVE_GAME.down) + ' & ' + (LIVE_GAME.distance === 0 ? 'Goal' : LIVE_GAME.distance))
          : 'Between plays');
    content.innerHTML = `
      <div class="score-row">
        <div class="team-block">
          <div class="team-abbr">${typeof focusAbbr === 'function' ? focusAbbr() : 'HOU'}</div>
          <div class="team-score home">${LIVE_GAME.houScore}</div>
        </div>
        <div class="vs-clock">
          <div style="font-size:1rem;font-weight:700;color:var(--danger)">LIVE</div>
          <div style="margin-top:4px">Q${LIVE_GAME.qtr} · <span id="liveGameClock">${LIVE_GAME.clockDisplay || formatClock(LIVE_GAME.clockSeconds)}</span></div>
        </div>
        <div class="team-block">
          <div class="team-abbr">${LIVE_GAME.oppAbbr}</div>
          <div class="team-score">${LIVE_GAME.oppScore}</div>
        </div>
      </div>
      <div class="possession-row">
        <div class="possession-pill ${possHou ? '' : 'away'}">${possHou ? ((typeof focusAbbr === 'function' ? focusAbbr() : 'HOU') + ' BALL') : LIVE_GAME.oppAbbr + ' BALL'}</div>
      </div>
      <div class="situation-bar">
        <span><strong>${downLabel}</strong></span>
        <span>${LIVE_GAME.yardline || '—'}</span>
        ${fg.hide ? '' : '<span class="fg-pill ' + fg.cls + '">' + fg.text + '</span>'}
      </div>
      <div class="live-updated" id="dataFreshness">Live feed · ${timeAgo(LIVE_GAME.lastUpdated || Date.now())}${currentScoringPhase() === 'pre' ? ' · preseason lab (official book off)' : ''}</div>
      ${isDockWindow() ? '' : '<div style="margin-top:10px"><button type="button" class="btn secondary" id="btnOpenDock">Pop out game dock</button></div>'}
    `;
    const dockBtn = $('#btnOpenDock');
    if (dockBtn) dockBtn.onclick = openGameDock;
    try {
      const wLive = typeof getCurrentWatch === 'function' ? getCurrentWatch() : null;
      if (wLive && typeof renderFocusPicker === 'function') {
        const gLive = (typeof gameByEventId === 'function' && gameByEventId(wLive.eventId)) || wLive;
        const holder = document.createElement('div');
        holder.innerHTML = renderFocusPicker(gLive);
        if (holder.firstChild) content.appendChild(holder.firstChild);
        if (typeof bindFocusPills === 'function') bindFocusPills(gLive);
      }
    } catch (e) {}
    // Possession mirror: HOU ball → Texans cards; Opp ball → opponent cards + defensive Dominos
    if (tendencyCard) tendencyCard.style.display = possHou ? '' : 'none';
    if (possHou) {
      hideOppCards();
      try {
        const tc = $('#tendencyContent');
        const tTitle = $('#tendencyCardTitle');
        if (tTitle) tTitle.textContent = 'Offensive tendency (' + (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU') + ' ball)';
        if (tc && typeof predictOppTendency === 'function') {
          // Reuse fingerprint engine with HOU prior for consistent pass/run bars
          const t = predictOppTendency(Object.assign({}, LIVE_GAME, { oppAbbr: 'HOU' }));
          // Invert naming: this is HOU on offense
          tc.innerHTML =
            '<div class="tendency-bars">' +
              '<div class="tend-row"><span class="tend-label">Pass</span><div class="tend-track"><div class="tend-fill pass" style="width:' + t.passP + '%"></div></div><span class="tend-pct">' + t.passP + '%</span></div>' +
              '<div class="tend-row"><span class="tend-label">Run</span><div class="tend-track"><div class="tend-fill run" style="width:' + t.runP + '%"></div></div><span class="tend-pct">' + t.runP + '%</span></div>' +
            '</div>' +
            '<div class="tend-note" style="margin-top:8px"><strong>' + t.primary + '</strong> — situational HOU prior (' + t.family + '). Live plays rewrite Dominos.</div>';
        }
      } catch (e) { /* keep card visible even if tendency fails */ }
    } else {
      if (typeof renderOppTendencyCard === 'function') renderOppTendencyCard(LIVE_GAME);
      if (typeof renderOppNextPlayLean === 'function') renderOppNextPlayLean(LIVE_GAME);
    }
    renderDominosCard('live');
    const nextPlayCard = $('#nextPlayCard');
    if (nextPlayCard) {
      nextPlayCard.style.display = possHou ? '' : 'none';
      if (possHou && typeof renderNextPlayLean === 'function') {
        try { renderNextPlayLean(); } catch (e) { /* ok */ }
      }
    }
    if (efficiencyCard) efficiencyCard.style.display = 'none';
    if (driveCard) driveCard.style.display = 'none';
    if (recapCard) recapCard.style.display = 'none';
    const winProbCardL = $('#winProbCard');
    if (winProbCardL) winProbCardL.style.display = 'none';
    if (injuryCard) injuryCard.style.display = '';
    if (opponentCard) opponentCard.style.display = '';
    return;
  }

  // ---- FINAL / POST-GAME ----
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.final) {
    if (typeof hideOppCards === 'function') hideOppCards();
    if (typeof renderBackupReminder === 'function') renderBackupReminder();
    if (modePill) {
      modePill.textContent = currentScoringPhase() === 'pre' ? 'Final · PRE LAB' : 'Final';
      modePill.classList.remove('live');
    }
    content.innerHTML = `
      <div class="score-row">
        <div class="team-block">
          <div class="team-abbr">${typeof focusAbbr === 'function' ? focusAbbr() : 'HOU'}</div>
          <div class="team-score home">${LIVE_GAME.houScore}</div>
        </div>
        <div class="vs-clock">
          <div style="font-size:1rem;font-weight:700;color:var(--navy)">FINAL</div>
          <div style="margin-top:4px">${LIVE_GAME.detail || ''}</div>
        </div>
        <div class="team-block">
          <div class="team-abbr">${LIVE_GAME.oppAbbr}</div>
          <div class="team-score">${LIVE_GAME.oppScore}</div>
        </div>
      </div>
    `;
    if (tendencyCard) tendencyCard.style.display = 'none';
    const nextPlayCardF = $('#nextPlayCard');
    if (nextPlayCardF) nextPlayCardF.style.display = 'none';
    if (efficiencyCard) efficiencyCard.style.display = 'none';
    if (driveCard) driveCard.style.display = 'none';
    if (recapCard) recapCard.style.display = 'none';
    renderDominosCard('postgame');
    if (injuryCard) injuryCard.style.display = '';
    if (opponentCard) opponentCard.style.display = '';
    return;
  }

  // LIVE_DEMO UI path permanently removed — only LIVE_GAME (real feed) shows live mode

  // Upcoming mode
  const backupRemUp = $('#backupReminder');
  if (backupRemUp) backupRemUp.style.display = 'none';
  if (modePill) {
    modePill.textContent = 'Upcoming';
    modePill.classList.remove('live');
  }
  stopLiveRefresh();
  if (tendencyCard) tendencyCard.style.display = 'none';
  if (typeof hideOppCards === 'function') hideOppCards();
  const nextPlayCardUp = $('#nextPlayCard');
  if (nextPlayCardUp) nextPlayCardUp.style.display = 'none';
  if (efficiencyCard) efficiencyCard.style.display = 'none';
  if (driveCard) driveCard.style.display = 'none';
  if (recapCard) recapCard.style.display = 'none';
  const winProbCard = $('#winProbCard');
  if (winProbCard) winProbCard.style.display = 'none';
  if (injuryCard) injuryCard.style.display = '';
  if (opponentCard) opponentCard.style.display = '';
  const watchWeekCard = $('#watchWeekCard');
  const historyCard = $('#historyCard');
  if (watchWeekCard) watchWeekCard.style.display = '';
  if (historyCard) historyCard.style.display = '';
  if (upcomingCard) upcomingCard.style.display = '';

  let next = null;
  if (typeof getCurrentWatch === 'function' && getCurrentWatch()) {
    const w = getCurrentWatch();
    const g = (typeof gameByEventId === 'function' && gameByEventId(w.eventId)) || w;
    const focus = w.focusAbbr || (typeof defaultFocusForGame === 'function' ? defaultFocusForGame(g) : (g.homeAbbr || 'HOU'));
    const opp = focus === g.homeAbbr ? g.awayAbbr : g.homeAbbr;
    const oppName = focus === g.homeAbbr ? (g.awayName || (typeof teamName === 'function' ? teamName(opp) : opp)) : (g.homeName || (typeof teamName === 'function' ? teamName(opp) : opp));
    next = {
      league: true, focusAbbr: focus, home: g.homeAbbr === focus, oppAbbr: opp, opp: oppName,
      date: g.date, time: g.time || null, timeLabel: g.timeLabel, tv: g.tv, type: g.type || 'reg',
      week: g.week, kickMs: g.kickMs, eventId: g.eventId, awayAbbr: g.awayAbbr, homeAbbr: g.homeAbbr,
      awayName: g.awayName, homeName: g.homeName
    };
  } else {
    next = getNextGame();
  }
  if (!next) {
    content.innerHTML = `<div class="empty">Pick a game on Sched — or wait for the next Texans kickoff.</div>`;
    const dominosCardNone = $('#dominosCard');
    if (dominosCardNone) dominosCardNone.style.display = 'none';
    return;
  }
  // Pre-game Dominos path for the upcoming opponent (visible before kickoff)
  renderDominosCard('pregame', next.oppAbbr);

  const kick = next.kickMs ? new Date(next.kickMs) : new Date(next.date + 'T' + (next.time || '12:00') + ':00');
  const leftAbbr = next.focusAbbr || (next.home ? 'HOU' : next.oppAbbr);
  const rightAbbr = next.focusAbbr ? next.oppAbbr : (next.home ? next.oppAbbr : 'HOU');
  const timeBit = next.timeLabel ? (next.timeLabel + ' CT') : (next.time ? formatTime(next.time) : '');
  const focusPicker = (next.league && typeof renderFocusPicker === 'function') ? renderFocusPicker(next) : '';
  content.innerHTML = `
    <div class="score-row">
      <div class="team-block">
        <div class="team-abbr">${leftAbbr}</div>
        <div class="team-score ${next.home ? 'home' : ''}">—</div>
      </div>
      <div class="vs-clock">
        <div style="font-size:1rem;font-weight:700;color:var(--navy)">UPCOMING</div>
        <div style="margin-top:4px">${next.type === 'pre' ? 'Preseason' : 'Wk ' + next.week}</div>
      </div>
      <div class="team-block">
        <div class="team-abbr">${rightAbbr}</div>
        <div class="team-score">—</div>
      </div>
    </div>
    <div class="situation-bar">
      <span>${next.home ? 'vs' : '@'} <strong>${next.opp}</strong></span>
      <span>${kick.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeBit}</span>
      ${next.tv ? `<span class="tv-badge${next.tv === 'Prime Video' ? ' prime' : ''}">${next.tv}</span>` : ''}
    </div>
    ${focusPicker || ''}${isDockWindow() ? '' : '<div style="margin-top:10px"><button type="button" class="btn secondary" id="btnOpenDock">Pop out game dock</button><p class="small" style="margin-top:6px">Keeps scoreboard + leans in a small window beside Prime / NFL+.</p></div>'}
  `;
  if (next.league && typeof bindFocusPills === 'function') bindFocusPills(next);
  const dockBtnUp = $('#btnOpenDock');
  if (dockBtnUp) dockBtnUp.onclick = openGameDock;
  const preview = $('#nextGamePreview');
  if (preview) preview.textContent = `${next.home ? 'vs' : '@'} ${next.opp} · ${kick.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  startCountdown(kick);
}

function ordSuffix(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return n + 'th';
}

function renderInjuryCard() {
  const el = $('#injuryContent');
  if (!el) return;
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.injuryRows && LIVE_GAME.injuryRows.length) {
    el.innerHTML = LIVE_GAME.injuryRows.map(function (r) {
      const cls = String(r.status || '').toLowerCase().replace(/[^a-z]/g, '');
      return '<div class="injury-row"><span class="injury-status ' + cls + '">' + r.status + '</span><div><strong>' + r.name + '</strong> <span class="small">(' + (r.pos || r.team || '') + ')</span><br><span class="small">' + (r.note || '') + '</span></div></div>';
    }).join('') + '<p class="tend-note">Public ESPN injury list for this matchup — always verify on team/NFL sources.</p>';
    return;
  }
  const f = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  if (f !== 'HOU') {
    el.innerHTML = '<div class="empty">Injury line loads with the selected game feed.</div>';
    return;
  }
  if (typeof INJURY_REPORT === 'undefined' || !INJURY_REPORT.length) {
    el.innerHTML = `<div class="empty">Injury report unavailable.</div>`;
    return;
  }
  el.innerHTML = INJURY_REPORT.map((r) => {
    const cls = (r.status || '').toLowerCase();
    return `<div class="injury-row">
      <span class="injury-status ${cls}">${r.status}</span>
      <div><strong>${r.name}</strong> <span class="small">(${r.pos})</span><br><span class="small">${r.note}</span></div>
    </div>`;
  }).join('') + `<p class="tend-note">Public-style list — replace with official report closer to games. Always verify on team/NFL sources.</p>`;
}

function renderOpponentCard() {
  const el = $('#opponentContent');
  if (!el) return;
  let abbr = 'BUF';
  const f = (typeof focusAbbr === 'function' ? focusAbbr() : 'HOU');
  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.oppAbbr && LIVE_GAME.oppAbbr !== 'OPP') abbr = LIVE_GAME.oppAbbr;
  else if (LIVE_DEMO.active) abbr = LIVE_DEMO.oppAbbr;
  else {
    const next = getNextGame();
    if (next) abbr = next.oppAbbr;
  }
  const baked = (f === 'HOU' && OPPONENT_PREVIEWS[abbr]) ? OPPONENT_PREVIEWS[abbr] : null;
  const rec = (typeof scoutRecap === 'function') ? scoutRecap(abbr) : null;
  const pred = (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.predictor) ? LIVE_GAME.predictor : null;
  if (baked) {
    let extra = '';
    if (rec) extra = '<p class="tend-note">Your scouting file: ' + rec.n + ' watched games, ' + rec.w + '-' + rec.l + (rec.expAg ? (', ' + rec.expAg + ' explosives allowed') : '') + '.</p>';
    el.innerHTML = `
    <div style="font-weight:700;margin-bottom:4px">${baked.title}</div>
    <div class="small" style="margin-bottom:8px">${baked.record}</div>
    <ul class="opp-bullets">${baked.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
    ${extra}
    <div class="opp-meta">${baked.sources}</div>
  `;
    return;
  }
  const bullets = [];
  bullets.push((typeof teamName === 'function' ? teamName(abbr) : abbr) + ' — opponent when you are analyzing ' + f + '.');
  if (pred && pred.homeTeam && pred.awayTeam) {
    bullets.push('Matchup predictor (public): home ' + (pred.homeTeam.gameProjection || '—') + '% / away ' + (pred.awayTeam.gameProjection || '—') + '%.');
  }
  if (rec) {
    bullets.push('You’ve watched them ' + rec.n + '× (' + rec.w + '-' + rec.l + '). Last: ' + (rec.last && rec.last.result ? rec.last.result : '—') + ' vs ' + ((rec.last && rec.last.opp) || '') + '.');
    if (rec.expAg) bullets.push('In those games they allowed ' + rec.expAg + ' explosives and created ' + rec.expFor + '.');
  } else {
    bullets.push('No scouting file yet — tonight’s game is the first deposit for this club.');
  }
  bullets.push('Keys: protect the QB, early downs, explosives, hidden yardage.');
  el.innerHTML = '<div style="font-weight:700;margin-bottom:4px">' + (typeof teamName === 'function' ? teamName(abbr) : abbr) + '</div>' +
    '<ul class="opp-bullets">' + bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' +
    '<div class="opp-meta">Built from this game’s public feed + your on-device scouting memory</div>';
}

function renderRecapDemo() {
  /* Demo recap permanently removed */
  if (typeof LIVE_DEMO !== 'undefined') LIVE_DEMO.active = false;
  const recapCard = $('#recapCard');
  if (recapCard) recapCard.style.display = 'none';
}

function wireDemoToggles() {}

let countdownTimer = null;
function startCountdown(target) {
  const el = $('#countdown');
  if (!el || !target) return;
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  function tick() {
    const now = new Date();
    let diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    diff %= 86400000;
    const hrs = Math.floor(diff / 3600000);
    diff %= 3600000;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    el.innerHTML = `
      <div class="cd-block"><div class="cd-num">${days}</div><div class="cd-label">Days</div></div>
      <div class="cd-block"><div class="cd-num">${hrs.toString().padStart(2,'0')}</div><div class="cd-label">Hrs</div></div>
      <div class="cd-block"><div class="cd-num">${mins.toString().padStart(2,'0')}</div><div class="cd-label">Min</div></div>
      <div class="cd-block"><div class="cd-num">${secs.toString().padStart(2,'0')}</div><div class="cd-label">Sec</div></div>
    `;
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}

/* ---------- Play-by-Play ---------- */
function renderPBP() {
  const list = $('#pbpList');
  const label = $('#pbpGameLabel');
  if (!list) return;
  list.innerHTML = '';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'section-back';
  back.textContent = selectedGame ? '← Back to game insights' : '← Back to Schedule';
  back.addEventListener('click', () => {
    showSection('schedule');
    if (selectedGame && typeof renderScheduleDetail === 'function') renderScheduleDetail(selectedGame);
    else renderSchedule();
  });
  list.appendChild(back);

  if (typeof LIVE_GAME !== 'undefined' && LIVE_GAME.active && LIVE_GAME.recentPlays && LIVE_GAME.recentPlays.length) {
    if (label) label.textContent = '· LIVE vs ' + (LIVE_GAME.oppAbbr || '');
    const driveHeader = document.createElement('div');
    driveHeader.className = 'drive-header';
    driveHeader.textContent = 'Q' + LIVE_GAME.qtr + ' ' + (LIVE_GAME.clockDisplay || '') + ' · live public feed';
    list.appendChild(driveHeader);
    LIVE_GAME.recentPlays.forEach((play) => {
      const div = document.createElement('div');
      div.className = 'play' + (play.big ? ' big' : '');
      div.innerHTML = '<div class="play-time">Q' + (play.qtr || '') + '<br>' + (play.clock || '') + '</div><div class="play-body"><div class="play-desc">' + (play.desc || '') + '</div></div>';
      list.appendChild(div);
    });
    return;
  }

  // Demo PBP path removed


  if (selectedGame) {
    if (label) label.textContent = '· ' + (selectedGame.home ? 'vs' : '@') + ' ' + selectedGame.oppAbbr;
  } else if (label) {
    label.textContent = '· Select a game on Schedule';
  }

  const driveHeader = document.createElement('div');
  driveHeader.className = 'drive-header';
  driveHeader.textContent = selectedGame
    ? 'No live plays yet for this game. When the game is in progress (with network), public play-by-play fills here. Use Schedule for matchup insights, favorite, and keys.'
    : 'Pick a game on Schedule for insights — or wait for a live Texans game to stream plays here.';
  list.appendChild(driveHeader);

  if (!selectedGame) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Tip: open Schedule, tap a game for favored team / line / keys, then Open Plays.';
    list.appendChild(empty);
  }
}

/* ---------- Training Camp + News (Texans.com RSS + ESPN) ---------- */
/* Why 8/4 lingered on 8/5 morning:
   ESPN team feed often lags same-day team posts. Official houstontexans.com/rss/news
   already had "Transactions (8-5-2026)" at ~7:47am CT while ESPN's newest HOU item
   was still prior-evening. v14.7 merges both sources and sorts by published time. */
const CAMP_CACHE_KEY = 'texans-hq-camp-cache-v2';
const NEWS_CACHE_KEY = 'texans-hq-news-cache-v2';

function renderCampStaticFallback(reason) {
  const box = $('#campUpdates');
  if (!box) return;
  const cached = readJsonCache(CAMP_CACHE_KEY);
  if (cached && cached.items && cached.items.length) {
    box.innerHTML = freshnessLine(cached.savedAt, true, reason) +
      cached.items.map(campItemHtml).join('');
    return;
  }
  box.innerHTML = (reason ? `<div class="tend-note" style="margin-bottom:8px">${reason}</div>` : '') +
    CAMP_NOTES.map((n) =>
      `<div class="camp-note"><div class="camp-date">${n.date}</div><div class="camp-text">${n.text}</div></div>`
    ).join('') +
    `<p class="tend-note">Static camp notes (baked into app). Live headlines appear when online.</p>`;
}

function campItemHtml(item) {
  return `<div class="camp-note">
    <div class="camp-date">${item.date || ''}${item.source ? ' · ' + item.source : ''}</div>
    <div class="camp-text">${item.href
      ? `<a href="${item.href}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title || '')}
    ${item.desc ? `<div class="small" style="margin-top:4px">${escapeHtml(item.desc)}</div>` : ''}</div>
  </div>`;
}

function newsItemHtml(a) {
  return `<div class="news-item">
    <a href="${a.href || '#'}" target="_blank" rel="noopener">${escapeHtml(a.title || 'Headline')}</a>
    <div class="news-meta">${a.date || ''}${a.source ? ' · ' + a.source : ''}${a.desc ? ' · ' + escapeHtml(a.desc) : ''}</div>
  </div>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function freshnessLine(ts, isCached, extra) {
  const when = ts ? timeAgo(ts) : 'unknown';
  const label = isCached ? `Cached · ${when}` : `Updated ${when}`;
  return `<div class="live-updated" style="margin:0 0 10px;text-align:left">${label}${extra ? ' · ' + extra : ''}</div>`;
}

function readJsonCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}

function writeJsonCache(key, payload) {
  try { localStorage.setItem(key, JSON.stringify(payload)); } catch (e) {}
}

function formatPubDate(published) {
  if (!published) return '';
  try {
    const d = new Date(published);
    if (isNaN(d.getTime())) return String(published);
    return d.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }) + ' CT';
  } catch (e) {
    return String(published);
  }
}

function articleToItem(a, source) {
  const href = (a.links && a.links.web && a.links.web.href) || a.link || a.href || '#';
  const title = a.headline || a.title || 'Headline';
  const published = a.published || a.lastModified || a.pubDate || '';
  return {
    title: String(title).trim(),
    desc: String(a.description || a.desc || '').trim(),
    href,
    date: formatPubDate(published),
    published: published ? new Date(published).getTime() : 0,
    source: source || 'ESPN'
  };
}

function isCampRelated(item) {
  const t = ((item.title || '') + ' ' + (item.desc || '')).toLowerCase();
  return /camp|practice|pads|joint practice|training|roster|transaction|cut|signed|waived|injured|walk-through|walkthrough|one-on-one|ol\/dl|depth chart|preseason/.test(t);
}

function dedupeItems(items) {
  const out = [];
  const seen = new Set();
  items.forEach((it) => {
    const key = (it.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(it);
  });
  return out;
}

async function fetchEspnArticles() {
  const urls = [
    espnUrl('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=15&team=hou'),
    espnUrl('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=12')
  ];
  let articles = [];
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, espnFetchOpts());
      if (!res.ok) { lastErr = 'HTTP ' + res.status; continue; }
      const data = await res.json();
      const list = data.articles || data.headlines || [];
      if (Array.isArray(list) && list.length) {
        articles = list.map((a) => articleToItem(a, 'ESPN'));
        break;
      }
    } catch (e) {
      lastErr = (e && e.message) ? e.message : 'network';
    }
  }
  if (!articles.length) throw new Error(lastErr || 'ESPN empty');
  return articles;
}

/** Official team RSS — usually ahead of ESPN for same-day transactions & camp posts */
async function fetchTexansRss() {
  const url = feedUrl('https://www.houstontexans.com/rss/news');
  const res = await fetch(url, espnFetchOpts());
  if (!res.ok) throw new Error('Texans RSS HTTP ' + res.status);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Texans RSS parse error');
  const items = [];
  doc.querySelectorAll('item').forEach((node) => {
    const title = (node.querySelector('title') && node.querySelector('title').textContent || '').trim();
    const link = (node.querySelector('link') && node.querySelector('link').textContent || '').trim();
    const pubDate = (node.querySelector('pubDate') && node.querySelector('pubDate').textContent || '').trim();
    const desc = (node.querySelector('description') && node.querySelector('description').textContent || '').trim();
    if (!title) return;
    items.push(articleToItem({
      title,
      link,
      pubDate,
      description: desc.replace(/<[^>]+>/g, '').slice(0, 180)
    }, 'Texans.com'));
  });
  if (!items.length) throw new Error('Texans RSS empty');
  return items;
}

/** Merge official team feed + ESPN; newest first */
async function fetchAllNewsItems() {
  const batches = await Promise.allSettled([fetchTexansRss(), fetchEspnArticles()]);
  let items = [];
  const sources = [];
  batches.forEach((r, i) => {
    const name = i === 0 ? 'Texans.com' : 'ESPN';
    if (r.status === 'fulfilled' && r.value && r.value.length) {
      items = items.concat(r.value);
      sources.push(name);
    }
  });
  if (!items.length) {
    const errs = batches.map((r) => r.status === 'rejected' ? (r.reason && r.reason.message) : null).filter(Boolean);
    throw new Error(errs.join('; ') || 'All feeds failed');
  }
  items.sort((a, b) => (b.published || 0) - (a.published || 0));
  items = dedupeItems(items);
  return { items, sources };
}

async function loadCamp(fromButton) {
  const box = $('#campUpdates');
  const btn = $('#campRefreshBtn');
  if (!box) return;
  if (fromButton && btn) {
    btn.disabled = true;
    btn.textContent = 'Refreshing…';
  }
  const datesEl = $('#campDates');
  if (datesEl) {
    const today = new Date();
    const md = today.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
    datesEl.innerHTML = CAMP_OPEN_DATES.map((d) => {
      const isToday = d.toLowerCase().indexOf(md.toLowerCase()) !== -1;
      return `<div style="padding:4px 0">${isToday ? '<strong style="color:var(--navy)">TODAY · </strong>' : ''}${d}</div>`;
    }).join('');
  }

  box.innerHTML = '<div class="loading">Fetching camp updates…</div>';
  try {
    const { items, sources } = await fetchAllNewsItems();
    let campItems = items.filter(isCampRelated);
    if (campItems.length < 4) {
      campItems = dedupeItems(campItems.concat(items)).slice(0, 10);
    } else {
      campItems = campItems.slice(0, 10);
    }
    writeJsonCache(CAMP_CACHE_KEY, { savedAt: Date.now(), items: campItems });
    box.innerHTML = freshnessLine(Date.now(), false, sources.join(' + ')) +
      campItems.map(campItemHtml).join('');
  } catch (e) {
    renderCampStaticFallback('Live camp feed unavailable (' + (e.message || 'offline') + ')');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Refresh';
    }
  }
}

function renderCamp() {
  renderCampStaticFallback('');
  loadCamp(false);
}

async function loadNews(fromButton) {
  const list = $('#newsList');
  const btn = $('#newsRefreshBtn');
  if (!list) return;
  if (fromButton && btn) {
    btn.disabled = true;
    btn.textContent = 'Refreshing…';
  }

  const cached = readJsonCache(NEWS_CACHE_KEY);
  if (cached && cached.items && cached.items.length) {
    list.innerHTML = freshnessLine(cached.savedAt, true, 'showing last good fetch') +
      cached.items.map(newsItemHtml).join('');
  } else {
    list.innerHTML = '<div class="loading">Fetching public headlines…</div>';
  }

  try {
    const { items, sources } = await fetchAllNewsItems();
    const trimmed = items.slice(0, 12);
    writeJsonCache(NEWS_CACHE_KEY, { savedAt: Date.now(), items: trimmed });
    list.innerHTML = freshnessLine(Date.now(), false, sources.join(' + ')) +
      trimmed.map(newsItemHtml).join('');
  } catch (e) {
    if (cached && cached.items && cached.items.length) {
      list.innerHTML = freshnessLine(cached.savedAt, true, 'live fetch failed — ' + (e.message || 'offline')) +
        cached.items.map(newsItemHtml).join('') +
        `<div class="news-item"><a href="https://www.houstontexans.com/news" target="_blank" rel="noopener">Official Texans News</a><div class="news-meta">houstontexans.com</div></div>`;
    } else {
      list.innerHTML = `
      <div class="empty">
        Could not reach public news feeds (offline or blocked).<br>
        Camp notes and schedule remain fully available offline.
      </div>
      <div class="news-item">
        <a href="https://www.houstontexans.com/news" target="_blank" rel="noopener">Official Texans News</a>
        <div class="news-meta">houstontexans.com</div>
      </div>
      <div class="news-item">
        <a href="https://www.espn.com/nfl/team/_/name/hou/houston-texans" target="_blank" rel="noopener">ESPN Texans Hub</a>
        <div class="news-meta">Public source</div>
      </div>`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Refresh';
    }
  }
}


/* ---------- Videos — ranked Texans picks (no manual YouTube hunting) ----------
   Lightweight "search engine":
   1) Pull recent uploads from trusted Texans-focused YouTube channels
   2) Score each video (recency + views + title relevance + channel weight)
   3) Show the top 8, best → worst
   This is not the full YouTube algorithm (needs Google API keys). It is a
   reliable, offline-cacheable ranker tuned for "what should I watch now?"
*/
const VIDEO_CACHE_KEY = 'texans-hq-videos-cache-v2';
const VIDEO_TOP_N = 8;           // best 5–10 band; 8 is the sweet spot
const VIDEO_FETCH_PER_CHANNEL = 10;

const VIDEO_CHANNELS = [
  {
    id: 'UCXWwSKD3KIj78GrIlDhtFYw',
    name: 'Seth Payne',
    short: 'Seth Payne',
    url: 'https://www.youtube.com/@SethPayneShow',
    weight: 1.25   // strong analysis signal
  },
  {
    id: 'UCiFQGjNHUQPVrg-aQL5FtgA',
    name: 'Locked On Texans',
    short: 'Locked On',
    url: 'https://www.youtube.com/@LockedOnTexans',
    weight: 1.15
  },
  {
    id: 'UCa_FcpOBe8G6VAR18RYS-aA',
    name: 'Houston Texans',
    short: 'Official',
    url: 'https://www.youtube.com/@HoustonTexans',
    weight: 1.0
  }
];

/* Title tokens that mark a video as on-topic for this HQ */
const TEXANS_TITLE_RE = /texan|houston|stroud|higgins|stingley|demeco|ryans|clowney|mixon|collins|anderson|camp|preseason|nrg|afc south|caserio|schultz|al-shaair|to\'oto\'o|tootoo/i;

function renderVideoChannels() {
  const el = $('#videoChannels');
  if (!el) return;
  el.innerHTML = VIDEO_CHANNELS.map((c) =>
    `<a class="video-channel-chip" href="${c.url}" target="_blank" rel="noopener">${c.short}</a>`
  ).join('') +
    `<a class="video-channel-chip" href="https://www.youtube.com/results?search_query=Houston+Texans+training+camp+2026" target="_blank" rel="noopener">YouTube search</a>`;
}

function videoItemHtml(v, rank) {
  const thumb = v.thumbnail
    ? `<img class="video-thumb" src="${v.thumbnail}" alt="" loading="lazy" width="120" height="68" />`
    : `<div class="video-thumb video-thumb-ph">▶</div>`;
  const views = v.views ? formatViews(v.views) + ' views · ' : '';
  const rankBadge = typeof rank === 'number'
    ? `<span class="video-rank">#${rank}</span>`
    : '';
  return `<a class="video-item" href="${v.href}" target="_blank" rel="noopener">
    <div class="video-rank-col">${rankBadge}</div>
    ${thumb}
    <div class="video-body">
      <div class="video-title">${escapeHtml(v.title)}</div>
      <div class="video-meta">${escapeHtml(v.channel)} · ${views}${v.date || ''}</div>
    </div>
  </a>`;
}

function formatViews(n) {
  n = parseInt(n, 10);
  if (!n || n < 0) return '';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/**
 * Rank score — higher = better pick for "watch next"
 * - Recency dominates (today's camp tape > last month's viral clip)
 * - log(views) rewards traction without letting old megahits win forever
 * - Title relevance filters random non-Texans uploads on shared feeds
 * - Channel weight slightly prefers analysis channels
 */
function scoreVideo(v, now) {
  now = now || Date.now();
  const ageMs = Math.max(0, now - (v.published || now));
  const ageHours = ageMs / 3600000;
  // ~24h half-life style: 1.0 when fresh, ~0.5 at 1 day, ~0.2 at 4 days
  const recency = 1 / (1 + ageHours / 24);

  const viewScore = Math.log10((v.views || 0) + 1); // 0–6 typical

  const title = v.title || '';
  let relevance = TEXANS_TITLE_RE.test(title) ? 1 : 0.35;
  // Extra boost for analysis / interview-style titles
  if (/breakdown|reaction|camp|analysis|film|preview|press conference|availability|full q&a|interview|address the media|on c\.j|on the/i.test(title)) {
    relevance += 0.45;
  }
  // Penalize ultra-short official flashes (emoji-only / three-character hype clips)
  const isOfficial = v.channelId === 'UCa_FcpOBe8G6VAR18RYS-aA';
  const wordCount = (title.match(/[A-Za-z0-9']+/g) || []).length;
  if (isOfficial && (title.length < 22 || wordCount <= 3)) {
    relevance *= 0.35; // keep them discoverable via channel chip, not top of ranked list
  }

  const channelWeight = v.channelWeight || 1;

  // Fresh analysis should beat same-day 5-second official hype clips
  const score =
    recency * 10 +
    viewScore * 1.6 +
    relevance * 4 +
    channelWeight * 1.5;

  return score;
}

async function fetchChannelVideos(channel) {
  const rss = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(channel.id);
  const api = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rss) +
    '&count=' + VIDEO_FETCH_PER_CHANNEL;
  const res = await fetch(api, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Bad feed');
  return data.items.map((it) => {
    const idMatch = (it.link || '').match(/[?&]v=([\w-]{6,})/) ||
      (it.guid || '').match(/yt:video:([\w-]{6,})/);
    const vid = idMatch ? idMatch[1] : '';
    const href = vid ? ('https://www.youtube.com/watch?v=' + vid) : (it.link || channel.url);
    let views = 0;
    if (it.viewCount) views = parseInt(it.viewCount, 10) || 0;
    // rss2json sometimes embeds stats only in raw; leave 0 if unknown
    const pub = it.pubDate || it.published || '';
    let ts = 0;
    try { ts = pub ? new Date(pub).getTime() : 0; } catch (e) {}
    return {
      title: it.title || 'Video',
      href,
      channel: channel.name,
      channelId: channel.id,
      channelWeight: channel.weight || 1,
      thumbnail: (it.thumbnail && it.thumbnail.startsWith('http') ? it.thumbnail : null) ||
        (vid ? ('https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg') : ''),
      views,
      published: ts,
      date: formatPubDate(pub)
    };
  });
}

/** Score → sort best to worst → top N. Dedupe by video URL. */
function rankVideos(all) {
  const now = Date.now();
  const seen = new Set();
  const scored = [];
  all.forEach((v) => {
    const key = v.href || v.title;
    if (!key || seen.has(key)) return;
    seen.add(key);
    // Drop clearly off-topic unless from official/analysis channels with low title signal
    const s = scoreVideo(v, now);
    if (s < 3.5 && !TEXANS_TITLE_RE.test(v.title || '')) return;
    scored.push(Object.assign({}, v, { _score: s }));
  });
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, VIDEO_TOP_N);
}

async function loadVideos(fromButton) {
  const list = $('#videoList');
  const btn = $('#videosRefreshBtn');
  if (!list) return;
  renderVideoChannels();
  if (fromButton && btn) {
    btn.disabled = true;
    btn.textContent = 'Ranking…';
  }

  const cached = readJsonCache(VIDEO_CACHE_KEY);
  if (cached && cached.items && cached.items.length) {
    list.innerHTML = freshnessLine(cached.savedAt, true, 'last ranked list') +
      cached.items.map((v, i) => videoItemHtml(v, i + 1)).join('');
  } else {
    list.innerHTML = '<div class="loading">Finding the best Texans videos…</div>';
  }

  try {
    const results = await Promise.allSettled(VIDEO_CHANNELS.map(fetchChannelVideos));
    let all = [];
    const okNames = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value && r.value.length) {
        all = all.concat(r.value);
        okNames.push(VIDEO_CHANNELS[i].short);
      }
    });
    if (!all.length) throw new Error('No video feeds available');

    const ranked = rankVideos(all);
    writeJsonCache(VIDEO_CACHE_KEY, { savedAt: Date.now(), items: ranked });
    list.innerHTML =
      freshnessLine(Date.now(), false, 'ranked · ' + okNames.join(' + ')) +
      `<p class="video-rank-explainer">Top ${ranked.length} right now — scored by freshness, traction, and Texans relevance (not a raw YouTube popularity sort).</p>` +
      ranked.map((v, i) => videoItemHtml(v, i + 1)).join('') +
      `<p class="tend-note">Tap any row to watch in YouTube. Refresh re-runs the ranker. Channel chips open full feeds if you want to browse more.</p>`;
  } catch (e) {
    if (cached && cached.items && cached.items.length) {
      list.innerHTML = freshnessLine(cached.savedAt, true, 'live rank failed — showing last list') +
        cached.items.map((v, i) => videoItemHtml(v, i + 1)).join('');
    } else {
      list.innerHTML = `
        <div class="empty">Could not rank videos right now (offline or feed blocked).</div>
        <a class="video-item" href="https://www.youtube.com/@SethPayneShow" target="_blank" rel="noopener">
          <div class="video-thumb video-thumb-ph">▶</div>
          <div class="video-body"><div class="video-title">Seth Payne on YouTube</div><div class="video-meta">Open channel</div></div>
        </a>
        <a class="video-item" href="https://www.youtube.com/@LockedOnTexans" target="_blank" rel="noopener">
          <div class="video-thumb video-thumb-ph">▶</div>
          <div class="video-body"><div class="video-title">Locked On Texans</div><div class="video-meta">Open channel</div></div>
        </a>
        <a class="video-item" href="https://www.youtube.com/results?search_query=Houston+Texans+training+camp" target="_blank" rel="noopener">
          <div class="video-thumb video-thumb-ph">▶</div>
          <div class="video-body"><div class="video-title">YouTube: Texans training camp</div><div class="video-meta">Open search</div></div>
        </a>`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Refresh';
    }
  }
}


/* ============================================================
   BACKUP EXPORT / IMPORT (v15.13)
   Full replace on import (with confirm). Reminder after Final.
   ============================================================ */
const NOTES_KEY = 'texans-hq-notes-v1';
const BACKUP_META_KEY = 'texans-hq-backup-meta-v1';
const BACKUP_REMINDER_KEY = 'texans-hq-backup-reminder-v1';
const BACKUP_SCHEMA = 1;

function readBackupMeta() {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    if (!raw) return { lastExportAt: null };
    const p = JSON.parse(raw);
    return { lastExportAt: p.lastExportAt || null };
  } catch (e) {
    return { lastExportAt: null };
  }
}

function writeBackupMeta(meta) {
  try {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  } catch (e) {}
}

function readReminderMap() {
  try {
    const raw = localStorage.getItem(BACKUP_REMINDER_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch (e) {
    return {};
  }
}

function writeReminderMap(map) {
  try {
    localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(map));
  } catch (e) {}
}

function gameReminderKey(game) {
  if (!game) return '';
  const d = (game.date || new Date().toISOString().slice(0, 10));
  const opp = game.oppAbbr || game.opp || 'OPP';
  return d + '|' + opp;
}

function collectBackupPayload() {
  let notes = '';
  try { notes = localStorage.getItem(NOTES_KEY) || ''; } catch (e) {}
  let nextPlay = null;
  try {
    const raw = localStorage.getItem(NEXT_PLAY_STORAGE_KEY);
    nextPlay = raw ? JSON.parse(raw) : null;
  } catch (e) { nextPlay = null; }
  let dominos = null;
  try {
    dominos = loadDominosMemory();
  } catch (e) {
    dominos = { games: [], weights: {} };
  }
  return {
    _schema: BACKUP_SCHEMA,
    app: 'texans-hq',
    version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown'),
    exportedAt: new Date().toISOString(),
    data: {
      notes: notes,
      nextPlayLog: nextPlay,
      dominosMemory: dominos,
      watchList: (typeof loadWatchList === 'function' ? loadWatchList() : []),
      currentWatch: (typeof getCurrentWatch === 'function' ? getCurrentWatch() : null),
      scoutMemory: (typeof loadScoutMemory === 'function' ? loadScoutMemory() : { teams: {} })
    }
  };
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    try { document.body.removeChild(a); } catch (e) {}
    try { URL.revokeObjectURL(url); } catch (e) {}
  }, 500);
}

function exportAppData() {
  const payload = collectBackupPayload();
  const day = payload.exportedAt.slice(0, 10);
  downloadJson('texans-hq-backup-' + day + '.json', payload);
  writeBackupMeta({ lastExportAt: Date.now() });
  updateBackupStatusLine();
  const msg = $('#backupActionMsg');
  if (msg) {
    msg.style.display = '';
    msg.textContent = 'Backup downloaded. Keep the file somewhere safe (Drive, computer, etc.).';
  }
  return payload;
}

function validateBackupPayload(obj) {
  if (!obj || typeof obj !== 'object') return 'File is not a valid backup object.';
  if (obj.app && obj.app !== 'texans-hq') return 'This file is not a Texans HQ backup.';
  if (obj._schema && obj._schema > BACKUP_SCHEMA) return 'This backup is from a newer app version.';
  if (!obj.data || typeof obj.data !== 'object') return 'Backup is missing the data section.';
  return null;
}

function applyImportPayload(obj) {
  const data = obj.data || {};
  // Full replace for the three durable stores
  try {
    localStorage.setItem(NOTES_KEY, typeof data.notes === 'string' ? data.notes : '');
  } catch (e) {}
  try {
    if (data.nextPlayLog && typeof data.nextPlayLog === 'object') {
      localStorage.setItem(NEXT_PLAY_STORAGE_KEY, JSON.stringify(data.nextPlayLog));
    } else {
      localStorage.removeItem(NEXT_PLAY_STORAGE_KEY);
    }
  } catch (e) {}
  try {
    const mem = data.dominosMemory && typeof data.dominosMemory === 'object'
      ? data.dominosMemory
      : { games: [], weights: {} };
    if (!Array.isArray(mem.games)) mem.games = [];
    if (!mem.weights || typeof mem.weights !== 'object') mem.weights = {};
    saveDominosMemory(mem);
  } catch (e) {}
  try {
    if (Array.isArray(data.watchList) && typeof saveWatchList === 'function') saveWatchList(data.watchList);
    if (data.currentWatch && typeof saveCurrentWatch === 'function') saveCurrentWatch(data.currentWatch);
    if (data.scoutMemory && typeof saveScoutMemory === 'function') saveScoutMemory(data.scoutMemory);
  } catch (e) {}
  // Refresh UI
  loadNotes();
  updateBackupStatusLine();
  const msg = $('#backupActionMsg');
  if (msg) {
    msg.style.display = '';
    msg.textContent = 'Import complete. Notes, accuracy log, and Dominos memory on this device were replaced.';
  }
}

function importAppDataFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const obj = JSON.parse(String(reader.result || ''));
      const err = validateBackupPayload(obj);
      if (err) {
        alert(err);
        return;
      }
      const notesLen = (obj.data && typeof obj.data.notes === 'string') ? obj.data.notes.length : 0;
      const games = (obj.data && obj.data.dominosMemory && obj.data.dominosMemory.games)
        ? obj.data.dominosMemory.games.length : 0;
      const when = obj.exportedAt ? String(obj.exportedAt).slice(0, 19).replace('T', ' ') : 'unknown time';
      const ok = confirm(
        'Import will REPLACE all of the following on this device:\n\n' +
        '• Personal notes\n' +
        '• Next Play Lean accuracy log\n' +
        '• Dominos season memory\n\n' +
        'Backup file: ' + when + '\n' +
        'Notes length: ' + notesLen + ' chars · Dominos games stored: ' + games + '\n\n' +
        'This cannot be undone unless you already exported a backup of the current device.\n\n' +
        'Continue with import?'
      );
      if (!ok) return;
      applyImportPayload(obj);
    } catch (e) {
      alert('Could not read that file as JSON.');
    }
  };
  reader.onerror = function () {
    alert('Could not read the selected file.');
  };
  reader.readAsText(file);
}

function updateBackupStatusLine() {
  const el = $('#backupStatusLine');
  if (!el) return;
  const meta = readBackupMeta();
  if (meta.lastExportAt) {
    el.textContent = 'Last export: ' + timeAgo(meta.lastExportAt) + ' · ' + new Date(meta.lastExportAt).toLocaleString();
  } else {
    el.textContent = 'Last export: never — export after games so notes and season memory are safe.';
  }
}

function shouldShowBackupReminder() {
  if (typeof LIVE_GAME === 'undefined' || !LIVE_GAME.final) return false;
  const key = gameReminderKey({
    date: (LIVE_GAME.lastUpdated ? new Date(LIVE_GAME.lastUpdated).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    oppAbbr: LIVE_GAME.oppAbbr
  });
  if (!key) return false;
  const map = readReminderMap();
  return !map[key];
}

function dismissBackupReminder() {
  if (typeof LIVE_GAME === 'undefined') return;
  const key = gameReminderKey({
    date: (LIVE_GAME.lastUpdated ? new Date(LIVE_GAME.lastUpdated).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    oppAbbr: LIVE_GAME.oppAbbr
  });
  const map = readReminderMap();
  map[key] = Date.now();
  writeReminderMap(map);
  const card = $('#backupReminder');
  if (card) card.style.display = 'none';
}

function renderBackupReminder() {
  const card = $('#backupReminder');
  if (!card) return;
  if (!shouldShowBackupReminder()) {
    card.style.display = 'none';
    return;
  }
  const text = $('#backupReminderText');
  if (text) {
    text.textContent = 'Game final vs ' + (LIVE_GAME.oppAbbr || 'OPP') +
      ' — export notes, accuracy log, and Dominos memory so nothing is lost if this device is cleared.';
  }
  card.style.display = '';
}

function bindBackupUi() {
  const exportBtn = $('#exportDataBtn');
  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.dataset.bound = '1';
    exportBtn.addEventListener('click', function () { exportAppData(); });
  }
  const importBtn = $('#importDataBtn');
  const fileInput = $('#importFileInput');
  if (importBtn && fileInput && !importBtn.dataset.bound) {
    importBtn.dataset.bound = '1';
    importBtn.addEventListener('click', function () {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', function () {
      const f = fileInput.files && fileInput.files[0];
      if (f) importAppDataFromFile(f);
    });
  }
  const remExport = $('#backupReminderExport');
  if (remExport && !remExport.dataset.bound) {
    remExport.dataset.bound = '1';
    remExport.addEventListener('click', function () {
      exportAppData();
      dismissBackupReminder();
    });
  }
  const remDismiss = $('#backupReminderDismiss');
  if (remDismiss && !remDismiss.dataset.bound) {
    remDismiss.dataset.bound = '1';
    remDismiss.addEventListener('click', function () { dismissBackupReminder(); });
  }
  const resetOff = $('#resetOfficialBookBtn');
  if (resetOff && !resetOff.dataset.bound) {
    resetOff.dataset.bound = '1';
    resetOff.addEventListener('click', function () {
      if (!confirm('Zero the official Next Play book (regular + postseason)? Preseason lab numbers stay.')) return;
      resetOfficialNextPlayBook();
      const msg = $('#backupActionMsg');
      if (msg) {
        msg.style.display = '';
        msg.textContent = 'Official Next Play book reset. Lab (preseason) log was kept.';
      }
    });
  }
  const resetLab = $('#resetLabBookBtn');
  if (resetLab && !resetLab.dataset.bound) {
    resetLab.dataset.bound = '1';
    resetLab.addEventListener('click', function () {
      if (!confirm('Clear the preseason lab log only? Official book stays.')) return;
      resetLabNextPlayBook();
      const msg = $('#backupActionMsg');
      if (msg) {
        msg.style.display = '';
        msg.textContent = 'Preseason lab log cleared. Official book was not touched.';
      }
    });
  }
  updateBackupStatusLine();
}


/* ---------- Local Notes ---------- */
function loadNotes() {
  const saved = localStorage.getItem('texans-hq-notes-v1');
  if (saved) $('#notesArea').value = saved;
}

function saveNotes() {
  localStorage.setItem('texans-hq-notes-v1', $('#notesArea').value);
  const btn = $('#saveNotesBtn');
  btn.textContent = 'Saved ✓';
  setTimeout(() => { btn.textContent = 'Save Notes'; }, 1500);
}

$('#saveNotesBtn').addEventListener('click', saveNotes);
$('#clearNotesBtn').addEventListener('click', () => {
  if (confirm('Clear all local notes?')) {
    $('#notesArea').value = '';
    localStorage.removeItem('texans-hq-notes-v1');
  }
});

/* ---------- Service Worker ---------- */
/* ---------- Service Worker (reliable updates) ----------
   Why you had to hard-close twice:
   1) Old SW kept controlling the open page after a deploy.
   2) New SW installed + activated in the background, but the page never reloaded,
      so the header still showed the old version string from in-memory HTML/JS.
   3) First reopen sometimes still lost a race (HTTP cache / activate not finished).
   Fix: force update check, skip waiting, reload once on controllerchange,
   and set the version pill from APP_VERSION as soon as JS runs.
*/
function setVersionPill(extra) {
  const pill = $('#statusPill');
  if (!pill) return;
  pill.textContent = extra || APP_VERSION_LABEL;
  pill.classList.remove('live');
}

if ('serviceWorker' in navigator) {
  const skipSw = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.port === '8080';
  // If a new SW takes control of this tab/window, reload once so UI matches the new files.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    // One reload is enough — do not loop
    window.location.reload();
  });

  window.addEventListener('load', () => {
    setVersionPill();

    if (skipSw) return;
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        setVersionPill();

        // Force a fresh sw.js byte check (important on iOS PWAs)
        try { reg.update(); } catch (e) {}

        // If a worker is already waiting (updated while we were open), activate it now
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // When an updated worker is found and installs, tell it to activate immediately
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // New version ready — activate; controllerchange handler will reload
              nw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Periodic update check while app stays open (iOS often delays SW checks)
        setInterval(() => {
          try { reg.update(); } catch (e) {}
        }, 60 * 60 * 1000);
      })
      .catch(() => {
        setVersionPill(APP_VERSION + ' · SW optional');
      });
  });
} else {
  window.addEventListener('load', () => setVersionPill(APP_VERSION + ' · no SW'));
}


/* ---------- Roster search (v14.8) ---------- */
let rosterFilterPos = 'ALL';
function renderRoster() {
  const list = $('#rosterList');
  const countEl = $('#rosterCount');
  const searchEl = $('#rosterSearch');
  const filtersEl = $('#rosterFilters');
  const integrityEl = $('#rosterIntegrity');
  const phasePill = $('#rosterPhasePill');
  if (!list) return;

  // Ensure we always have a working list
  if (!ACTIVE_ROSTER || !ACTIVE_ROSTER.length) {
    applyActiveRoster(FULL_ROSTER.slice(), 'baked', null);
  }

  // Integrity banner
  if (integrityEl) {
    if (ROSTER_META && ROSTER_META.warning) {
      integrityEl.style.display = '';
      integrityEl.textContent = ROSTER_META.warning;
    } else {
      integrityEl.style.display = 'none';
      integrityEl.textContent = '';
    }
  }
  if (phasePill) {
    phasePill.textContent = rosterSourceLabel();
  }

  // Position filter chips
  if (filtersEl && !filtersEl.dataset.ready) {
    const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'ST'];
    filtersEl.innerHTML = positions.map(p =>
      `<button type="button" class="btn secondary roster-pos-btn${p === 'ALL' ? ' active' : ''}" data-pos="${p}" style="padding:4px 10px; font-size:0.85rem;">${p}</button>`
    ).join('');
    filtersEl.dataset.ready = '1';
    filtersEl.querySelectorAll('.roster-pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        rosterFilterPos = btn.dataset.pos;
        filtersEl.querySelectorAll('.roster-pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyRosterFilter();
      });
    });
  }

  if (searchEl && !searchEl.dataset.bound) {
    searchEl.dataset.bound = '1';
    searchEl.addEventListener('input', applyRosterFilter);
  }

  applyRosterFilter();

  function applyRosterFilter() {
    const base = ACTIVE_ROSTER && ACTIVE_ROSTER.length ? ACTIVE_ROSTER : FULL_ROSTER;
    const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const filtered = base.filter(p => {
      const posOk = rosterFilterPos === 'ALL' ||
        p.pos === rosterFilterPos ||
        (rosterFilterPos === 'OL' && isOffensiveLinePos(p.pos)) ||
        (rosterFilterPos === 'S' && ['S', 'FS', 'SS', 'SAF'].includes(String(p.pos || '').toUpperCase())) ||
        (rosterFilterPos === 'DE' && p.pos === 'DE') ||
        (rosterFilterPos === 'DT' && p.pos === 'DT') ||
        (rosterFilterPos === 'ST' && ['K', 'P', 'LS'].includes(p.pos));
      if (!posOk) return false;
      if (!q) return true;
      const nameL = (p.name || '').toLowerCase();
      const aliasHit = Array.isArray(p.aliases) && p.aliases.some((a) => String(a).toLowerCase().includes(q) || q.includes(String(a).toLowerCase()));
      const fuzzy = q.length >= 3 && nameL.split(/\s+/).some((part) => part.startsWith(q.slice(0, 3)) || q.startsWith(part.slice(0, 3)));
      return (
        nameL.includes(q) ||
        aliasHit ||
        fuzzy ||
        (p.num && p.num.toString().includes(q)) ||
        (p.pos && p.pos.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q)) ||
        (p.college && p.college.toLowerCase().includes(q))
      );
    });

    list.innerHTML = filtered.map((p) => {
      const idx = base.indexOf(p);
      return `
      <button type="button" class="player-card player-card-btn roster-card" data-roster-idx="${idx}" aria-expanded="false">
        <div class="player-card-top">
          <span class="player-name">${p.num ? '#' + p.num + ' ' : ''}${p.name}</span>
          <span class="player-pos">${p.pos}</span>
        </div>
        <div class="player-note">${p.status || ''} ${p.ht && p.wt ? '· ' + p.ht + ' / ' + p.wt : ''} ${p.exp != null && p.exp !== '' ? '· Exp ' + p.exp : ''}</div>
        <div class="player-expand-hint">Tap for insights ▾</div>
        <div class="player-detail-body hidden"></div>
      </button>`;
    }).join('') || '<div class="empty">No players match. Try a different name, number, or position.</div>';

    if (countEl) {
      countEl.textContent = filtered.length + ' shown · ' + base.length + ' on active roster · ' + rosterSourceLabel();
    }

    list.querySelectorAll('[data-roster-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-roster-idx'), 10);
        const baseNow = ACTIVE_ROSTER && ACTIVE_ROSTER.length ? ACTIVE_ROSTER : FULL_ROSTER;
        const p = baseNow[idx];
        if (!p) return;
        const body = btn.querySelector('.player-detail-body');
        const hint = btn.querySelector('.player-expand-hint');
        const wasOpen = body && !body.classList.contains('hidden');
        list.querySelectorAll('.player-detail-body').forEach(el => el.classList.add('hidden'));
        list.querySelectorAll('.roster-card').forEach(b => {
          b.setAttribute('aria-expanded', 'false');
          const h = b.querySelector('.player-expand-hint');
          if (h) h.textContent = 'Tap for insights ▾';
        });
        if (wasOpen || !body) return;
        body.classList.remove('hidden');
        const linkHtml = (p.links && p.links.length)
          ? '<div class="player-links">' + p.links.map((L) =>
              '<a class="player-link" href="' + L.url + '" target="_blank" rel="noopener noreferrer">' + L.label + ' ↗</a>'
            ).join('') + '</div>' +
            '<div class="small" style="margin-top:4px;opacity:0.8">Trusted sources only (ESPN, PFR, NFL.com). Read widely; form your own view.</div>'
          : '<div class="small" style="margin-top:6px;opacity:0.8">No external scouting links attached for this roster line yet.</div>';
        body.innerHTML = `
          <strong>${p.name}</strong> · #${p.num || '—'} · ${p.pos}<br>
          ${p.ht || ''} ${p.wt || ''} · Exp: ${p.exp || '—'} · ${p.college || ''}<br>
          <span class="small" style="display:block;margin-top:6px">${p.note || 'No extended note yet.'}</span>
          ${linkHtml}
          <span class="small" style="display:block;margin-top:6px;opacity:0.85">Phase note: Preseason roster is larger. Regular-season and postseason use the final 53-man + practice squad.</span>
        `;
        btn.setAttribute('aria-expanded', 'true');
        if (hint) hint.textContent = 'Tap to close ▴';
      });
    });
  }
}

/* ---------- Stats (restored in v14.7 — was dropped in v14.7 feed rewrite) ---------- */
function renderStats() {
  const grid = $('#teamStats');
  if (!grid) return;

  grid.innerHTML = TEAM_STATS_2025.map((s) => `
    <button type="button" class="stat-item stat-item-btn" data-stat-label="${s.label}">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </button>
  `).join('') + `<div id="statDetail" class="player-detail hidden" style="grid-column:1/-1"></div>`;

  grid.querySelectorAll('[data-stat-label]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const label = btn.getAttribute('data-stat-label');
      const row = TEAM_STATS_2025.find((s) => s.label === label);
      const detail = document.getElementById('statDetail');
      if (!detail || !row) return;
      const blurb = (typeof TEAM_STAT_DETAILS !== 'undefined' && TEAM_STAT_DETAILS[label])
        ? TEAM_STAT_DETAILS[label]
        : '2025 season context for personal reference.';
      detail.classList.remove('hidden');
      detail.innerHTML = `<strong>${row.label}: ${row.value}</strong><br>${blurb}`;
    });
  });

  const watch = $('#playerWatch');
  if (watch) {
    watch.innerHTML = KEY_PLAYERS.map((p, idx) => `
      <button type="button" class="player-card player-card-btn" data-player-idx="${idx}" aria-expanded="false">
        <div class="player-card-top">
          <span class="player-name">${p.num && p.num !== '—' ? '#' + p.num + ' ' : ''}${p.name}</span>
          <span class="player-pos">${p.pos}</span>
        </div>
        <div class="player-note">${p.note}</div>
        <div class="player-stats">${p.stats || ''}</div>
        <div class="player-expand-hint">Tap for details ▾</div>
        <div class="player-detail-body hidden"></div>
      </button>
    `).join('');

    watch.querySelectorAll('[data-player-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-player-idx'), 10);
        const p = KEY_PLAYERS[idx];
        if (!p) return;
        const body = btn.querySelector('.player-detail-body');
        const hint = btn.querySelector('.player-expand-hint');
        const wasOpen = body && !body.classList.contains('hidden');
        watch.querySelectorAll('.player-detail-body').forEach((el) => el.classList.add('hidden'));
        watch.querySelectorAll('.player-card-btn').forEach((b) => {
          b.setAttribute('aria-expanded', 'false');
          const h = b.querySelector('.player-expand-hint');
          if (h) h.textContent = 'Tap for details ▾';
        });
        if (wasOpen || !body) return;
        body.classList.remove('hidden');
        body.textContent = p.detail || p.stats || p.note;
        btn.setAttribute('aria-expanded', 'true');
        if (hint) hint.textContent = 'Tap to close ▴';
      });
    });
  }

  renderDepthChart();
}

/* ---------- Init ---------- */
function init() {
  if (isDockWindow()) {
    document.body.classList.add('dock-mode');
    document.title = 'Texans HQ · Dock';
  }
  setVersionPill(isDockWindow() ? APP_VERSION + ' · Dock' : APP_VERSION_LABEL);
  bindLiveKeepAlive();
  // Hard-disable demo path every boot (anti-distortion)
  if (typeof LIVE_DEMO !== 'undefined') LIVE_DEMO.active = false;
  // Purge schema-mismatched caches
  try {
    if (typeof purgeStaleCache === 'function') {
      purgeStaleCache(ROSTER_CACHE_KEY, CACHE_SCHEMA.roster);
      purgeStaleCache(CAMP_CACHE_KEY, CACHE_SCHEMA.camp);
      purgeStaleCache(NEWS_CACHE_KEY, CACHE_SCHEMA.news);
      purgeStaleCache(VIDEO_CACHE_KEY, CACHE_SCHEMA.videos);
    }
  } catch (e) {}
  const selfTest = typeof runIntegritySelfTest === 'function' ? runIntegritySelfTest() : { ok: true, issues: [] };
  if (!selfTest.ok) {
    console.warn('Texans HQ integrity:', selfTest.issues);
  }
  // Seed roster from baked list immediately (integrity runs here)
  applyActiveRoster(FULL_ROSTER.slice(), 'baked', null);
  if (!selfTest.ok && ROSTER_META) {
    ROSTER_META.warning = (ROSTER_META.warning ? ROSTER_META.warning + ' · ' : '') + 'Boot check: ' + selfTest.issues.slice(0, 2).join('; ');
  }
  if (typeof expandSchemeFingerprints === 'function') expandSchemeFingerprints();
  if (typeof bindSchedToggle === 'function') bindSchedToggle();
  renderSchedule();
  renderGameCenter();
  renderCamp();
  renderStats();
  loadNotes();
  if (typeof bindBackupUi === 'function') bindBackupUi();
  const newsBtn = $('#newsRefreshBtn');
  if (newsBtn) {
    newsBtn.addEventListener('click', () => loadNews(true));
  }
  const campBtn = $('#campRefreshBtn');
  if (campBtn) {
    campBtn.addEventListener('click', () => loadCamp(true));
  }
  const videosBtn = $('#videosRefreshBtn');
  if (videosBtn) {
    videosBtn.addEventListener('click', () => loadVideos(true));
  }
  const rosterBtn = $('#rosterRefreshBtn');
  if (rosterBtn && !rosterBtn.dataset.bound) {
    rosterBtn.dataset.bound = '1';
    rosterBtn.addEventListener('click', async () => {
      rosterBtn.disabled = true;
      rosterBtn.textContent = 'Updating…';
      try {
        await loadRoster(true);
        renderRoster();
      } catch (e) {
        applyActiveRoster(FULL_ROSTER.slice(), 'baked', null);
        renderRoster();
      } finally {
        rosterBtn.disabled = false;
        rosterBtn.textContent = 'Refresh';
      }
    });
  }
  // Pre-warm feeds in background (network, non-blocking)
  setTimeout(() => loadNews(false), 600);
  setTimeout(() => loadCamp(false), 900);
  setTimeout(() => loadVideos(false), 1200);
  // Live roster: try ESPN, else cache, else baked — always integrity-checked
  setTimeout(async () => {
    try {
      await loadRoster(true);
      if (currentSection === 'roster') renderRoster();
    } catch (e) { /* offline ok */ }
  }, 500);
  // Week slate first (one scoreboard), then ONE live summary for the selected game
  setTimeout(async () => {
    try {
      if (typeof loadWeekSlate === 'function') {
        await loadWeekSlate(!(WEEK_SLATE.games && WEEK_SLATE.games.length));
        if (typeof bootstrapCurrentGame === 'function') bootstrapCurrentGame();
      }
      renderSchedule();
      if (typeof renderWatchStrips === 'function') renderWatchStrips();
      await refreshLiveGame();
      renderGameCenter();
    } catch (e) { /* offline / CORS ok — pre-game path still works */ }
    startLiveGamePoll();
    if (typeof startSlatePoll === 'function') startSlatePoll();
  }, 400);
}

/* Start: check password first */
try {
  if (isDockWindow()) {
    document.body.classList.add('dock-mode');
    document.title = 'Texans HQ · Dock';
  }
} catch (e) {}
if (setupLock()) {
  // Already unlocked on this device
  init();
}
