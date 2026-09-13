'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.join(__dirname, 'Torn Elimination HTML Exporter.user.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const exporter = require(scriptPath);

function player(overrides) {
  return {
    id: 1,
    name: 'Player',
    factionId: 100,
    factionName: 'Naughty Souls',
    factionTag: '$3xy',
    teamName: 'APEX',
    status: 'active',
    score: 1388,
    attacks: 100,
    allianceRank: 1,
    factionRank: 1,
    teamRank: 1,
    movement: 0,
    ...overrides,
  };
}

const fixture = {
  factions: [
    { id: 100, name: 'Naughty Souls', tag: '$3xy' },
    { id: 200, name: 'Naughty Sanctuary', tag: 'NaSa' },
  ],
  players: [
    player({ id: 4009267, name: 'SuperSheepie', allianceRank: 1, factionRank: 1, teamRank: 1, attacks: 257 }),
    player({ id: 2712243, name: 'XeQtEr', teamName: 'Rocket Scientists', score: 1402, allianceRank: 2, factionRank: 2, teamRank: 1, attacks: 188 }),
    player({ id: 3862240, name: 'Emma_Watson_', allianceRank: 3, factionRank: 3, teamRank: 2, attacks: 155 }),
    player({ id: 2730860, name: 'Pepe', factionId: 200, factionName: 'Naughty Sanctuary', factionTag: 'NaSa', allianceRank: 4, factionRank: 1, teamRank: 3, attacks: 153 }),
    player({ id: 2329877, name: 'mrmurmur', teamName: 'Rocket Scientists', score: 1402, allianceRank: 5, factionRank: 4, teamRank: 2, attacks: 134 }),
    player({ id: 2008496, name: 'Chipmunk05', teamName: 'Touching Grass', score: 1392, allianceRank: 6, factionRank: 5, teamRank: 1, attacks: 131 }),
    player({ id: 511200, name: 'TrevorSentMe', teamName: 'Loose Cannons', score: 900, allianceRank: 7, factionRank: 6, teamRank: 1, attacks: 125 }),
    player({ id: 4033939, name: 'Daza', factionId: 200, factionName: 'Naughty Sanctuary', factionTag: 'NaSa', teamName: 'Rocket Scientists', score: 1402, allianceRank: 8, factionRank: 2, teamRank: 3, attacks: 116 }),
    player({ id: 3695479, name: 'diabeetus', teamName: 'Conspiracy Theorists', score: 1380, allianceRank: 9, factionRank: 7, teamRank: 1, attacks: 110 }),
    player({ id: 1884498, name: 'Bastid', teamName: 'Rocket Scientists', score: 1402, allianceRank: 10, factionRank: 8, teamRank: 4, attacks: 93 }),
    player({ id: 180991, name: 'stewart_1322', teamName: 'Sticks and Stones', score: 1384, allianceRank: 11, factionRank: 9, teamRank: 1, attacks: 90 }),
    player({ id: 4113817, name: 'Akira-', teamName: 'High Voltage', score: 33, allianceRank: 12, factionRank: 10, teamRank: 1, attacks: 81 }),
    player({ id: 3878312, name: 'MAR_The_Wrecker', teamName: 'Brain Surgeons', score: 1375, allianceRank: 13, factionRank: 11, teamRank: 1, attacks: 77, movement: 6 }),
    player({ id: 1017334, name: 'bluetorpedo', teamName: 'Inanimate Objects', score: 0, allianceRank: 14, factionRank: 12, teamRank: 1, attacks: 75, movement: -1 }),
    player({ id: 433007, name: 'Forewarned', teamName: 'High Voltage', score: 33, allianceRank: 15, factionRank: 13, teamRank: 2, attacks: 75, movement: 8 }),
    player({ id: 3583932, name: 'a1ry', teamName: 'Loose Cannons', status: 'dropped', score: 0, allianceRank: 38, factionRank: 30, teamRank: 2, attacks: 13, movement: 21 }),
    player({ id: 959585, name: 'Five', teamName: 'Sticks and Stones', status: 'dropped', score: 0, allianceRank: 93, factionRank: 52, teamRank: 2, attacks: 0 }),
    player({ id: 4093649, name: 'GORYDAMNREAPER', teamName: 'Loose Cannons', status: 'dropped', score: 0, allianceRank: 101, factionRank: 56, teamRank: 3, attacks: 0 }),
    player({ id: 3676010, name: 'Atomic-Toast', factionId: 200, factionName: 'Naughty Sanctuary', factionTag: 'NaSa', teamName: 'Rocket Scientists', status: 'dropped', score: 0, allianceRank: 65, factionRank: 23, teamRank: 5, attacks: 0 }),
    player({ id: 2911255, name: 'Dscott138', factionId: 200, factionName: 'Naughty Sanctuary', factionTag: 'NaSa', teamName: 'Reptilians', status: 'dropped', score: 0, allianceRank: 84, factionRank: 35, teamRank: 1, attacks: 0 }),
  ],
};

test('standalone userscript exposes one menu with the five exact numbered choices', () => {
  assert.equal(exporter.VERSION, '1.10.0');
  assert.equal(exporter.STORAGE.snapshot, 'tehe.snapshotCache.v5');
  assert.equal(exporter.STORAGE.participants, 'tehe.participantLedger.v2');
  assert.equal(exporter.STORAGE.masterIndex, 'tehe.masterEliminationIndex.v1');
  assert.deepEqual(Object.keys(exporter.BUTTON_LABELS), ['menu', 'newsletter', 'discord', 'leaderboard', 'master']);
  assert.equal(exporter.BUTTON_LABELS.menu, 'Open Elimination Export Menu');
  assert.deepEqual(exporter.EXPORT_MENU_OPTIONS.map((option) => option.label), [
    'Full Faction JSON Export',
    'Newsletter Export',
    'Discord Export',
    'Full Elimination JSON Export',
    'API Settings',
  ]);
  assert.match(exporter.BUTTON_LABELS.newsletter, /Elimination Alliance Update/);
  assert.match(exporter.BUTTON_LABELS.discord, /Discord Markdown/);
  assert.match(exporter.BUTTON_LABELS.leaderboard, /Complete Current Faction Rosters.*No Members Omitted/);
  assert.match(exporter.BUTTON_LABELS.master, /Master Elimination JSON.*Entire Persistent Index/);
  assert.notEqual(exporter.BUTTON_LABELS.newsletter, exporter.BUTTON_LABELS.leaderboard);
  assert.notEqual(exporter.BUTTON_LABELS.newsletter, exporter.BUTTON_LABELS.discord);
});

test('authoritative rankings snapshot imports only active participants and confirmed dropouts', async () => {
  const now = 50_000;
  const shared = {
    schemaVersion: 1,
    source: 'Torn Elimination Faction Rankings',
    sourceVersion: '1.6.0',
    updatedAt: now,
    factions: [{ id: 8317, name: 'Naughty Souls', tag: '$3xy' }],
    teams: [{ id: 1, name: 'APEX', score: 10, lives: 4, position: 2 }],
    members: [
      { id: 1, name: 'Active', factionId: 8317, participating: true, teamId: 1,
        teamName: 'APEX', attacks: 12, allianceRank: 1, factionRank: 1 },
      { id: 2, name: 'Dropped', factionId: 8317, participating: false, droppedOut: true,
        formerTeamId: 1, formerTeamName: 'APEX', attacks: 7, allianceRank: 2, factionRank: 2 },
      { id: 3, name: 'Never Enrolled', factionId: 8317, participating: false,
        teamName: 'Unknown', attacks: 0, allianceRank: 3, factionRank: 3 },
    ],
  };
  const storage = {
    getItem(key) { return key === exporter.SHARED_EXPORT.snapshot ? JSON.stringify(shared) : null; },
  };
  let refreshRequests = 0;
  const snapshot = await exporter.requestSharedExportSnapshot(() => {}, {
    storage,
    now: () => now,
    requestRefresh: () => { refreshRequests += 1; },
  });
  assert.deepEqual(snapshot.players.map((entry) => [entry.name, entry.status]), [
    ['Active', 'active'],
    ['Dropped', 'dropped'],
  ]);
  assert.deepEqual(snapshot.rosterMembers.map((entry) => [entry.name, entry.status]), [
    ['Active', 'active'], ['Dropped', 'dropped'], ['Never Enrolled', 'not_participating'],
  ]);
  assert.equal(snapshot.players[1].formerTeamName, 'APEX');
  assert.equal(refreshRequests, 0);
});

test('five-minute snapshot cache reuses completed data and deduplicates an in-progress lookup', async () => {
  assert.equal(exporter.SNAPSHOT_CACHE_MAX_AGE_MS, 300000);
  let now = 1000;
  let fetches = 0;
  let saved = null;
  let releaseFetch;
  const provider = exporter.createSnapshotProvider({
    now: () => now,
    loadCache: async () => saved,
    saveCache: async (entry) => { saved = entry; },
    fetchSnapshot: async () => {
      fetches += 1;
      await new Promise((resolve) => { releaseFetch = resolve; });
      return {
        factions: [{ id: 1 }],
        players: [{ id: 2 }],
        rosterMembers: [{ id: 2 }],
        teams: [{ id: 1 }],
        masterIndex: { 2: { id: 2 } },
        generatedAt: 'test',
      };
    },
  });

  const first = provider();
  const simultaneous = provider();
  assert.equal(fetches, 0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetches, 1);
  releaseFetch();
  assert.strictEqual(await first, await simultaneous);

  now += 299999;
  assert.strictEqual(await provider(), saved.snapshot);
  assert.equal(fetches, 1);

  now += 1;
  const expired = provider();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetches, 2);
  releaseFetch();
  await expired;
});

test('request scheduler targets 90 calls per minute with bounded concurrency', async () => {
  assert.equal(exporter.REQUESTS_PER_MINUTE, 90);
  assert.equal(exporter.REQUEST_START_INTERVAL_MS, 667);
  assert.equal(exporter.MAX_CONCURRENT_REQUESTS, 6);

  const schedule = exporter.createRequestScheduler({ intervalMs: 3, maxConcurrent: 3 });
  const starts = [];
  let active = 0;
  let peakActive = 0;
  const results = await Promise.all(Array.from({ length: 10 }, (_, index) => schedule(async () => {
    starts.push(Date.now());
    active += 1;
    peakActive = Math.max(peakActive, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
    return index;
  })));

  assert.deepEqual(results, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(peakActive <= 3);
  assert.ok(starts.at(-1) - starts[0] >= 20);
});

test('userscript runs only on the Torn Elimination page', () => {
  const matches = source.match(/^\/\/ @match\s+(.+)$/gm) || [];
  assert.deepEqual(matches, ['// @match        https://www.torn.com/page.php?sid=elimination*']);
  assert.doesNotMatch(source, /^\/\/ @match\s+https:\/\/www\.torn\.com\/page\.php\?sid=competition\*/m);
  assert.doesNotMatch(source, /^\/\/ @match\s+https:\/\/www\.torn\.com\/\*$/m);
});

test('one compact master button beside the heading opens the numbered export menu', () => {
  assert.match(source, /matches\('h1,h2,h3,h4,h5,\[role="heading"\]'\)/);
  assert.match(source, /header\.appendChild\(panel\)/);
  assert.match(source, /data-export-menu/);
  assert.match(source, />Export Menu<\/button>/);
  assert.equal((source.match(/data-export-menu style=/g) || []).length, 1);
  assert.match(source, /\$\{index \+ 1\}\) \$\{escapeHtml\(option\.label\)\}/);
  assert.match(source, /Elimination Export Menu/);
  assert.doesNotMatch(source, /data-export="(?:newsletter|discord|leaderboard|master)"/);
  assert.match(source, /panel\.setAttribute\('style', 'display:inline-flex/);
  assert.doesNotMatch(source, /panel\.innerHTML = `<style>/);
  assert.doesNotMatch(source, /#tehe-export-panel\{position:fixed/);
});

test('each export opens detailed progress first and requires an explicit completion action', () => {
  assert.match(source, /id = 'tehe-progress-overlay'/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /data-progress-percent>0%/);
  assert.match(source, /API requests: discovering/);
  assert.match(source, /Members: discovering/);
  assert.match(source, /Chunks: discovering/);
  assert.match(source, /MEMBER_PROGRESS_CHUNK_SIZE = 10/);
  assert.match(source, /jsonExport \? 'Share JSON File' : 'Copy to Clipboard'/);
  assert.match(source, /Export ready\. Nothing has been copied yet\./);
  assert.match(source, /picker\.addEventListener\('change', displaySelectedExport\)/);
  assert.match(source, /actionButton\.addEventListener\('click', async \(\) =>/);
  assert.doesNotMatch(source, /Message 1 was copied automatically/);
  assert.doesNotMatch(source, /await deliver(?:Html|Discord)\(/);
});

test('JSON exports use Android file sharing with a desktop download fallback', () => {
  assert.match(source, /async function shareJsonFile\(/);
  assert.match(source, /new global\.File\(\[content\], filename/);
  assert.match(source, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(source, /await navigator\.share\(shareData\)/);
  assert.match(source, /error\?\.name === 'AbortError'/);
  assert.match(source, /function downloadJsonFile\(/);
  assert.match(source, /application\/json;charset=utf-8/);
  assert.match(source, /createObjectURL/);
  assert.match(source, /anchor\.download = filename/);
  assert.match(source, /GM_setClipboard/);
  assert.match(source, /navigator\?\.clipboard\?\.writeText/);
  assert.doesNotMatch(source, /downloadHtml/);
});

test('Android sharing sends JSON as a file and cancellation never triggers a download', async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const fileDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'File');
  const shared = [];
  class MockFile {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
    }
  }
  try {
    Object.defineProperty(globalThis, 'File', { configurable: true, value: MockFile });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
      canShare: ({ files }) => files[0] instanceof MockFile,
      share: async (payload) => { shared.push(payload); },
    } });
    assert.equal(await exporter.shareJsonFile('{"ok":true}', 'elim.json'), 'shared');
    assert.equal(shared[0].files[0].name, 'elim.json');
    assert.equal(shared[0].files[0].type, 'application/json;charset=utf-8');

    globalThis.navigator.share = async () => {
      const error = new Error('cancelled');
      error.name = 'AbortError';
      throw error;
    };
    assert.equal(await exporter.shareJsonFile('{}', 'cancelled.json'), 'cancelled');
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (fileDescriptor) Object.defineProperty(globalThis, 'File', fileDescriptor);
    else delete globalThis.File;
  }
});

test('team mapping returns the agreed symbol and player-name color', () => {
  assert.deepEqual(exporter.teamStyle('Rocket Scientists'), {
    name: 'Rocket Scientists', badge: 'RS', icon: '🚀', marker: '🟠', color: '#ff9f43',
  });
  assert.equal(exporter.teamStyle('Brain Surgeons').icon, '🧠');
  assert.equal(exporter.teamStyle('High Voltage').color, '#29abe2');
  assert.equal(exporter.teamStyle('Inanimate Objects').icon, '🪑');
});

test('newsletter preserves centered bold headers, ranks, team styling and roasts', () => {
  const html = exporter.buildNewsletterHtml(fixture);
  assert.match(html, /display:block;width:auto;max-width:601px;min-width:0;margin:0 auto;padding:0;box-sizing:border-box/);
  assert.match(html, /src="https:\/\/cdn\.jsdelivr\.net\/gh\/twitter\/twemoji@14\.0\.2\/assets\/72x72\/1f3c6\.png"/);
  assert.match(html, /display:inline-block !important;width:25px !important;height:25px !important/);
  assert.match(html, /<span[^>]*>1-3<\/span> Podium/);
  assert.match(html, /<span[^>]*>A<\/span> Alliance Rank/);
  assert.match(html, /<span[^>]*>F<\/span> Faction Rank/);
  assert.equal((html.match(/>P[123]<\/span>/g) || []).length, 3);
  assert.match(html, /\[\$3xy\] NAUGHTY SOULS/);
  assert.match(html, /\[NaSa\] NAUGHTY SANCTUARY/);
  assert.ok(html.indexOf('>SuperSheepie</a>') < html.indexOf('>XeQtEr</a>'));
  assert.ok(html.indexOf('>XeQtEr</a>') < html.indexOf('>Emma_Watson_</a>'));
  assert.match(html, /href="https:\/\/www\.torn\.com\/profiles\.php\?XID=4009267"/);
  assert.match(html, /color:#ef5b55[^>]*>SuperSheepie/);
  assert.match(html, />AX<\/span>\s+<span style="color:#ef5b55[^>]*>APEX #1/);
  assert.match(html, /Former <span style="color:#ff9f43/);
  assert.match(html, /DROPPED OUT &mdash; WALL OF SHAME/);
  for (const name of ['a1ry', 'Five', 'GORYDAMNREAPER', 'Atomic-Toast', 'Dscott138']) {
    assert.match(html, new RegExp(`>${name}</a>`));
  }
  assert.doesNotMatch(html, /Former <span[^>]*>Loose Cannons #/);
  assert.match(html, /Brought the intimidating name/);
  assert.ok(html.indexOf('PODIUM') < html.indexOf('ALLIANCE TOP 10'));
  assert.ok(html.indexOf('ALLIANCE TOP 10') < html.indexOf('ALLIANCE TOP 15'));
  assert.ok(html.indexOf('ALLIANCE TOP 15') < html.indexOf('DROPPED OUT &mdash; WALL OF SHAME'));
  assert.ok(html.indexOf('DROPPED OUT &mdash; WALL OF SHAME') < html.indexOf('[\$3xy] NAUGHTY SOULS'));
  assert.match(html, /\(\+6\)/);
  assert.match(html, /\(-1\)/);
  assert.doesNotMatch(html, /href="\[https?:\/\//);
  assert.doesNotMatch(html, /[🏆🥇🥈🥉🟢🔵🔴🚀🧠🌿🪨🌋👁📐✨💣⚡🪑🐈⚔]/u);
  assert.doesNotMatch(html, /<(?:style|script)\b/i);
  assert.doesNotMatch(html, /Authorization|ApiKey|PDA-APIKEY/);
});

test('Discord export mirrors the approved native Markdown layout in mobile-safe messages', () => {
  const messages = exporter.buildDiscordMessages(fixture);
  assert.equal(messages.length, 3);
  assert.ok(messages.every((message) => message.length <= 1950));
  const markdown = messages.join('\n\n');
  assert.match(markdown, /^# 🏆 ELIMINATION ALLIANCE UPDATE/m);
  assert.match(markdown, /^-# 🥇🥈🥉 Podium/m);
  assert.match(markdown, /^### 🥇🥈🥉 PODIUM/m);
  assert.match(markdown, /> 🥇 💜 🔴 \*\*\[SuperSheepie\]\(<https:\/\/www\.torn\.com\/profiles\.php\?XID=4009267>\)\*\*/);
  assert.match(markdown, /> -# 🚀 Rocket Scientists #1 • 188 attacks/);
  assert.match(markdown, /Emma\\_Watson\\_/);
  assert.match(markdown, /^# 🔴 DROPPED OUT/m);
  assert.match(markdown, /Intimidating name, zero attacks, absolutely nothing reaped/);
  assert.doesNotMatch(messages[0], /DROPPED OUT\n-# WALL OF SHAME/);
  assert.doesNotMatch(messages[1], /DROPPED OUT\n-# WALL OF SHAME/);
  assert.match(messages[2], /DROPPED OUT\n-# WALL OF SHAME/);
  assert.match(messages[2], /## 💜 \\\[\$3XY\\\] NAUGHTY SOULS/);
  assert.doesNotMatch(messages[0], /## 💜/);
  assert.doesNotMatch(messages[1], /## 💜/);
  assert.doesNotMatch(markdown, /```ansi|\u001b\[/i);
});

test('full faction JSON contains every current roster member and separates nonparticipants', () => {
  const rosterMembers = [
    ...fixture.players,
    player({ id: 7001, name: 'NeverEnrolledNS', status: 'not_participating', teamName: '', attacks: 0 }),
    player({ id: 7002, name: 'NeverEnrolledNA', factionId: 200, factionName: 'Naughty Sanctuary', factionTag: 'NaSa', status: 'not_participating', teamName: '', attacks: 0 }),
  ];
  const json = exporter.buildFactionJson({ ...fixture, rosterMembers, eventKey: '2026:1,2', scope: '8317:44817' });
  const payload = JSON.parse(json);
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.exportType, 'torn-elimination-full-faction-rosters');
  assert.equal(payload.exporterVersion, '1.10.0');
  assert.equal(payload.summary.factionCount, 2);
  assert.equal(payload.summary.memberCount, 22);
  assert.equal(payload.summary.participantCount, 20);
  assert.equal(payload.summary.activeCount, 15);
  assert.equal(payload.summary.droppedOutCount, 5);
  assert.equal(payload.summary.notParticipatingCount, 2);
  assert.deepEqual(payload.factions.map((faction) => faction.memberCount), [17, 5]);
  assert.equal(payload.factions[0].members.some((entry) => entry.name === 'NeverEnrolledNS' && entry.status === 'not_participating'), true);
  assert.equal(payload.factions[1].members.some((entry) => entry.name === 'Atomic-Toast' && entry.status === 'dropped'), true);
  assert.equal(json.includes('<div'), false);
  assert.match(exporter.factionJsonFilename(fixture, new Date('2026-09-12T12:34:56.000Z')),
    /^torn-elimination-3xy-NaSa-2026-09-12T12-34-56-000Z\.json$/);
});

test('rank assignment is deterministic and calculates faction, team and movement ranks', () => {
  const ranked = exporter.assignRanks([
    player({ id: 2, name: 'Beta', score: 10, attacks: 5, factionId: 100, teamName: 'APEX' }),
    player({ id: 1, name: 'Alpha', score: 10, attacks: 8, factionId: 100, teamName: 'APEX' }),
    player({ id: 3, name: 'Gamma', score: 9, attacks: 50, factionId: 200, teamName: 'Rocket Scientists' }),
  ], { 1: { allianceRank: 3 } });
  assert.deepEqual(ranked.map((entry) => entry.id), [3, 1, 2]);
  assert.equal(ranked[0].factionRank, 1);
  assert.equal(ranked[1].movement, 1);
  assert.equal(ranked[1].factionRank, 1);
  assert.equal(ranked[1].teamRank, 1);
  assert.equal(ranked[2].factionRank, 2);
  assert.equal(ranked[2].teamRank, 2);
});

test('classification admits only confirmed participants, preserves scores, and makes dropout terminal', () => {
  const standings = exporter.normalizeTeamStandings({ elimination: { teams: [{ id: 5, name: 'APEX', score: 999, lives: 4, position: 1, eliminated: false }, { id: 6, name: 'Loose Cannons', lives: 0, eliminated: false }] } });
  const active = exporter.classifyMember(
    { id: 8, name: 'Active', factionId: 100 },
    exporter.normalizeCompetition({ competition: { Competition: 'Elimination', Team: 'APEX', Attacks: 3, team_id: null, Score: 20 } }),
    { enrolled: true, status: 'active', attacks: 10, score: 25, teamName: 'APEX' },
    standings,
  );
  const nonparticipant = exporter.classifyMember(
    { id: 9, name: 'Never Enrolled', factionId: 100 },
    exporter.normalizeCompetition({ competition: { Competition: 'Elimination', Team: 'Unknown', Attacks: 0, team_id: null } }),
    null,
    standings,
  );
  const defeated = exporter.classifyMember(
    { id: 10, name: 'Defeated', factionId: 100 },
    exporter.normalizeCompetition({ competition: { Competition: 'Elimination', Team: 'Unknown', Attacks: 4, team_id: null } }),
    { enrolled: true, status: 'active', attacks: 7, teamName: 'Loose Cannons' },
    standings,
  );
  const terminal = exporter.classifyMember(
    { id: 11, name: 'Terminal', factionId: 100 },
    exporter.normalizeCompetition({ competition: { Competition: 'Elimination', Team: 'APEX', Attacks: 99, team_id: null } }),
    { enrolled: true, status: 'dropped', attacks: 12, teamName: 'APEX' },
    standings,
  );
  assert.equal(active.status, 'active');
  assert.equal(active.teamScore, 999);
  assert.equal(active.attacks, 10);
  assert.equal(active.score, 25);
  assert.equal(active.teamId, 5);
  assert.equal(active.initialTeamSnapshot.name, 'APEX');
  assert.equal(nonparticipant.status, 'not_participating');
  assert.equal(nonparticipant.enrolled, false);
  assert.equal(defeated.status, 'dropped');
  assert.equal(defeated.attacks, 7);
  assert.equal(terminal.status, 'dropped');
  assert.equal(terminal.attacks, 12);
  assert.equal(standings.byId.get(6).eliminated, true);
  const normalized = exporter.normalizeCompetition({ competition: { Competition: 'Elimination', Score: 0, Attacks: 0, Team: 'Loose Cannons', team_id: 99 } });
  assert.equal(normalized.teamName, 'Loose Cannons');
  assert.equal(normalized.teamId, null);
  assert.equal(normalized.rawTeamId, 99);
});

test('team details use two-digit standing IDs, expose placements, and index attack snapshots', () => {
  const standings = exporter.normalizeTeamStandings({ elimination: { teams: [
    { id: 5, name: 'APEX', position: 1, lives: 7, score: 100 },
    { id: 12, name: 'Gold Dust', position: 12, lives: 0, score: 5 },
  ] } });
  assert.equal(standings.byId.get(12).eliminated, true);
  assert.equal(exporter.exportTeamRecord(standings.byId.get(5)).twoDigitId, '05');
  assert.equal(exporter.exportTeamRecord(standings.byId.get(5)).placement, '1st/12th place');
  assert.equal(exporter.exportTeamRecord(standings.byId.get(12)).placement, '12th/12th place');
  const detail = exporter.normalizeEliminationTeam({ eliminationteam: {
    id: 5, name: 'APEX', position: 1, lives: 7,
    members: { 8: { name: 'Active', attacks: 14, score: 20 } },
  } }, standings.byId.get(5));
  assert.equal(detail.members[0].id, 8);
  assert.equal(detail.members[0].attacks, 14);
  assert.equal(exporter.indexEliminationTeamMembers([detail]).get(8).teamId, 5);
});

test('master index persists initial teams, terminal attacks, current rosters, and historical members', () => {
  const snapshot = {
    factions: fixture.factions,
    teams: [{ id: 5, name: 'APEX', position: 1, lives: 7, score: 100 }],
    players: [
      player({ id: 1, name: 'Active', teamId: 5, teamName: 'APEX', teamPosition: 1,
        teamPlacement: '1st/12th place', initialTeamSnapshot: { id: 5, name: 'APEX', capturedAt: 'initial' } }),
      player({ id: 2, name: 'Dropped', status: 'dropped', teamId: 6, teamName: 'Loose Cannons', attacks: 9,
        initialTeamSnapshot: { id: 6, name: 'Loose Cannons', capturedAt: 'initial' } }),
    ],
    rosterMembers: [
      { id: 1, name: 'Active', factionId: 100, factionName: 'Naughty Souls', factionTag: '$3xy' },
      { id: 2, name: 'Dropped', factionId: 100, factionName: 'Naughty Souls', factionTag: '$3xy' },
      { id: 3, name: 'Never', factionId: 100, factionName: 'Naughty Souls', factionTag: '$3xy', status: 'not_participating' },
    ],
    generatedAt: '2026-09-13T00:00:00.000Z',
  };
  const master = exporter.updateMasterIndex(snapshot, {
    4: { id: 4, name: 'Historical', status: 'dropped', attacks: 4, currentRosterMember: true,
      initialTeamSnapshot: { id: 7, name: 'High Voltage', capturedAt: 'old' },
      finalAttackSnapshot: { attacks: 4, capturedAt: 'old-final' } },
  }, '2026-09-13T00:00:00.000Z');
  assert.equal(Object.keys(master).length, 4);
  assert.equal(master[1].initialTeamSnapshot.name, 'APEX');
  assert.equal(master[2].status, 'dropped');
  assert.equal(master[2].finalAttackSnapshot.attacks, 9);
  assert.equal(master[3].status, 'not_participating');
  assert.equal(master[4].currentRosterMember, false);
  const payload = JSON.parse(exporter.buildMasterElimJson({ ...snapshot, masterIndex: master }));
  assert.equal(payload.exportType, 'torn-elimination-master-index');
  assert.equal(payload.summary.indexedMemberCount, 4);
  assert.equal(payload.summary.currentRosterCount, 3);
  assert.equal(payload.teams[0].placement, '1st/12th place');
});

test('TornPDA injected keys are accepted and API fields live only in menu option five', () => {
  assert.equal(exporter.isUsableKey('###PDA-APIKEY###'), false);
  assert.equal(exporter.isUsableKey('injected-public-key-123'), true);
  assert.match(source, /TornPDA injected key/);
  assert.match(source, /data-key-source/);
  assert.match(source, /function configureApiSettings\(\)/);
  assert.match(source, /Choose the API-key source and faction scope used by all four exports/);
  assert.match(source, /kind === 'settings'/);
  assert.match(source, /config = await loadExportConfig\(\)/);
  assert.doesNotMatch(source, /configureExport\(kind\)/);
});

test('completion reconciles API, member, and chunk counters before displaying 100 percent', () => {
  assert.match(source, /apiCompleted: current\.apiTotal \?\? current\.apiCompleted/);
  assert.match(source, /membersCompleted: current\.membersTotal \?\? current\.membersCompleted/);
  assert.match(source, /chunksCompleted: current\.chunksTotal \?\? current\.chunksCompleted/);
});

test('supplied roster seed contains only enrolled participants and skips terminal dropouts', () => {
  assert.equal(exporter.PARTICIPANT_SEED.length, 63);
  assert.equal(exporter.PARTICIPANT_SEED.filter((entry) => entry.status === 'active').length, 55);
  assert.equal(exporter.PARTICIPANT_SEED.filter((entry) => entry.status === 'dropped').length, 8);
  const ledger = exporter.readParticipantLedger({});
  const plan = exporter.participantLookupPlan([
    { id: 9999999, name: 'Not Enrolled', factionId: 8317, factionName: 'Naughty Souls', factionTag: '$3xy' },
  ], ledger, [8317, 44817]);
  assert.equal(plan.lookups.length, 56);
  assert.equal(plan.frozen.length, 8);
  assert.ok(plan.frozen.every((entry) => entry.status === 'dropped'));
  assert.ok(plan.lookups.some((entry) => entry.id === 9999999));
});

test('unseeded factions receive one roster discovery plan', () => {
  const members = [
    { id: 7001, name: 'One', factionId: 999 },
    { id: 7002, name: 'Two', factionId: 999 },
  ];
  const plan = exporter.participantLookupPlan(members, exporter.readParticipantLedger({}), [999]);
  assert.deepEqual(plan.lookups.map((entry) => entry.id), [7001, 7002]);
  assert.equal(plan.frozen.length, 0);
});

test('participant ledger is durable, non-regressing, and never reactivates a dropout', () => {
  const ledger = exporter.readParticipantLedger({
    3583932: { id: 3583932, enrolled: true, status: 'active', attacks: 1, teamName: 'APEX' },
  });
  assert.equal(ledger[3583932].status, 'dropped');
  assert.equal(ledger[3583932].attacks, 19);
  const saved = exporter.serializeParticipantLedger([
    { ...ledger[3583932], status: 'active', attacks: 100, allianceRank: 20, factionRank: 15 },
  ], ledger);
  assert.equal(saved[3583932].status, 'dropped');
  assert.equal(saved[3583932].attacks, 19);
  assert.equal(saved[3583932].allianceRank, 20);
  assert.match(exporter.STORAGE.participants, /participantLedger/);
  assert.match(exporter.STORAGE.exports, /generatedExports/);
});

test('zero-attack dropout rank anchors advance only when active participants begin scoring', () => {
  const seed = exporter.PARTICIPANT_SEED.map((entry) => ({ ...entry, score: 0 }));
  const previous = Object.fromEntries(seed.map((entry) => [entry.id, entry]));
  const first = exporter.assignRanks(seed, previous);
  const atomic = first.find((entry) => entry.id === 3676010);
  assert.equal(atomic.allianceRank, 65);
  assert.equal(atomic.factionRank, 23);
  const saved = exporter.serializeParticipantLedger(first, previous);
  const changed = first.map((entry) => entry.id === 4046561 ? { ...entry, attacks: 1 } : { ...entry });
  const second = exporter.assignRanks(changed, saved);
  const updatedAtomic = second.find((entry) => entry.id === 3676010);
  assert.equal(updatedAtomic.allianceRank, 66);
  assert.equal(updatedAtomic.factionRank, 24);
});

test('team ranks exclude dropped participants', () => {
  const ranked = exporter.assignRanks([
    player({ id: 1, name: 'Active One', teamName: 'APEX', attacks: 10 }),
    player({ id: 2, name: 'Dropped', teamName: 'APEX', attacks: 9, status: 'dropped' }),
    player({ id: 3, name: 'Active Two', teamName: 'APEX', attacks: 8 }),
  ]);
  assert.equal(ranked.find((entry) => entry.id === 1).teamRank, 1);
  assert.equal(ranked.find((entry) => entry.id === 2).teamRank, null);
  assert.equal(ranked.find((entry) => entry.id === 3).teamRank, 2);
});

test('full supplied baseline renders exactly three messages and all confirmed dropouts', () => {
  const factions = [
    { id: 8317, name: 'Naughty Souls', tag: '$3xy' },
    { id: 44817, name: 'Naughty Sanctuary', tag: 'NaSa' },
  ];
  const previous = Object.fromEntries(exporter.PARTICIPANT_SEED.map((entry) => [entry.id, entry]));
  const players = exporter.assignRanks(exporter.PARTICIPANT_SEED.map((entry) => ({ ...entry, score: 0 })), previous);
  const messages = exporter.buildDiscordMessages({ factions, players });
  assert.equal(messages.length, 3);
  assert.ok(messages.every((message) => message.length <= 1950));
  assert.match(messages[0], /SuperSheepie/);
  assert.match(messages[1], /SharpSplinter/);
  for (const name of ['a1ry', 'Atomic-Toast', 'Dscott138', 'Five', 'GORYDAMNREAPER', 'jinglely', 'KidLaRona', 'smk47']) {
    assert.match(messages[2], new RegExp(name));
    assert.doesNotMatch(`${messages[0]}${messages[1]}`, new RegExp(name));
  }
});

test('live standings are mandatory and the exact endpoint is used without a silent fallback', () => {
  assert.match(source, /scheduledApiGet\('\/torn\/elimination'\)/);
  assert.doesNotMatch(source, /scheduledApiGet\('\/torn\/elimination'\)\.catch/);
  assert.match(source, /response contained no team standings/);
  assert.match(source, /scheduledApiGet\(`\/torn\/\$\{team\.id\}\/eliminationteam`\)/);
  assert.match(source, /standings\.teams\.filter\(\(team\) => !team\.eliminated && team\.lives !== 0\)/);
});

test('HTML escaping and faction parsing reject markup and invalid IDs', () => {
  assert.equal(exporter.escapeHtml('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  assert.deepEqual(exporter.parseFactionIds('123, nope; 456 123', 999), [123, 456]);
  assert.deepEqual(exporter.parseFactionIds('', 999), [999]);
});
