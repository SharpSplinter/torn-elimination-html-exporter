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

test('standalone userscript exposes three uniquely labelled export actions', () => {
  assert.equal(exporter.VERSION, '1.5.0');
  assert.deepEqual(Object.keys(exporter.BUTTON_LABELS), ['newsletter', 'discord', 'leaderboard']);
  assert.match(exporter.BUTTON_LABELS.newsletter, /Elimination Alliance Update/);
  assert.match(exporter.BUTTON_LABELS.discord, /Discord Markdown/);
  assert.match(exporter.BUTTON_LABELS.leaderboard, /Full Faction Leaderboard/);
  assert.notEqual(exporter.BUTTON_LABELS.newsletter, exporter.BUTTON_LABELS.leaderboard);
  assert.notEqual(exporter.BUTTON_LABELS.newsletter, exporter.BUTTON_LABELS.discord);
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
      return { factions: [{ id: 1 }], players: [{ id: 2 }], generatedAt: 'test' };
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

test('export controls are compact inline buttons beside the Elimination heading', () => {
  assert.match(source, /matches\('h1,h2,h3,h4,h5,\[role="heading"\]'\)/);
  assert.match(source, /header\.appendChild\(panel\)/);
  assert.match(source, />HTML Export<\/button>/);
  assert.match(source, />Discord Export<\/button>/);
  assert.match(source, />Full Faction Export<\/button>/);
  assert.match(source, /#tehe-export-controls\{display:inline-flex/);
  assert.doesNotMatch(source, /#tehe-export-panel\{position:fixed/);
});

test('each export opens detailed progress first and requires an explicit clipboard click', () => {
  assert.match(source, /id = 'tehe-progress-overlay'/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /data-progress-percent>0%/);
  assert.match(source, /API requests: discovering/);
  assert.match(source, /Members: discovering/);
  assert.match(source, /Chunks: discovering/);
  assert.match(source, /MEMBER_PROGRESS_CHUNK_SIZE = 10/);
  assert.match(source, />Copy to Clipboard<\/button>/);
  assert.match(source, /Export ready\. Nothing has been copied yet\./);
  assert.match(source, /picker\.addEventListener\('change', displaySelectedExport\)/);
  assert.match(source, /copyButton\.addEventListener\('click', async \(\) =>/);
  assert.doesNotMatch(source, /Message 1 was copied automatically/);
  assert.doesNotMatch(source, /await deliver(?:Html|Discord)\(/);
});

test('clipboard-only requirement has no download implementation', () => {
  assert.doesNotMatch(source, /downloadHtml|createObjectURL|\.download\s*=/);
  assert.match(source, /GM_setClipboard/);
  assert.match(source, /navigator\?\.clipboard\?\.writeText/);
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
  assert.match(html, /\(\+6\)/);
  assert.match(html, /\(-1\)/);
  assert.doesNotMatch(html, /href="\[https?:\/\//);
  assert.doesNotMatch(html, /[🏆🥇🥈🥉🟢🔵🔴🚀🧠🌿🪨🌋👁📐✨💣⚡🪑🐈⚔]/u);
  assert.doesNotMatch(html, /<(?:style|script)\b/i);
  assert.doesNotMatch(html, /Authorization|ApiKey|PDA-APIKEY/);
});

test('Discord export mirrors the approved native Markdown layout in mobile-safe messages', () => {
  const messages = exporter.buildDiscordMessages(fixture);
  assert.ok(messages.length >= 3);
  assert.ok(messages.every((message) => message.length <= 1950));
  const markdown = messages.join('\n\n');
  assert.match(markdown, /^# 🏆 ELIMINATION ALLIANCE UPDATE/m);
  assert.match(markdown, /^-# 🥇🥈🥉 Podium/m);
  assert.ok(markdown.includes('## 💜 \\[$3XY\\] NAUGHTY SOULS'));
  assert.match(markdown, /^### 🥇🥈🥉 PODIUM/m);
  assert.match(markdown, /> 🥇 🔴 \*\*\[SuperSheepie\]\(<https:\/\/www\.torn\.com\/profiles\.php\?XID=4009267>\)\*\*/);
  assert.match(markdown, /> -# 🚀 Rocket Scientists #1 • 188 attacks/);
  assert.match(markdown, /Emma\\_Watson\\_/);
  assert.match(markdown, /^# 🔴 DROPPED OUT/m);
  assert.match(markdown, /Brought the intimidating name, left the attacks at zero/);
  assert.doesNotMatch(markdown, /```ansi|\u001b\[/i);
});

test('full leaderboard includes all active and dropped participants by faction', () => {
  const html = exporter.buildLeaderboardHtml(fixture);
  assert.match(html, /FULL ELIMINATION LEADERBOARD/);
  assert.match(html, /16 ELIMINATION PARTICIPANTS/);
  assert.match(html, /4 ELIMINATION PARTICIPANTS/);
  assert.match(html, /Atomic-Toast/);
  assert.match(html, /GORYDAMNREAPER/);
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

test('classification uses current teams and remembered former teams without exposing keys', () => {
  const standings = exporter.normalizeTeamStandings({ elimination: { teams: [{ id: 5, name: 'APEX', score: 999, position: 1 }] } });
  const active = exporter.classifyMember(
    { id: 8, name: 'Active', factionId: 100 },
    { name: 'Elimination', score: 20, attacks: 3, teamName: 'APEX', teamId: 5 },
    null,
    standings,
  );
  const dropped = exporter.classifyMember(
    { id: 9, name: 'Dropped', factionId: 100 },
    { name: 'Elimination', score: 0, attacks: 0, teamName: 'Loose Cannons', teamId: null },
    null,
    standings,
  );
  assert.equal(active.status, 'active');
  assert.equal(active.teamScore, 999);
  assert.equal(dropped.status, 'dropped');
  assert.equal(dropped.teamName, 'Loose Cannons');
  assert.equal(exporter.normalizeCompetition({ competition: { name: 'Elimination', score: 0, attacks: 0, team: 'Loose Cannons', team_id: null } }).teamId, null);
});

test('HTML escaping and faction parsing reject markup and invalid IDs', () => {
  assert.equal(exporter.escapeHtml('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  assert.deepEqual(exporter.parseFactionIds('123, nope; 456 123', 999), [123, 456]);
  assert.deepEqual(exporter.parseFactionIds('', 999), [999]);
});
