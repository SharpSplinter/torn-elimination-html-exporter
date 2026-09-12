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
  assert.deepEqual(Object.keys(exporter.BUTTON_LABELS), ['newsletter', 'discord', 'leaderboard']);
  assert.match(exporter.BUTTON_LABELS.newsletter, /Elimination Alliance Update/);
  assert.match(exporter.BUTTON_LABELS.discord, /Discord Markdown/);
  assert.match(exporter.BUTTON_LABELS.leaderboard, /Full Faction Leaderboard/);
  assert.notEqual(exporter.BUTTON_LABELS.newsletter, exporter.BUTTON_LABELS.leaderboard);
  assert.notEqual(exporter.BUTTON_LABELS.newsletter, exporter.BUTTON_LABELS.discord);
});

test('userscript runs only on the Torn Elimination page', () => {
  const matches = source.match(/^\/\/ @match\s+(.+)$/gm) || [];
  assert.deepEqual(matches, ['// @match        https://www.torn.com/page.php?sid=competition*']);
  assert.doesNotMatch(source, /^\/\/ @match\s+https:\/\/www\.torn\.com\/\*$/m);
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
  assert.match(html, /width:100%;max-width:601px;box-sizing:border-box/);
  assert.match(html, /overflow:hidden;overflow-wrap:anywhere;word-break:break-word/);
  assert.match(html, /text-align:center;font-weight:700/);
  assert.match(html, />A<\/span> <span[^>]*>Alliance Rank/);
  assert.match(html, />F<\/span> <span[^>]*>Faction Rank/);
  assert.match(html, /href="https:\/\/www\.torn\.com\/profiles\.php\?XID=4009267"/);
  assert.match(html, /color:#ef5b55[^>]*>SuperSheepie/);
  assert.match(html, />AX<\/span> <a href="https:\/\/www\.torn\.com\/profiles\.php\?XID=4009267"/);
  assert.match(html, /Formerly <span style="color:#ff9f43/);
  assert.match(html, /DROPPED OUT - WALL OF SHAME/);
  assert.match(html, /Brought the intimidating name/);
  assert.match(html, /▲6/);
  assert.match(html, /▼1/);
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
  assert.deepEqual(ranked.map((entry) => entry.id), [1, 2, 3]);
  assert.equal(ranked[0].movement, 2);
  assert.equal(ranked[0].factionRank, 1);
  assert.equal(ranked[1].factionRank, 2);
  assert.equal(ranked[1].teamRank, 2);
  assert.equal(ranked[2].factionRank, 1);
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
    { name: 'Elimination', score: 0, attacks: 0, teamName: '', teamId: null },
    { teamName: 'Loose Cannons' },
    standings,
  );
  assert.equal(active.status, 'active');
  assert.equal(active.teamScore, 999);
  assert.equal(dropped.status, 'dropped');
  assert.equal(dropped.teamName, 'Loose Cannons');
});

test('HTML escaping and faction parsing reject markup and invalid IDs', () => {
  assert.equal(exporter.escapeHtml('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  assert.deepEqual(exporter.parseFactionIds('123, nope; 456 123', 999), [123, 456]);
  assert.deepEqual(exporter.parseFactionIds('', 999), [999]);
});
