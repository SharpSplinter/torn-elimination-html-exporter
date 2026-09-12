// ==UserScript==
// @name         Torn Elimination HTML Exporter
// @namespace    https://github.com/SharpSplinter/torn-elimination-html-exporter
// @version      1.8.0
// @description  Export styled Torn HTML newsletters, Discord updates, and full faction Elimination JSON files.
// @author       SharpSplinter
// @homepageURL  https://github.com/SharpSplinter/torn-elimination-html-exporter
// @supportURL   https://github.com/SharpSplinter/torn-elimination-html-exporter/issues
// @downloadURL  https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js
// @updateURL    https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js
// @match        https://www.torn.com/page.php?sid=elimination*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @connect      api.torn.com
// @run-at       document-end
// ==/UserScript==

(function eliminationHtmlExporter(global) {
  'use strict';

  const VERSION = '1.8.0';
  const API_BASE = 'https://api.torn.com/v2';
  const PDA_API_KEY = '###PDA-APIKEY###';
  const BUTTON_LABELS = Object.freeze({
    newsletter: 'Export Torn HTML — Elimination Alliance Update (Top Performers, Team Styling & Dropout Roast)',
    discord: 'Export Discord Markdown — Elimination Alliance Update (Three Mobile-Safe Messages with Team Icons & Dropout Roast)',
    leaderboard: 'Export JSON File — Full Faction Elimination Rankings (Current Faction; Alliance/Additional Factions Optional)',
  });
  const STORAGE = Object.freeze({
    apiKey: 'tehe.apiKey',
    factionIds: 'tehe.factionIds',
    history: 'tehe.rankHistory.v4',
    snapshot: 'tehe.snapshotCache.v4',
    participants: 'tehe.participantLedger.v2',
    exports: 'tehe.generatedExports.v1',
  });
  const SHARED_EXPORT = Object.freeze({
    snapshot: 'tefr.sharedEliminationSnapshot.v1',
    progress: 'tefr.sharedEliminationProgress.v1',
    bridge: 'tefr.sharedEliminationBridge.v1',
    requestEvent: 'tefr:request-refresh',
    updatedEvent: 'tefr:snapshot-updated',
    schemaVersion: 1,
    bridgeTtlMs: 2 * 60 * 1000,
    refreshWaitMs: 5 * 60 * 1000,
    pollMs: 350,
  });
  const SNAPSHOT_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
  const REQUESTS_PER_MINUTE = 90;
  const REQUEST_START_INTERVAL_MS = Math.ceil(60000 / REQUESTS_PER_MINUTE);
  const MAX_CONCURRENT_REQUESTS = 6;
  const MEMBER_PROGRESS_CHUNK_SIZE = 10;

  const TEAM_STYLES = Object.freeze({
    'rocket scientists': { name: 'Rocket Scientists', badge: 'RS', icon: '🚀', marker: '🟠', color: '#ff9f43' },
    'brain surgeons': { name: 'Brain Surgeons', badge: 'BS', icon: '🧠', marker: '🔵', color: '#56c7f2' },
    'touching grass': { name: 'Touching Grass', badge: 'TG', icon: '🌿', marker: '🟢', color: '#9ac300' },
    'sticks and stones': { name: 'Sticks and Stones', badge: 'SS', icon: '🪨', marker: '🟤', color: '#d4632d' },
    apex: { name: 'APEX', badge: 'AX', icon: '🌋', marker: '🔴', color: '#ef5b55' },
    reptilians: { name: 'Reptilians', badge: 'RP', icon: '👁️', marker: '🟢', color: '#95a76f' },
    'conspiracy theorists': { name: 'Conspiracy Theorists', badge: 'CT', icon: '📐', marker: '🔷', color: '#42b6d0' },
    'gold dust': { name: 'Gold Dust', badge: 'GD', icon: '✨', marker: '🟡', color: '#f2b544' },
    'loose cannons': { name: 'Loose Cannons', badge: 'LC', icon: '💣', marker: '🟣', color: '#9ca8cc' },
    'high voltage': { name: 'High Voltage', badge: 'HV', icon: '⚡', marker: '🔵', color: '#29abe2' },
    'inanimate objects': { name: 'Inanimate Objects', badge: 'IO', icon: '🪑', marker: '⚪', color: '#e1e5e5' },
    'nine lives': { name: 'Nine Lives', badge: 'NL', icon: '🐈', marker: '⚪', color: '#b8bed8' },
  });

  const DEFAULT_ALLIANCE_FACTION_IDS = Object.freeze([8317, 44817]);
  const PARTICIPANT_SEED_DATA = Object.freeze([
    [4009267, 'SuperSheepie', 8317, 'Naughty Souls', '$3xy', 'APEX', 324, 'active', 1],
    [2712243, 'XeQtEr', 8317, 'Naughty Souls', '$3xy', 'Rocket Scientists', 210, 'active', 2],
    [3862240, 'Emma_Watson_', 8317, 'Naughty Souls', '$3xy', 'APEX', 185, 'active', 3],
    [2730860, 'Pepe', 44817, 'Naughty Sanctuary', 'NaSa', 'APEX', 175, 'active', 4],
    [2008496, 'Chipmunk05', 8317, 'Naughty Souls', '$3xy', 'Touching Grass', 165, 'active', 5],
    [4033939, 'Daza', 44817, 'Naughty Sanctuary', 'NaSa', 'Rocket Scientists', 140, 'active', 6],
    [511200, 'TrevorSentMe', 8317, 'Naughty Souls', '$3xy', 'Loose Cannons', 140, 'active', 7],
    [2329877, 'mrmurmur', 8317, 'Naughty Souls', '$3xy', 'Rocket Scientists', 134, 'active', 8],
    [3695479, 'diabeeetus', 8317, 'Naughty Souls', '$3xy', 'Conspiracy Theorists', 126, 'active', 9],
    [1884498, 'Bastid', 8317, 'Naughty Souls', '$3xy', 'Rocket Scientists', 119, 'active', 10],
    [1017334, 'bluetorpedo', 8317, 'Naughty Souls', '$3xy', 'Inanimate Objects', 107, 'active', 11],
    [3155545, 'Geegox', 8317, 'Naughty Souls', '$3xy', 'Inanimate Objects', 96, 'active', 12],
    [4113817, 'Akira-', 8317, 'Naughty Souls', '$3xy', 'High Voltage', 94, 'active', 13],
    [180991, 'stewart_1322', 8317, 'Naughty Souls', '$3xy', 'Sticks and Stones', 90, 'active', 14],
    [351311, 'SharpSplinter', 8317, 'Naughty Souls', '$3xy', 'Rocket Scientists', 84, 'active', 15],
    [3878312, 'MAR_The_Wrecker', 8317, 'Naughty Souls', '$3xy', 'Brain Surgeons', 77, 'active', 16],
    [433007, 'Forewarned', 8317, 'Naughty Souls', '$3xy', 'High Voltage', 75, 'active', 17],
    [2759312, 'Alterend', 44817, 'Naughty Sanctuary', 'NaSa', 'Loose Cannons', 61, 'active', 18],
    [439563, 'bekoe', 8317, 'Naughty Souls', '$3xy', 'Gold Dust', 61, 'active', 19],
    [3875439, 'JOHNWICK0800', 8317, 'Naughty Souls', '$3xy', 'Touching Grass', 60, 'active', 20],
    [2199693, 'sopwithcamel74', 8317, 'Naughty Souls', '$3xy', 'Sticks and Stones', 58, 'active', 21],
    [315131, '84t0n9', 8317, 'Naughty Souls', '$3xy', 'Inanimate Objects', 57, 'active', 22],
    [2276692, 'Capnaron', 8317, 'Naughty Souls', '$3xy', 'Nine Lives', 56, 'active', 23],
    [2790448, 'SwivelDice2511', 44817, 'Naughty Sanctuary', 'NaSa', 'Nine Lives', 47, 'active', 24],
    [556477, 'Cool_Connor', 44817, 'Naughty Sanctuary', 'NaSa', 'Brain Surgeons', 41, 'active', 25],
    [3904552, 'amoore1817', 44817, 'Naughty Sanctuary', 'NaSa', 'APEX', 34, 'active', 26],
    [1893293, '-VJ-', 8317, 'Naughty Souls', '$3xy', 'Gold Dust', 33, 'active', 27],
    [2148992, 'Vulpes_Ramos', 44817, 'Naughty Sanctuary', 'NaSa', 'Conspiracy Theorists', 31, 'active', 28],
    [3513709, 'WO1VERINE', 8317, 'Naughty Souls', '$3xy', 'APEX', 30, 'active', 29],
    [1160594, 'DamianWayne', 8317, 'Naughty Souls', '$3xy', 'Reptilians', 29, 'active', 30],
    [4143951, 'Jack_Hammer7697', 44817, 'Naughty Sanctuary', 'NaSa', 'Reptilians', 27, 'active', 31],
    [3765920, 'R34P3R6666', 8317, 'Naughty Souls', '$3xy', 'Reptilians', 25, 'active', 32],
    [4002553, 'Scorpio23', 8317, 'Naughty Souls', '$3xy', 'Touching Grass', 25, 'active', 33],
    [21208, 'Crawdacity', 8317, 'Naughty Souls', '$3xy', 'Nine Lives', 24, 'active', 34],
    [2424452, 'SassySunny', 8317, 'Naughty Souls', '$3xy', 'Brain Surgeons', 22, 'active', 35],
    [3583932, 'a1ry', 8317, 'Naughty Souls', '$3xy', 'Loose Cannons', 19, 'dropped', 36],
    [4174284, 'Kamkon10', 44817, 'Naughty Sanctuary', 'NaSa', 'Conspiracy Theorists', 16, 'active', 37],
    [4250310, 'Litzacbentheo', 44817, 'Naughty Sanctuary', 'NaSa', 'Brain Surgeons', 16, 'active', 38],
    [2911585, '-Beau-', 8317, 'Naughty Souls', '$3xy', 'Inanimate Objects', 13, 'active', 39],
    [3841028, 'DoobzMan', 8317, 'Naughty Souls', '$3xy', 'Nine Lives', 13, 'active', 40],
    [442754, 'MMTC', 8317, 'Naughty Souls', '$3xy', 'Rocket Scientists', 12, 'active', 41],
    [2323855, 'Alascato', 8317, 'Naughty Souls', '$3xy', 'Touching Grass', 11, 'active', 42],
    [4063648, 'R34LDAWG', 44817, 'Naughty Sanctuary', 'NaSa', 'APEX', 11, 'active', 43],
    [242566, 'Graplette', 44817, 'Naughty Sanctuary', 'NaSa', 'Conspiracy Theorists', 10, 'active', 44],
    [4016119, 'Babbumbee', 44817, 'Naughty Sanctuary', 'NaSa', 'Rocket Scientists', 9, 'active', 45],
    [3469677, 'Ekka', 8317, 'Naughty Souls', '$3xy', 'APEX', 9, 'active', 46],
    [4020135, 'Zoalmegustar', 44817, 'Naughty Sanctuary', 'NaSa', 'Rocket Scientists', 7, 'active', 47],
    [1710822, 'Inkhart', 8317, 'Naughty Souls', '$3xy', 'Gold Dust', 5, 'active', 48],
    [2113382, 'tepigflamet', 44817, 'Naughty Sanctuary', 'NaSa', 'Brain Surgeons', 5, 'active', 49],
    [2037571, 'Weedy', 8317, 'Naughty Souls', '$3xy', 'Loose Cannons', 5, 'active', 50],
    [1078273, 'mashkoor', 8317, 'Naughty Souls', '$3xy', 'Nine Lives', 2, 'active', 51],
    [4377323, 'AllieWally', 44817, 'Naughty Sanctuary', 'NaSa', 'Touching Grass', 1, 'active', 52],
    [24780, 'Irix', 8317, 'Naughty Souls', '$3xy', 'Reptilians', 1, 'active', 53],
    [319602, 'Angelsman', 8317, 'Naughty Souls', '$3xy', 'Brain Surgeons', 0, 'active', 54],
    [4046561, 'KousakaKun', 44817, 'Naughty Sanctuary', 'NaSa', 'Touching Grass', 0, 'active', 55],
    [3797288, 'NANOO', 44817, 'Naughty Sanctuary', 'NaSa', 'Loose Cannons', 0, 'active', 56],
    [3676010, 'Atomic-Toast', 44817, 'Naughty Sanctuary', 'NaSa', 'Rocket Scientists', 0, 'dropped', 65],
    [2911255, 'Dscott138', 44817, 'Naughty Sanctuary', 'NaSa', 'Reptilians', 0, 'dropped', 84],
    [959585, 'Five', 8317, 'Naughty Souls', '$3xy', 'Sticks and Stones', 0, 'dropped', 93],
    [4093649, 'GORYDAMNREAPER', 8317, 'Naughty Souls', '$3xy', 'Loose Cannons', 0, 'dropped', 101],
    [3952272, 'jinglely', 44817, 'Naughty Sanctuary', 'NaSa', 'Nine Lives', 0, 'dropped', 111],
    [3942933, 'KidLaRona', 8317, 'Naughty Souls', '$3xy', 'High Voltage', 0, 'dropped', 118],
    [3485404, 'smk47', 8317, 'Naughty Souls', '$3xy', 'Gold Dust', 0, 'dropped', 155],
  ]);
  const SEEDED_DROPOUT_FACTION_RANKS = Object.freeze({
    3583932: 28,
    3676010: 23,
    2911255: 35,
    959585: 52,
    4093649: 56,
    3952272: 48,
    3942933: 67,
    3485404: 85,
  });
  const SEEDED_ZERO_RANK_ANCHORS = Object.freeze({ alliancePositive: 53, factionPositive: { 8317: 37, 44817: 16 } });
  const PARTICIPANT_SEED = Object.freeze(PARTICIPANT_SEED_DATA.map((row) => Object.freeze({
    id: row[0], name: row[1], factionId: row[2], factionName: row[3], factionTag: row[4],
    teamName: row[5], attacks: row[6], status: row[7], allianceRank: row[8],
    factionRank: SEEDED_DROPOUT_FACTION_RANKS[row[0]] || null,
    zeroRankAlliancePositiveCount: row[7] === 'dropped' && row[6] === 0 ? SEEDED_ZERO_RANK_ANCHORS.alliancePositive : null,
    zeroRankFactionPositiveCount: row[7] === 'dropped' && row[6] === 0 ? SEEDED_ZERO_RANK_ANCHORS.factionPositive[row[2]] : null,
    enrolled: true,
  })));

  const KNOWN_FORMER_TEAMS = Object.freeze({
    3583932: 'Loose Cannons',
    959585: 'Sticks and Stones',
    4093649: 'Loose Cannons',
    3676010: 'Rocket Scientists',
    2911255: 'Reptilians',
    3952272: 'Nine Lives',
    3942933: 'High Voltage',
    3485404: 'Gold Dust',
  });

  const SPECIAL_ROASTS = Object.freeze({
    a1ry: (player) => `Managed ${player.attacks} attacks and still found the fastest route out of the event.${player.movement > 0 ? ` At least that ${player.movement}-place climb gave the exit some momentum.` : ''}`,
    Five: () => 'Lived up to the name by contributing roughly five fewer attacks than anyone was hoping for: a flawless zero.',
    GORYDAMNREAPER: () => 'Brought the intimidating name, left the attacks at zero, and reaped absolutely nothing.',
    'Atomic-Toast': () => 'Skipped the atomic part and went straight to toast: zero attacks and an early trip home.',
    Dscott138: () => 'Vanished from the Reptilians so quietly that even the conspiracy board has no attacks to pin on them.',
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function canonicalTeamName(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function teamStyle(teamName) {
    const key = canonicalTeamName(teamName);
    return TEAM_STYLES[key] || {
      name: String(teamName || 'Team Unknown'),
      badge: 'TM',
      icon: '🎯',
      marker: '⚪',
      color: '#d7dce2',
    };
  }

  function factionStyle(faction, index = 0) {
    const identity = `${faction?.tag || ''} ${faction?.name || ''}`.toLowerCase();
    if (identity.includes('$3xy') || identity.includes('naughty souls')) {
      return { badge: 'NS', icon: '💜', color: '#c084fc', border: '#a855f7', background: '#24152f' };
    }
    if (identity.includes('nasa') || identity.includes('naughty sanctuary')) {
      return { badge: 'NA', icon: '💙', color: '#67c7ff', border: '#1f9ed8', background: '#102633' };
    }
    const palette = [
      { icon: '🟠', color: '#ff9f43', border: '#ff9f43', background: '#2c2118' },
      { icon: '🟢', color: '#77d68a', border: '#77d68a', background: '#17281c' },
      { icon: '🟡', color: '#f4d35e', border: '#f4d35e', background: '#2b2717' },
      { icon: '🔴', color: '#ff7675', border: '#ff7675', background: '#2d1919' },
    ];
    const fallback = palette[index % palette.length];
    const badgeSource = String(faction?.tag || faction?.name || 'FC').replace(/[^a-z0-9]/gi, '').toUpperCase();
    return { ...fallback, badge: badgeSource.slice(0, 2) || 'FC' };
  }

  function ordinal(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const mod100 = number % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
    return `${number}${number % 10 === 1 ? 'st' : number % 10 === 2 ? 'nd' : number % 10 === 3 ? 'rd' : 'th'}`;
  }

  function movementText(movement) {
    const amount = Number(movement || 0);
    if (amount > 0) return `▲${amount}`;
    if (amount < 0) return `▼${Math.abs(amount)}`;
    return 'no movement';
  }

  function toNumber(value, fallback = 0) {
    if (value == null || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function unwrap(source, ...keys) {
    for (const key of keys) {
      if (source && source[key] != null) return source[key];
    }
    return source;
  }

  function normalizeFactionBasic(payload, fallbackId) {
    const source = unwrap(payload, 'basic', 'faction') || {};
    return {
      id: toNumber(source.id ?? source.ID ?? fallbackId),
      name: String(source.name || `Faction ${fallbackId}`),
      tag: String(source.tag || source.tag_image || ''),
    };
  }

  function normalizeMembers(payload, faction) {
    const source = unwrap(payload, 'members') || [];
    const records = Array.isArray(source)
      ? source
      : Object.entries(source).map(([id, value]) => ({ id, ...(value || {}) }));
    return records
      .map((member) => ({
        id: toNumber(member.id ?? member.ID),
        name: String(member.name || member.player_name || `Player ${member.id ?? member.ID}`),
        factionId: faction.id,
        factionName: faction.name,
        factionTag: faction.tag,
      }))
      .filter((member) => member.id > 0);
  }

  function normalizeTeamStandings(payload) {
    const elimination = unwrap(payload, 'elimination') || {};
    const source = unwrap(elimination, 'teams') || [];
    const records = Array.isArray(source) ? source : Object.values(source);
    const byId = new Map();
    const byName = new Map();
    for (const item of records) {
      const candidate = item?.team || item || {};
      const name = String(candidate.name || candidate.team || item?.name || '').trim();
      if (!name) continue;
      const normalized = {
        id: toNumber(candidate.id ?? candidate.team_id ?? item?.id, null),
        name,
        score: toNumber(candidate.score ?? item?.score),
        position: toNumber(candidate.position ?? candidate.rank ?? item?.position, null),
        eliminated: Boolean(candidate.eliminated ?? item?.eliminated),
        participants: toNumber(candidate.participants ?? item?.participants, null),
        participantsLeft: toNumber(candidate.participants_left ?? item?.participants_left, null),
      };
      if (normalized.id) byId.set(normalized.id, normalized);
      byName.set(canonicalTeamName(name), normalized);
    }
    return { byId, byName, valid: records.length > 0 };
  }

  function normalizeCompetition(payload) {
    const source = unwrap(payload, 'competition') || {};
    const valid = Boolean(source && typeof source === 'object' && (
      Object.hasOwn(source, 'name')
      || Object.hasOwn(source, 'competition')
      || Object.hasOwn(source, 'team')
      || Object.hasOwn(source, 'team_id')
      || Object.hasOwn(source, 'attacks')
    ));
    return {
      valid,
      name: String(source.name || source.competition || ''),
      score: toNumber(source.score),
      attacks: toNumber(source.attacks),
      teamName: String(source.team?.name || source.team || '').trim(),
      teamId: toNumber(source.team?.id ?? source.team_id, null),
    };
  }

  function participantComparator(a, b) {
    return (
      toNumber(b.attacks) - toNumber(a.attacks) ||
      toNumber(b.score) - toNumber(a.score) ||
      (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
      toNumber(a.allianceRank, Number.MAX_SAFE_INTEGER) - toNumber(b.allianceRank, Number.MAX_SAFE_INTEGER) ||
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }) ||
      toNumber(a.id) - toNumber(b.id)
    );
  }

  function assignRanks(players, previousHistory = {}) {
    const sorted = [...players].sort(participantComparator);
    const alliancePositiveCount = sorted.filter((player) => player.attacks > 0).length;
    sorted.forEach((player, index) => {
      const previous = previousHistory[player.id] || {};
      const previousRank = toNumber(previous.allianceRank, null);
      player.allianceRank = index + 1;
      player.movement = previousRank ? previousRank - player.allianceRank : 0;
      if (player.status === 'dropped' && player.attacks === 0 && previousRank) {
        const anchor = toNumber(previous.zeroRankAlliancePositiveCount, alliancePositiveCount);
        player.allianceRank = Math.max(1, previousRank + alliancePositiveCount - anchor);
        player.movement = previousRank - player.allianceRank;
      }
    });

    const factions = new Map();
    const teams = new Map();
    for (const player of sorted) {
      if (!factions.has(player.factionId)) factions.set(player.factionId, []);
      factions.get(player.factionId).push(player);
      const teamKey = canonicalTeamName(player.teamName);
      player.teamRank = null;
      if (player.status === 'active' && teamKey) {
        if (!teams.has(teamKey)) teams.set(teamKey, []);
        teams.get(teamKey).push(player);
      }
    }
    for (const group of factions.values()) {
      const factionPositiveCount = group.filter((player) => player.attacks > 0).length;
      group.sort(participantComparator).forEach((player, index) => {
        const previous = previousHistory[player.id] || {};
        const previousRank = toNumber(previous.factionRank, null);
        if (player.status === 'dropped' && player.attacks === 0 && previousRank) {
          const anchor = toNumber(previous.zeroRankFactionPositiveCount, factionPositiveCount);
          player.factionRank = Math.max(1, previousRank + factionPositiveCount - anchor);
        } else {
          player.factionRank = index + 1;
        }
      });
    }
    for (const group of teams.values()) {
      group.sort(participantComparator).forEach((player, index) => { player.teamRank = index + 1; });
    }
    return sorted;
  }

  function classifyMember(member, competition, prior, standings) {
    if (prior?.enrolled && prior.status === 'dropped') {
      return { ...member, ...prior, status: 'dropped', enrolled: true, teamRank: null };
    }
    const inElimination = /elimination/i.test(competition.name);
    let currentTeam = competition.teamName;
    if (!currentTeam && competition.teamId && standings.byId.has(competition.teamId)) {
      currentTeam = standings.byId.get(competition.teamId).name;
    }
    const previousTeam = prior?.teamName || KNOWN_FORMER_TEAMS[member.id] || '';
    const teamName = currentTeam || previousTeam;
    const standing = standings.byId.get(competition.teamId) || standings.byName.get(canonicalTeamName(teamName));
    const wasEnrolled = Boolean(prior?.enrolled);
    const newlyEnrolled = inElimination && competition.teamId != null && Boolean(standing);
    const enrolled = wasEnrolled || newlyEnrolled;
    let status = 'inactive';
    if (enrolled && standing?.eliminated) status = 'dropped';
    else if (enrolled && competition.valid && inElimination && competition.teamId != null && standing) status = 'active';
    else if (enrolled && competition.valid) status = 'dropped';
    else if (enrolled) status = prior?.status || 'active';
    return {
      ...member,
      status,
      enrolled,
      teamName,
      teamId: competition.teamId || standing?.id || null,
      teamScore: standing?.score ?? competition.score,
      teamPosition: standing?.position ?? null,
      score: Math.max(toNumber(prior?.score), competition.score),
      attacks: Math.max(toNumber(prior?.attacks), competition.attacks),
    };
  }

  function factionTitle(faction) {
    const tag = faction.tag ? `[${faction.tag}] ` : '';
    return `${tag}${faction.name}`.toUpperCase();
  }

  function escapeDiscord(value) {
    return String(value ?? '').replace(/([\\`*_[\]~|>])/g, '\\$1');
  }

  function formatRank(value) {
    const rank = toNumber(value, null);
    return rank == null ? '--' : String(rank).padStart(2, '0');
  }

  function compactBadgeHtml(label, background, color = '#111318') {
    return `<span style="display:inline-block;box-sizing:border-box;min-width:29px;margin:1px 3px 1px 0;padding:2px 5px;background:${background};color:${color};border-radius:4px;font-size:11px;font-weight:700;line-height:1.35;text-align:center;vertical-align:middle;">${escapeHtml(label)}</span>`;
  }

  function statusBadgeHtml(player) {
    if (player.status === 'dropped') return compactBadgeHtml('OUT', '#ff5d73', '#ffffff');
    if (player.allianceRank <= 3) return compactBadgeHtml(`P${player.allianceRank}`, '#f5a623');
    if (player.allianceRank <= 10) return compactBadgeHtml('T10', '#35d07f');
    if (player.allianceRank <= 15) return compactBadgeHtml('T15', '#4da3ff', '#ffffff');
    return compactBadgeHtml('R', '#c7cbd1');
  }

  function movementHtml(player) {
    if (player.movement > 0) return ` <span style="color:#35d07f;font-weight:700;">▲${player.movement}</span>`;
    if (player.movement < 0) return ` <span style="color:#ff5d73;font-weight:700;">▼${Math.abs(player.movement)}</span>`;
    return '';
  }

  function playerRowHtml(player) {
    const team = teamStyle(player.teamName);
    const teamRank = player.teamRank ? ` #${player.teamRank}` : '';
    const former = player.status === 'dropped' ? 'Formerly ' : '';
    return `<div style="width:100%;max-width:100%;box-sizing:border-box;margin:8px 0;padding:9px 10px;background:#17191d;border:1px solid #2d3036;border-left:4px solid ${team.color};border-radius:4px;line-height:1.4;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;">
  <div style="width:100%;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word;">${statusBadgeHtml(player)}${compactBadgeHtml(team.badge, team.color)} <a href="https://www.torn.com/profiles.php?XID=${player.id}" style="color:${team.color};font-weight:700;text-decoration:none;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(player.name)}</a></div>
  <div style="width:100%;max-width:100%;box-sizing:border-box;margin-top:5px;color:#f2f3f5;font-weight:700;">${compactBadgeHtml(`A#${formatRank(player.allianceRank)}`, '#f5a623')}${movementHtml(player)} ${compactBadgeHtml(`F#${formatRank(player.factionRank)}`, '#4da3ff', '#ffffff')} <span style="white-space:normal;">${player.attacks.toLocaleString()} attacks</span></div>
  <div style="width:100%;max-width:100%;box-sizing:border-box;margin-top:4px;color:#c7cbd1;overflow-wrap:anywhere;word-break:break-word;">${former}<span style="color:${team.color};font-weight:700;">${escapeHtml(team.name)}${teamRank}</span></div>
</div>`;
  }

  function factionSummary(factionPlayers) {
    const active = factionPlayers.filter((player) => player.status === 'active');
    const factionName = active[0]?.factionName || 'The faction';
    const topThree = active.filter((player) => player.allianceRank <= 3).length;
    const topTen = active.filter((player) => player.allianceRank <= 10).length;
    const topFifteen = active.filter((player) => player.allianceRank <= 15).length;
    const sentences = [];
    if (topThree === 3) sentences.push(`${factionName} owns a clean sweep of the alliance podium.`);
    else if (topThree) sentences.push(`${factionName} holds ${topThree} alliance podium place${topThree === 1 ? '' : 's'}.`);
    if (topTen) sentences.push(`${topTen} member${topTen === 1 ? '' : 's'} currently sit inside the alliance top ten.`);
    if (topFifteen > topTen) sentences.push(`${topFifteen - topTen} more hold places inside the top fifteen.`);
    return sentences.length ? sentences.join(' ') : `${factionName} is still hunting for its first alliance top-fifteen position.`;
  }

  function roastPlayer(player) {
    if (SPECIAL_ROASTS[player.name]) return SPECIAL_ROASTS[player.name](player);
    if (player.attacks === 0) return `${player.name} recorded zero attacks and treated Elimination like spectator mode with extra steps.`;
    if (player.movement > 0) return `${player.name} climbed ${player.movement} places, then apparently kept climbing straight out of the event.`;
    return `${player.name} finished with ${player.attacks} attacks before the elimination door completed its one-way demonstration.`;
  }

  function headerBlock(title, subtitle) {
    return `<div style="width:100%;max-width:100%;box-sizing:border-box;text-align:center;font-weight:700;overflow:hidden;">
  <div style="width:100%;max-width:100%;box-sizing:border-box;font-size:24px;line-height:1.2;color:#ffffff;letter-spacing:.3px;margin-bottom:10px;overflow-wrap:anywhere;word-break:break-word;">${compactBadgeHtml('E', '#f5a623')} ${escapeHtml(title)}</div>
  <div style="width:100%;max-width:100%;box-sizing:border-box;font-size:12px;line-height:1.65;color:#c7cbd1;margin-bottom:5px;">${subtitle}</div>
  <div style="width:100%;max-width:100%;box-sizing:border-box;font-size:12px;line-height:1.65;color:#c7cbd1;">${compactBadgeHtml('A', '#f5a623')} <span style="color:#ffffff;">Alliance Rank</span> &nbsp; ${compactBadgeHtml('F', '#4da3ff', '#ffffff')} <span style="color:#ffffff;">Faction Rank</span></div>
</div>`;
  }

  function factionHeaderHtml(faction, index) {
    const style = factionStyle(faction, index);
    return `<div style="width:100%;max-width:100%;box-sizing:border-box;margin:22px 0 12px;padding:10px 8px;text-align:center;font-size:18px;line-height:1.35;font-weight:700;color:${style.color};background:${style.background};border:1px solid ${style.border};border-left:5px solid ${style.border};border-radius:5px;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;">${compactBadgeHtml(style.badge, style.color)} ${escapeHtml(factionTitle(faction))}</div>`;
  }

  function sectionHeaderHtml(badge, label, color) {
    const textColor = color === '#4da3ff' || color === '#ff5d73' ? '#ffffff' : '#111318';
    return `<div style="width:100%;max-width:100%;box-sizing:border-box;margin:18px 0 10px;text-align:center;font-size:16px;line-height:1.35;font-weight:700;color:${color};overflow-wrap:anywhere;word-break:break-word;">${compactBadgeHtml(badge, color, textColor)} ${escapeHtml(label)}</div>`;
  }

  function documentShell(body) {
    return `<!-- Torn Elimination HTML Exporter v${VERSION} -->
<div style="width:100%;max-width:601px;box-sizing:border-box;margin:0 auto;padding:0 2px;overflow:hidden;">
<div style="width:100%;max-width:100%;box-sizing:border-box;margin:0;padding:14px 12px;background:#202225;color:#f2f3f5;font-family:Arial,Helvetica,sans-serif;border:1px solid #34373c;border-radius:7px;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;">
${body}
</div>
</div>`;
  }

  function newsletterLegendHtml(includeFullField = false) {
    const parts = [
      `${compactBadgeHtml('P', '#f5a623')} <span style="color:#ffd166;">Podium</span>`,
      `${compactBadgeHtml('T10', '#35d07f')} <span style="color:#35d07f;">Top 10</span>`,
      `${compactBadgeHtml('T15', '#4da3ff', '#ffffff')} <span style="color:#4da3ff;">Top 15</span>`,
    ];
    if (includeFullField) parts.push(`${compactBadgeHtml('ALL', '#c7cbd1')} <span style="color:#d7dce2;">Full Field</span>`);
    parts.push(`${compactBadgeHtml('OUT', '#ff5d73', '#ffffff')} <span style="color:#ff5d73;">Dropped Out</span>`);
    return parts.join(' &nbsp; ');
  }

  function newsletterBadgeTextColor(teamName) {
    const colors = {
      apex: '#ffffff',
      'brain surgeons': '#0b1b20',
      'conspiracy theorists': '#102126',
      'high voltage': '#07141b',
      'inanimate objects': '#151619',
      'loose cannons': '#14161b',
      reptilians: '#14180e',
      'rocket scientists': '#151619',
      'sticks and stones': '#ffffff',
      'touching grass': '#111700',
    };
    return colors[canonicalTeamName(teamName)] || '#151619';
  }

  function newsletterMovementHtml(player) {
    if (player.movement > 0) return ` <span style="color:#35d07f;">(+${player.movement})</span>`;
    if (player.movement < 0) return ` <span style="color:#ff5d73;">(-${Math.abs(player.movement)})</span>`;
    return '';
  }

  function newsletterPlacementBadgeHtml(player) {
    if (player.status === 'dropped') return '<span style="display:inline-block;padding:1px 4px;margin-right:3px;box-sizing:border-box;background:#ff5d73;color:#1b0d10;font-size:10px;font-weight:700;border-radius:3px;">OUT</span>';
    if (player.allianceRank <= 3) return `<span style="display:inline-block;padding:1px 5px;margin-right:3px;box-sizing:border-box;background:#f2a51a;color:#151619;font-size:10px;font-weight:700;border-radius:3px;">P${player.allianceRank}</span>`;
    if (player.allianceRank <= 10) return '<span style="display:inline-block;padding:1px 4px;margin-right:3px;box-sizing:border-box;background:#35d07f;color:#101612;font-size:10px;font-weight:700;border-radius:3px;">T10</span>';
    return '<span style="display:inline-block;padding:1px 4px;margin-right:3px;box-sizing:border-box;background:#4da3ff;color:#101216;font-size:10px;font-weight:700;border-radius:3px;">T15</span>';
  }

  function newsletterPlayerRowHtml(player) {
    const team = teamStyle(player.teamName);
    const isDropped = player.status === 'dropped';
    const teamRank = !isDropped && player.teamRank ? ` #${player.teamRank}` : '';
    const cardBackground = isDropped ? '#231a1e' : '#1d1f24';
    const cardBorder = isDropped ? '#493039' : '#34363b';
    const teamLead = isDropped ? 'Former ' : '';
    return `<div style="display:block;width:auto;min-width:0;margin:6px 0;padding:8px;box-sizing:border-box;background:${cardBackground};border:1px solid ${cardBorder};border-left:4px solid ${team.color};border-radius:3px;white-space:normal;overflow-wrap:anywhere;">
  <div style="display:block;width:auto;box-sizing:border-box;">
    ${newsletterPlacementBadgeHtml(player)}
    <strong>A#${player.allianceRank}${newsletterMovementHtml(player)} &bull; F#${player.factionRank}</strong> &mdash;
    <a href="https://www.torn.com/profiles.php?XID=${player.id}" style="color:${team.color};font-weight:700;text-decoration:none;white-space:normal;overflow-wrap:anywhere;">${escapeHtml(player.name)}</a>
    &mdash; ${player.attacks.toLocaleString()} attacks
  </div>
  <div style="display:block;width:auto;margin-top:3px;box-sizing:border-box;font-size:12px;">
    <span style="display:inline-block;padding:1px 4px;margin-right:3px;box-sizing:border-box;background:${team.color};color:${newsletterBadgeTextColor(team.name)};font-size:10px;font-weight:700;border-radius:3px;">${escapeHtml(team.badge)}</span>
    ${teamLead}<span style="color:${team.color};font-weight:700;">${escapeHtml(team.name)}${teamRank}</span>
  </div>
</div>`;
  }

  function newsletterFactionHeaderHtml(faction, index) {
    const style = factionStyle(faction, index);
    const outline = style.badge === 'NS' ? '#49305d' : style.badge === 'NA' ? '#25495e' : style.border;
    return `<div style="display:block;width:auto;min-width:0;margin:17px 0 0;padding:10px 7px;box-sizing:border-box;text-align:center;font-size:17px;font-weight:700;line-height:1.35;color:${style.color};background:${style.background};border:1px solid ${outline};border-left:5px solid ${style.border};border-radius:4px;white-space:normal;overflow-wrap:anywhere;">
  <span style="display:inline-block;padding:2px 5px;margin-right:3px;box-sizing:border-box;background:${style.border};color:#ffffff;font-size:11px;border-radius:3px;">${escapeHtml(style.badge)}</span>
  ${escapeHtml(`${faction.tag ? `[${faction.tag}] ` : ''}${String(faction.name || '').toUpperCase()}`)}
</div>`;
  }

  function newsletterSectionHeaderHtml(label, color) {
    return `<div style="display:block;width:auto;margin:13px 0 6px;box-sizing:border-box;text-align:center;font-size:14px;font-weight:700;color:${color};">
  ${escapeHtml(label)}
</div>`;
  }

  function countWord(value) {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
    return words[value] || String(value);
  }

  function newsletterFactionSummaryHtml(faction, group, index) {
    const style = factionStyle(faction, index);
    const topThree = group.filter((player) => player.allianceRank <= 3).length;
    const topTen = group.filter((player) => player.allianceRank <= 10).length;
    const topFifteenOnly = group.filter((player) => player.allianceRank > 10 && player.allianceRank <= 15).length;
    const background = style.badge === 'NS' ? 'rgba(168,85,247,0.10)' : style.badge === 'NA' ? 'rgba(31,158,216,0.10)' : style.background;
    let summary;
    if (style.badge === 'NS' && topThree === 3) {
      summary = `${escapeHtml(faction.name)} controls <strong>${countWord(topTen)} places in the alliance top ten</strong>, including a clean sweep of the podium${topFifteenOnly ? `, with ${countWord(topFifteenOnly)} more member${topFifteenOnly === 1 ? '' : 's'} inside the top fifteen` : ''}.`;
    } else if (style.badge === 'NA' && group.length === 2 && group.every((player) => player.allianceRank <= 8)) {
      summary = 'Both Sanctuary representatives remain inside the <strong>alliance top eight</strong> while holding first and second place within their faction.';
    } else {
      const pieces = [];
      if (topThree) pieces.push(`<strong>${topThree} podium place${topThree === 1 ? '' : 's'}</strong>`);
      if (topTen) pieces.push(`<strong>${topTen} alliance top-ten place${topTen === 1 ? '' : 's'}</strong>`);
      if (topFifteenOnly) pieces.push(`<strong>${topFifteenOnly} additional top-fifteen place${topFifteenOnly === 1 ? '' : 's'}</strong>`);
      summary = pieces.length ? `${escapeHtml(faction.name)} currently holds ${pieces.join(', ')}.` : `${escapeHtml(faction.name)} is still hunting for its first alliance top-fifteen position.`;
    }
    return `<div style="display:block;width:auto;min-width:0;margin:10px 0 0;padding:8px;box-sizing:border-box;background:${background};border-radius:4px;font-size:12px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;">
  ${summary}
</div>`;
  }

  function newsletterShell(body) {
    return `<!-- Torn Elimination HTML Exporter v${VERSION} -->
<div style="display:block;width:auto;max-width:601px;min-width:0;margin:0 auto;padding:0;box-sizing:border-box;">
  <div style="display:block;width:auto;min-width:0;margin:0;padding:9px;box-sizing:border-box;background:#151619;color:#f2f2f2;font-family:Arial,Verdana,sans-serif;font-size:13px;line-height:1.5;border:1px solid #34363b;border-radius:8px;white-space:normal;overflow-wrap:anywhere;word-wrap:break-word;">
${body}
  </div>
</div>`;
  }

  function newsletterHeaderHtml() {
    return `    <div style="display:block;width:auto;margin:5px 0 0;box-sizing:border-box;text-align:center;color:#ffffff;font-size:22px;font-weight:700;line-height:1.25;white-space:normal;overflow-wrap:anywhere;">
      <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c6.png" alt="Trophy" width="25" height="25" style="display:inline-block !important;width:25px !important;height:25px !important;max-width:25px !important;margin:0 5px 0 0 !important;padding:0;border:0;float:none !important;clear:none !important;vertical-align:middle;box-sizing:border-box;">
      ELIMINATION
    </div>
    <div style="display:block;width:auto;margin:0;box-sizing:border-box;text-align:center;color:#ffffff;font-size:22px;font-weight:700;line-height:1.25;white-space:normal;overflow-wrap:anywhere;">
      ALLIANCE UPDATE
    </div>
    <div style="display:block;width:auto;margin:14px 0 0;box-sizing:border-box;text-align:center;font-size:12px;font-weight:700;line-height:2;white-space:normal;">
      <span style="display:inline-block;margin:0 4px;color:#f2a51a;"><span style="display:inline-block;padding:1px 5px;box-sizing:border-box;background:#f2a51a;color:#151619;border-radius:3px;">1-3</span> Podium</span>
      <span style="display:inline-block;margin:0 4px;color:#35d07f;">Top 10</span>
      <span style="display:inline-block;margin:0 4px;color:#4da3ff;">Top 15</span>
      <span style="display:inline-block;margin:0 4px;color:#ff5d73;">Dropped Out</span>
    </div>
    <div style="display:block;width:auto;margin:6px 0 0;box-sizing:border-box;text-align:center;font-size:12px;font-weight:700;line-height:2;white-space:normal;">
      <span style="display:inline-block;margin:0 5px;color:#f2a51a;"><span style="display:inline-block;padding:1px 6px;box-sizing:border-box;background:#f2a51a;color:#151619;border-radius:3px;">A</span> Alliance Rank</span>
      <span style="display:inline-block;margin:0 5px;color:#4da3ff;"><span style="display:inline-block;padding:1px 6px;box-sizing:border-box;background:#4da3ff;color:#101216;border-radius:3px;">F</span> Faction Rank</span>
    </div>
    <div style="display:block;width:auto;height:2px;margin:14px 0 0;padding:0;box-sizing:border-box;background:linear-gradient(90deg,#f2a51a,#4da3ff);border-radius:2px;"></div>`;
  }

  function buildNewsletterHtml(snapshot) {
    const players = snapshot.players || [];
    const factions = snapshot.factions || [];
    const activeTop = players.filter((player) => player.status === 'active' && player.allianceRank <= 15);
    const dropped = players.filter((player) => player.status === 'dropped');
    const parts = [newsletterHeaderHtml()];

    const sections = [
      { label: 'PODIUM', color: '#f2a51a', group: activeTop.filter((player) => player.allianceRank <= 3) },
      { label: 'ALLIANCE TOP 10', color: '#35d07f', group: activeTop.filter((player) => player.allianceRank > 3 && player.allianceRank <= 10) },
      { label: 'ALLIANCE TOP 15', color: '#4da3ff', group: activeTop.filter((player) => player.allianceRank > 10 && player.allianceRank <= 15) },
    ];
    for (const section of sections) {
      parts.push(newsletterSectionHeaderHtml(section.label, section.color));
      if (section.group.length) parts.push(...section.group.map(newsletterPlayerRowHtml));
      else parts.push('<div style="display:block;width:auto;margin:6px 0;padding:8px;box-sizing:border-box;text-align:center;color:#9ca3ad;background:#1d1f24;border:1px solid #34363b;border-radius:3px;">No confirmed active participant currently holds this range.</div>');
    }

    const summaries = factions.map((faction) => {
      const group = activeTop.filter((player) => player.factionId === faction.id);
      return group.length ? `<strong>${escapeHtml(faction.name)}:</strong> ${escapeHtml(factionSummary(group))}` : '';
    }).filter(Boolean);
    if (summaries.length) {
      parts.push(`<div style="display:block;width:auto;min-width:0;margin:10px 0 0;padding:8px;box-sizing:border-box;background:rgba(77,163,255,0.08);border-radius:4px;font-size:12px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;">
  ${summaries.join('<br>')}
</div>`);
    }

    parts.push(`<div style="display:block;width:auto;min-width:0;margin:19px 0 0;padding:10px 6px;box-sizing:border-box;text-align:center;font-size:17px;font-weight:700;line-height:1.35;color:#ff788a;background:linear-gradient(90deg,#30171d,#411c25,#30171d);border:1px solid #ff5d73;border-radius:4px;white-space:normal;overflow-wrap:anywhere;">
  <span style="display:inline-block;padding:2px 5px;margin-right:3px;box-sizing:border-box;background:#ff5d73;color:#1b0d10;font-size:10px;border-radius:3px;">OUT</span>
  DROPPED OUT &mdash; WALL OF SHAME
</div>`);
    if (dropped.length) {
      factions.forEach((faction, index) => {
        const group = dropped.filter((player) => player.factionId === faction.id);
        if (!group.length) return;
        const style = factionStyle(faction, index);
        parts.push(`<div style="display:block;width:auto;margin:14px 0 6px;box-sizing:border-box;text-align:center;font-size:14px;font-weight:700;color:${style.color};white-space:normal;overflow-wrap:anywhere;">
  ${escapeHtml(`${faction.tag ? `[${faction.tag}] ` : ''}${String(faction.name || '').toUpperCase()}`)}
</div>`);
        for (const player of group) {
          parts.push(newsletterPlayerRowHtml(player));
          parts.push(`<div style="display:block;width:auto;min-width:0;margin:0 0 8px;padding:7px 8px;box-sizing:border-box;background:rgba(255,93,115,0.08);font-size:12px;font-style:italic;line-height:1.45;border-radius:3px;white-space:normal;overflow-wrap:anywhere;">
  <strong>BURN:</strong> ${escapeHtml(roastPlayer(player))}
</div>`);
        }
      });
    } else {
      parts.push('<div style="display:block;width:auto;margin:6px 0;padding:8px;box-sizing:border-box;text-align:center;color:#9ca3ad;background:#231a1e;border:1px solid #493039;border-radius:3px;">No confirmed enrolled participants have dropped out.</div>');
    }

    parts.push(`<div style="display:block;width:auto;min-width:0;margin:17px 0 0;padding:9px 5px;box-sizing:border-box;text-align:center;font-size:12px;font-weight:700;line-height:1.5;border-top:1px solid #3b3e44;white-space:normal;overflow-wrap:anywhere;">
  Keep swinging, keep climbing &mdash; and if you drop out, at least give the newsletter something funny to write.
</div>
<div style="display:block;width:auto;margin:8px 0 0;box-sizing:border-box;text-align:center;font-size:10px;line-height:1.4;">
  Trophy artwork: <a href="https://github.com/twitter/twemoji" style="color:#aeb3ba;text-decoration:none;">Twemoji</a>,
  <a href="https://creativecommons.org/licenses/by/4.0/" style="color:#aeb3ba;text-decoration:none;">CC BY 4.0</a>.
</div>`);
    return newsletterShell(parts.join('\n'));
  }

  function buildFactionJson(snapshot) {
    const players = (snapshot.players || []).filter((player) => player.status !== 'inactive');
    const factions = snapshot.factions || [];
    const exportedAt = new Date().toISOString();
    const cleanPlayer = (player) => ({
      id: player.id,
      name: player.name,
      profileUrl: `https://www.torn.com/profiles.php?XID=${player.id}`,
      status: player.status,
      participating: player.status === 'active',
      droppedOut: player.status === 'dropped',
      factionId: player.factionId,
      factionName: player.factionName,
      factionTag: player.factionTag,
      teamId: player.teamId ?? null,
      teamName: player.teamName || '',
      formerTeamId: player.status === 'dropped' ? player.formerTeamId ?? player.teamId ?? null : null,
      formerTeamName: player.status === 'dropped' ? player.formerTeamName || player.teamName || '' : '',
      attacks: toNumber(player.attacks),
      score: toNumber(player.score),
      allianceRank: toNumber(player.allianceRank, null),
      factionRank: toNumber(player.factionRank, null),
      teamRank: player.status === 'active' ? toNumber(player.teamRank, null) : null,
      movement: toNumber(player.movement),
      previousAllianceRank: toNumber(player.previousAllianceRank, null),
      previousFactionRank: toNumber(player.previousFactionRank, null),
      droppedOutAt: player.status === 'dropped' && player.droppedOutAt
        ? new Date(toNumber(player.droppedOutAt)).toISOString() : null,
      availability: String(player.availability || ''),
    });
    const factionExports = factions.map((faction) => {
      const participants = players
        .filter((player) => player.factionId === faction.id)
        .sort((left, right) => toNumber(left.factionRank, Number.MAX_SAFE_INTEGER)
          - toNumber(right.factionRank, Number.MAX_SAFE_INTEGER)
          || participantComparator(left, right));
      return {
        id: faction.id,
        name: faction.name,
        tag: faction.tag || '',
        participantCount: participants.length,
        activeCount: participants.filter((player) => player.status === 'active').length,
        droppedOutCount: participants.filter((player) => player.status === 'dropped').length,
        totalAttacks: participants.reduce((total, player) => total + toNumber(player.attacks), 0),
        participants: participants.map(cleanPlayer),
      };
    }).filter((faction) => faction.participantCount > 0);
    const result = {
      schemaVersion: 1,
      exportType: 'torn-elimination-full-faction-rankings',
      exporterVersion: VERSION,
      exportedAt,
      sourceGeneratedAt: snapshot.generatedAt || null,
      eventKey: snapshot.eventKey || null,
      scope: snapshot.scope || null,
      summary: {
        factionCount: factionExports.length,
        participantCount: players.length,
        activeCount: players.filter((player) => player.status === 'active').length,
        droppedOutCount: players.filter((player) => player.status === 'dropped').length,
        totalAttacks: players.reduce((total, player) => total + toNumber(player.attacks), 0),
      },
      teams: (snapshot.teams || []).map((team) => ({
        id: team.id ?? null,
        name: team.name || '',
        position: team.position ?? null,
        lives: toNumber(team.lives),
        score: toNumber(team.score),
        eliminated: Boolean(team.eliminated),
      })),
      factions: factionExports,
    };
    return JSON.stringify(result, null, 2);
  }

  function factionJsonFilename(snapshot, now = new Date()) {
    const scope = (snapshot.factions || []).map((faction) => faction.tag || faction.id)
      .filter(Boolean).join('-').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'faction';
    const date = now.toISOString().replace(/[:.]/g, '-');
    return `torn-elimination-${scope}-${date}.json`;
  }

  function downloadJsonFile(content, filename) {
    if (!global.document?.body || typeof global.Blob !== 'function'
      || typeof global.URL?.createObjectURL !== 'function') return false;
    try {
      const blob = new global.Blob([content], { type: 'application/json;charset=utf-8' });
      const url = global.URL.createObjectURL(blob);
      const anchor = global.document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      global.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      global.setTimeout(() => global.URL.revokeObjectURL(url), 1000);
      return true;
    } catch { return false; }
  }

  function discordMovement(player) {
    if (player.movement > 0) return ` 🟢 **▲${player.movement}**`;
    if (player.movement < 0) return ` 🔻 **▼${Math.abs(player.movement)}**`;
    return '';
  }

  function discordProfileLink(player) {
    return `**[${escapeDiscord(player.name)}](<https://www.torn.com/profiles.php?XID=${player.id}>)**`;
  }

  function discordPlacementIcon(player) {
    if (player.allianceRank === 1) return '🥇 ';
    if (player.allianceRank === 2) return '🥈 ';
    if (player.allianceRank === 3) return '🥉 ';
    return '';
  }

  function discordPlayerCard(player, includeRoast = false) {
    const team = teamStyle(player.teamName);
    const faction = factionStyle({ name: player.factionName, tag: player.factionTag });
    const teamRank = player.status === 'active' && player.teamRank ? ` #${player.teamRank}` : '';
    const former = player.status === 'dropped' ? 'Formerly ' : '';
    const lines = [
      `> ${discordPlacementIcon(player)}${faction.icon} ${team.marker} ${discordProfileLink(player)} — 🟧 **A#${formatRank(player.allianceRank)}**${discordMovement(player)} • 🟦 **F#${formatRank(player.factionRank)}**`,
      `> -# ${team.icon} ${former}${escapeDiscord(team.name)}${teamRank} • ${player.attacks.toLocaleString()} attacks`,
    ];
    if (includeRoast) lines.push(`> *${escapeDiscord(roastPlayer(player))}*`);
    return lines.join('\n');
  }

  function discordDropoutRoast(player) {
    const special = {
      a1ry: `${player.attacks} attacks, then a ${Math.max(0, player.movement)}-place climb straight through the exit.`,
      Five: 'Five attacks short of expectations: a flawless zero.',
      GORYDAMNREAPER: 'Intimidating name, zero attacks, absolutely nothing reaped.',
      'Atomic-Toast': 'Skipped atomic and went straight to toast: zero attacks.',
      Dscott138: 'Vanished quietly enough to leave zero attacks behind.',
    };
    if (special[player.name]) return special[player.name];
    if (player.attacks === 0) return `${player.name}: zero attacks; spectator mode secured.`;
    return `${player.name}: ${player.attacks} attacks before the exit won.`;
  }

  function discordDropoutCard(player) {
    const team = teamStyle(player.teamName);
    return [
      `> ${team.marker} ${discordProfileLink(player)} — 🟧 **A#${formatRank(player.allianceRank)}**${discordMovement(player)} • 🟦 **F#${formatRank(player.factionRank)}** • ${player.attacks.toLocaleString()} attacks`,
      `> -# ${team.icon} Formerly ${escapeDiscord(team.name)}`,
      `> *${escapeDiscord(discordDropoutRoast(player))}*`,
    ].join('\n');
  }

  function discordFactionHeader(faction, index, continued = false) {
    const style = factionStyle(faction, index);
    return `## ${style.icon} ${escapeDiscord(factionTitle(faction))}${continued ? ' — CONTINUED' : ''}`;
  }

  function discordRankSections(group, sections = ['podium', 'topTen', 'topFifteen']) {
    const definitions = {
      podium: { heading: '### 🥇🥈🥉 PODIUM', players: group.filter((player) => player.allianceRank <= 3) },
      topTen: { heading: '### 🟢 ALLIANCE TOP 10', players: group.filter((player) => player.allianceRank > 3 && player.allianceRank <= 10) },
      topFifteen: { heading: '### 🔵 ALLIANCE TOP 15', players: group.filter((player) => player.allianceRank > 10 && player.allianceRank <= 15) },
    };
    return sections.flatMap((key) => {
      const section = definitions[key];
      return section.players.length ? [section.heading, ...section.players.map((player) => discordPlayerCard(player))] : [];
    });
  }

  function packDiscordBlocks(blocks, limit = 1950) {
    const messages = [];
    let current = '';
    for (const block of blocks.filter(Boolean)) {
      const candidate = current ? `${current}\n\n${block}` : block;
      if (candidate.length <= limit || !current) {
        current = candidate;
      } else {
        messages.push(current);
        current = block;
      }
    }
    if (current) messages.push(current);
    return messages;
  }

  function buildDiscordMessages(snapshot) {
    const players = snapshot.players || [];
    const factions = snapshot.factions || [];
    const activeTop = players.filter((player) => player.status === 'active' && player.allianceRank <= 15);
    const globalHeader = '# 🏆 ELIMINATION ALLIANCE UPDATE\n-# 🥇🥈🥉 Podium • 🟢 Alliance Top 10 • 🔵 Alliance Top 15 • 🔴 Dropped Out\n-# 🟧 A = Alliance Rank • 🟦 F = Faction Rank • ▲ / ▼ = Movement';
    const podium = activeTop.filter((player) => player.allianceRank <= 3);
    const topTen = activeTop.filter((player) => player.allianceRank > 3 && player.allianceRank <= 10);
    const topFifteen = activeTop.filter((player) => player.allianceRank > 10 && player.allianceRank <= 15);
    const messageOneBlocks = [
      globalHeader,
      '### 🥇🥈🥉 PODIUM',
      ...(podium.length ? podium.map((player) => discordPlayerCard(player)) : ['_No confirmed active podium participants._']),
      '### 🟢 ALLIANCE TOP 10',
      ...(topTen.length ? topTen.map((player) => discordPlayerCard(player)) : ['_No confirmed active participants currently hold ranks 4–10._']),
    ];
    const snapshots = factions.map((faction) => {
      const group = activeTop.filter((player) => player.factionId === faction.id);
      return group.length ? `**${escapeDiscord(faction.name.toUpperCase())} SNAPSHOT:** ${escapeDiscord(factionSummary(group))}` : '';
    }).filter(Boolean);
    const messageTwoBlocks = [
      '# 🔵 ELIMINATION ALLIANCE UPDATE — CONTINUED',
      '### 🔵 ALLIANCE TOP 15',
      ...(topFifteen.length ? topFifteen.map((player) => discordPlayerCard(player)) : ['_No confirmed active participants currently hold ranks 11–15._']),
      ...snapshots,
    ];
    const dropped = players.filter((player) => player.status === 'dropped');
    const dropoutBlocks = ['# 🔴 DROPPED OUT\n-# WALL OF SHAME • Game-performance roast edition'];
    if (dropped.length) {
      factions.forEach((faction, index) => {
        const group = dropped.filter((player) => player.factionId === faction.id);
        if (!group.length) return;
        dropoutBlocks.push(discordFactionHeader(faction, index), ...group.map(discordDropoutCard));
      });
    } else {
      dropoutBlocks.push('_No confirmed enrolled participants have dropped out._');
    }
    const messages = [messageOneBlocks.join('\n\n'), messageTwoBlocks.join('\n\n'), dropoutBlocks.join('\n\n')];
    const oversized = messages.findIndex((message) => message.length > 1950);
    if (oversized >= 0) throw new Error(`Discord message ${oversized + 1} exceeds the 1,950-character mobile-safe limit.`);
    return messages;
  }

  function parseFactionIds(value, currentFactionId) {
    const values = String(value || '')
      .split(/[\s,;]+/)
      .map((item) => Number.parseInt(item, 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (!values.length && currentFactionId) values.push(currentFactionId);
    return [...new Set(values)];
  }

  function readHistory(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
  }

  function sharedStorage() {
    try { return global?.localStorage || null; } catch { return null; }
  }

  function readSharedRecord(key, storage = sharedStorage()) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(key);
      return raw == null ? null : (typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch { return null; }
  }

  function normalizeSharedExportSnapshot(raw) {
    const source = typeof raw === 'string' ? readHistory(raw) : raw;
    if (!source || toNumber(source.schemaVersion, null) !== SHARED_EXPORT.schemaVersion
      || !Array.isArray(source.factions) || !Array.isArray(source.members)) return null;
    const factions = source.factions.map((faction) => ({
      id: toNumber(faction?.id, null),
      name: String(faction?.name || 'Unknown faction'),
      tag: String(faction?.tag || ''),
      own: Boolean(faction?.own),
    })).filter((faction) => faction.id != null);
    const factionById = new Map(factions.map((faction) => [faction.id, faction]));
    const teamById = new Map((source.teams || []).map((team) => [toNumber(team?.id, null), team]));
    const players = source.members.map((member) => {
      const id = toNumber(member?.id, null);
      const factionId = toNumber(member?.factionId, null);
      const faction = factionById.get(factionId);
      const dropped = Boolean(member?.droppedOut) || member?.status === 'dropped';
      const active = !dropped && (Boolean(member?.participating) || member?.status === 'active');
      const teamId = dropped
        ? toNumber(member?.formerTeamId ?? member?.teamId, null)
        : toNumber(member?.teamId, null);
      const teamName = dropped
        ? String(member?.formerTeamName || member?.teamName || 'Former team')
        : String(member?.teamName || '');
      const standing = teamById.get(teamId);
      const allianceRank = toNumber(member?.allianceRank, null);
      const factionRank = toNumber(member?.factionRank, null);
      const previousAllianceRank = toNumber(member?.previousAllianceRank, null);
      return {
        id,
        name: String(member?.name || `Player ${id || ''}`).trim(),
        factionId,
        factionName: String(member?.factionName || faction?.name || 'Unknown faction'),
        factionTag: String(member?.factionTag || faction?.tag || ''),
        enrolled: active || dropped,
        status: dropped ? 'dropped' : active ? 'active' : 'inactive',
        participating: active,
        droppedOut: dropped,
        teamId,
        teamName,
        formerTeamId: dropped ? teamId : null,
        formerTeamName: dropped ? teamName : '',
        teamScore: toNumber(standing?.score, toNumber(member?.score)),
        teamPosition: toNumber(standing?.position, null),
        score: toNumber(member?.score),
        attacks: toNumber(member?.attacks),
        allianceRank,
        factionRank,
        teamRank: dropped ? null : toNumber(member?.teamRank, null),
        previousAllianceRank,
        previousFactionRank: toNumber(member?.previousFactionRank, null),
        movement: toNumber(member?.movement,
          previousAllianceRank != null && allianceRank != null ? previousAllianceRank - allianceRank : 0),
        droppedOutAt: dropped ? toNumber(member?.droppedOutAt) : 0,
        availability: String(member?.availability || 'shared'),
      };
    }).filter((player) => player.id && player.enrolled && player.status !== 'inactive')
      .sort((left, right) => toNumber(left.allianceRank, Number.MAX_SAFE_INTEGER)
        - toNumber(right.allianceRank, Number.MAX_SAFE_INTEGER)
        || participantComparator(left, right));
    if (!players.length) return null;
    return {
      factions,
      players,
      generatedAt: String(source.generatedAt || new Date(toNumber(source.updatedAt) || Date.now()).toISOString()),
      updatedAt: toNumber(source.updatedAt, null),
      eventKey: String(source.eventKey || ''),
      scope: String(source.scope || ''),
      source: String(source.source || 'Torn Elimination Faction Rankings'),
      sourceVersion: String(source.sourceVersion || ''),
    };
  }

  function isSharedSnapshotFresh(raw, now = Date.now(), maxAgeMs = SNAPSHOT_CACHE_MAX_AGE_MS) {
    const snapshot = normalizeSharedExportSnapshot(raw);
    if (!snapshot || snapshot.updatedAt == null) return false;
    const age = now - snapshot.updatedAt;
    return age >= 0 && age < maxAgeMs;
  }

  function sharedBridgeAvailable(raw, now = Date.now(), ttlMs = SHARED_EXPORT.bridgeTtlMs) {
    const updatedAt = toNumber(raw?.updatedAt, null);
    return Boolean(raw?.available)
      && toNumber(raw?.schemaVersion, null) === SHARED_EXPORT.schemaVersion
      && updatedAt != null && now - updatedAt >= 0 && now - updatedAt < ttlMs;
  }

  async function requestSharedExportSnapshot(onProgress = () => {}, options = {}) {
    const storage = options.storage || sharedStorage();
    const now = options.now || (() => Date.now());
    const delay = options.delay || sleep;
    const maxAgeMs = toNumber(options.maxAgeMs, SNAPSHOT_CACHE_MAX_AGE_MS);
    const waitMs = toNumber(options.waitMs, SHARED_EXPORT.refreshWaitMs);
    const pollMs = toNumber(options.pollMs, SHARED_EXPORT.pollMs);
    let raw = readSharedRecord(SHARED_EXPORT.snapshot, storage);
    if (isSharedSnapshotFresh(raw, now(), maxAgeMs)) {
      const snapshot = normalizeSharedExportSnapshot(raw);
      const membersTotal = snapshot.players.length;
      const chunksTotal = Math.ceil(membersTotal / MEMBER_PROGRESS_CHUNK_SIZE);
      onProgress({
        phase: 'shared cache',
        message: `Using authoritative rankings saved by Torn Elimination Faction Rankings v${snapshot.sourceVersion || '?'}.`,
        percent: 95,
        cacheHit: true,
        apiStarted: 0,
        apiCompleted: 0,
        apiTotal: 0,
        membersCompleted: membersTotal,
        membersTotal,
        chunksCompleted: chunksTotal,
        chunksTotal,
        chunkSize: MEMBER_PROGRESS_CHUNK_SIZE,
      });
      return snapshot;
    }

    const bridge = readSharedRecord(SHARED_EXPORT.bridge, storage);
    if (!sharedBridgeAvailable(bridge, now())) return null;
    onProgress({
      phase: 'shared refresh',
      message: 'Requesting fresh authoritative rankings from Torn Elimination Faction Rankings…',
      percent: 1,
    });
    if (typeof options.requestRefresh === 'function') options.requestRefresh();
    else {
      try {
        const EventConstructor = global.CustomEvent || global.Event;
        global.document?.dispatchEvent(new EventConstructor(SHARED_EXPORT.requestEvent));
      } catch { return null; }
    }

    const deadline = now() + waitMs;
    while (now() < deadline) {
      await delay(pollMs);
      raw = readSharedRecord(SHARED_EXPORT.snapshot, storage);
      if (isSharedSnapshotFresh(raw, now(), maxAgeMs)) return normalizeSharedExportSnapshot(raw);
      const progress = readSharedRecord(SHARED_EXPORT.progress, storage);
      if (progress?.state === 'error') {
        onProgress({
          phase: 'shared refresh',
          message: `${progress.message || 'The shared rankings refresh failed.'} Falling back to the exporter lookup.`,
          percent: 2,
        });
        return null;
      }
      if (progress?.state === 'loading') {
        onProgress({
          phase: 'shared refresh',
          message: progress.message || 'Refreshing authoritative rankings…',
          percent: toNumber(progress.percent, 1),
          apiCompleted: toNumber(progress.apiCompleted, 0),
          apiTotal: toNumber(progress.apiTotal, null),
          membersCompleted: toNumber(progress.membersCompleted, 0),
          membersTotal: toNumber(progress.membersTotal, null),
          chunksCompleted: toNumber(progress.chunksCompleted, 0),
          chunksTotal: toNumber(progress.chunksTotal, null),
          chunkSize: MEMBER_PROGRESS_CHUNK_SIZE,
        });
      }
    }
    onProgress({
      phase: 'shared refresh',
      message: 'The shared rankings refresh timed out. Falling back to the exporter lookup.',
      percent: 2,
    });
    return null;
  }

  function seedParticipantLedger() {
    return Object.fromEntries(PARTICIPANT_SEED.map((participant) => [participant.id, { ...participant }]));
  }

  function readParticipantLedger(raw) {
    const parsed = readHistory(raw);
    const saved = parsed?.participants && typeof parsed.participants === 'object' ? parsed.participants : parsed;
    const fromSharedRankings = parsed?.source === SHARED_EXPORT.snapshot;
    const ledger = fromSharedRankings ? {} : seedParticipantLedger();
    for (const [key, value] of Object.entries(saved || {})) {
      if (!value || typeof value !== 'object') continue;
      const id = toNumber(value.id ?? key, null);
      if (!id) continue;
      const baseline = ledger[id] || {};
      ledger[id] = {
        ...baseline,
        ...value,
        id,
        enrolled: baseline.enrolled === true || value.enrolled === true,
        attacks: Math.max(toNumber(baseline.attacks), toNumber(value.attacks)),
        status: baseline.status === 'dropped' || value.status === 'dropped'
          ? 'dropped'
          : (value.status || baseline.status || 'active'),
      };
    }
    return ledger;
  }

  async function persistSharedSnapshot(snapshot) {
    const capturedAt = new Date().toISOString();
    const participants = Object.fromEntries(snapshot.players.map((player) => [player.id, {
      ...player,
      enrolled: true,
      status: player.status === 'dropped' ? 'dropped' : 'active',
      capturedAt,
    }]));
    await Promise.all([
      storageSet(STORAGE.participants, {
        schemaVersion: 1,
        source: SHARED_EXPORT.snapshot,
        updatedAt: snapshot.updatedAt,
        participants,
      }),
      storageSet(STORAGE.history, serializeHistory(snapshot.players)),
    ]);
  }

  function serializeParticipantLedger(players, existingLedger = {}) {
    const ledger = readParticipantLedger(existingLedger);
    const capturedAt = new Date().toISOString();
    const alliancePositiveCount = players.filter((player) => player.attacks > 0).length;
    const factionPositiveCounts = new Map();
    for (const player of players) {
      if (player.attacks <= 0) continue;
      factionPositiveCounts.set(player.factionId, (factionPositiveCounts.get(player.factionId) || 0) + 1);
    }
    for (const player of players.filter((entry) => entry.enrolled && entry.status !== 'inactive')) {
      const previous = ledger[player.id] || {};
      const terminal = previous.status === 'dropped';
      ledger[player.id] = {
        ...previous,
        id: player.id,
        name: terminal ? previous.name : player.name,
        factionId: terminal ? previous.factionId : player.factionId,
        factionName: terminal ? previous.factionName : player.factionName,
        factionTag: terminal ? previous.factionTag : player.factionTag,
        teamName: terminal ? previous.teamName : (player.teamName || previous.teamName || ''),
        teamId: terminal ? (previous.teamId ?? null) : (player.teamId ?? previous.teamId ?? null),
        attacks: terminal ? toNumber(previous.attacks) : Math.max(toNumber(previous.attacks), toNumber(player.attacks)),
        score: terminal ? toNumber(previous.score) : Math.max(toNumber(previous.score), toNumber(player.score)),
        status: terminal || player.status === 'dropped' ? 'dropped' : 'active',
        enrolled: true,
        allianceRank: player.allianceRank,
        factionRank: player.factionRank,
        teamRank: player.status === 'active' ? player.teamRank : null,
        zeroRankAlliancePositiveCount: player.status === 'dropped' && player.attacks === 0
          ? alliancePositiveCount
          : previous.zeroRankAlliancePositiveCount ?? null,
        zeroRankFactionPositiveCount: player.status === 'dropped' && player.attacks === 0
          ? (factionPositiveCounts.get(player.factionId) || 0)
          : previous.zeroRankFactionPositiveCount ?? null,
        capturedAt,
      };
    }
    return ledger;
  }

  function participantLookupPlan(members, ledger, factionIds) {
    const selected = new Set(factionIds.map(Number));
    const rosterById = new Map(members.map((member) => [member.id, member]));
    const knownByFaction = new Map();
    for (const participant of Object.values(ledger)) {
      if (!participant?.enrolled || !selected.has(toNumber(participant.factionId))) continue;
      if (!knownByFaction.has(participant.factionId)) knownByFaction.set(participant.factionId, []);
      knownByFaction.get(participant.factionId).push(participant);
    }

    const candidates = [];
    for (const factionId of selected) {
      const known = knownByFaction.get(factionId) || [];
      if (known.length) {
        for (const participant of known) {
          const roster = rosterById.get(participant.id);
          candidates.push(participant.status === 'dropped'
            ? { ...participant }
            : { ...participant, ...(roster || {}), enrolled: true });
        }
      } else {
        candidates.push(...members.filter((member) => member.factionId === factionId));
      }
    }

    const unique = [...new Map(candidates.map((member) => [member.id, member])).values()];
    return {
      frozen: unique.filter((member) => member.enrolled && member.status === 'dropped'),
      lookups: unique.filter((member) => !(member.enrolled && member.status === 'dropped')),
    };
  }

  function frozenParticipantRecord(participant, standings) {
    return {
      ...participant,
      status: 'dropped',
      enrolled: true,
      teamRank: null,
    };
  }

  function serializeHistory(players) {
    return Object.fromEntries(players.map((player) => [player.id, {
      allianceRank: player.allianceRank,
      factionRank: player.factionRank,
      teamName: player.teamName,
      attacks: player.attacks,
      score: player.score,
      status: player.status,
      enrolled: player.enrolled,
      capturedAt: new Date().toISOString(),
    }]));
  }

  async function storageGet(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') return await Promise.resolve(GM_getValue(key, fallback));
      const value = global.localStorage?.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  }

  async function storageSet(key, value) {
    if (typeof GM_setValue === 'function') {
      await Promise.resolve(GM_setValue(key, value));
      return;
    }
    global.localStorage?.setItem(key, JSON.stringify(value));
  }

  function parseHttpResponse(response) {
    const status = toNumber(response?.status, 200);
    const raw = response?.responseText ?? response?.response ?? response;
    if (status < 200 || status >= 300) throw new Error(`Torn API request failed with HTTP ${status}.`);
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (payload?.error) throw new Error(`Torn API error ${payload.error.code || ''}: ${payload.error.error || 'Unknown error'}`.trim());
    return payload;
  }

  async function httpGetJson(url, apiKey) {
    const headers = { Accept: 'application/json', Authorization: `ApiKey ${apiKey}` };
    if (typeof global.PDA_httpGet === 'function') {
      return parseHttpResponse(await global.PDA_httpGet(url, headers));
    }
    if (global.flutter_inappwebview?.callHandler) {
      return parseHttpResponse(await global.flutter_inappwebview.callHandler('PDA_httpGet', url, headers));
    }
    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers,
          timeout: 30000,
          onload: (response) => {
            try { resolve(parseHttpResponse(response)); } catch (error) { reject(error); }
          },
          onerror: () => reject(new Error('Unable to reach the Torn API.')),
          ontimeout: () => reject(new Error('The Torn API request timed out.')),
        });
      });
    }
    const response = await fetch(url, { headers });
    return parseHttpResponse({ status: response.status, responseText: await response.text() });
  }

  function apiGet(path, apiKey) {
    return httpGetJson(`${API_BASE}${path}`, apiKey);
  }

  function sleep(milliseconds) {
    return new Promise((resolve) => global.setTimeout(resolve, milliseconds));
  }

  function createRequestScheduler(options = {}) {
    const requestsPerMinute = Math.max(1, toNumber(options.requestsPerMinute, REQUESTS_PER_MINUTE));
    const intervalMs = Math.max(1, toNumber(options.intervalMs, Math.ceil(60000 / requestsPerMinute)));
    const maxConcurrent = Math.max(1, Math.floor(toNumber(options.maxConcurrent, MAX_CONCURRENT_REQUESTS)));
    const queue = [];
    let active = 0;
    let nextStartAt = 0;
    let timer = null;

    function pump() {
      if (!queue.length || active >= maxConcurrent) return;
      const now = Date.now();
      const delay = Math.max(0, nextStartAt - now);
      if (delay > 0) {
        if (timer == null) {
          timer = global.setTimeout(() => {
            timer = null;
            pump();
          }, delay);
        }
        return;
      }

      const task = queue.shift();
      nextStartAt = Math.max(now, nextStartAt) + intervalMs;
      active += 1;
      Promise.resolve()
        .then(task.worker)
        .then(task.resolve, task.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
      pump();
    }

    return function schedule(worker) {
      return new Promise((resolve, reject) => {
        queue.push({ worker, resolve, reject });
        pump();
      });
    };
  }

  async function pacedMap(items, worker, onProgress = () => {}, schedule = createRequestScheduler()) {
    let completed = 0;
    return Promise.all(items.map((item, index) => schedule(async () => {
      const result = await worker(item, index);
      completed += 1;
      onProgress(completed, items.length);
      return result;
    })));
  }

  async function currentFactionId(apiKey) {
    const payload = await apiGet('/user/faction?striptags=true', apiKey);
    const source = unwrap(payload, 'faction') || {};
    return toNumber(source.id ?? source.ID, null);
  }

  function completedProgressChunks(completed, total, chunkSize = MEMBER_PROGRESS_CHUNK_SIZE) {
    if (!total) return 0;
    const totalChunks = Math.ceil(total / chunkSize);
    return completed >= total ? totalChunks : Math.floor(completed / chunkSize);
  }

  async function collectSnapshot(apiKey, factionIds, onProgress = () => {}, options = {}) {
    const schedule = createRequestScheduler();
    const apiOffset = Math.max(0, Math.floor(toNumber(options.apiOffset, 0)));
    const rosterApiCalls = 1 + (factionIds.length * 2);
    let apiStarted = apiOffset;
    let apiCompleted = apiOffset;
    let apiTotal = apiOffset + rosterApiCalls;
    let membersCompleted = 0;
    let membersTotal = null;
    let chunksTotal = null;
    let phase = 'rosters';

    const emitProgress = (message, overrides = {}) => {
      let percent = 5;
      if (phase === 'rosters') {
        const rosterCompleted = Math.max(0, apiCompleted - apiOffset);
        percent = 5 + Math.round((Math.min(rosterCompleted, rosterApiCalls) / Math.max(1, rosterApiCalls)) * 20);
      } else if (phase === 'members') {
        percent = 25 + Math.round((membersCompleted / Math.max(1, membersTotal || 0)) * 70);
      } else if (phase === 'finalizing') {
        percent = 98;
      }
      onProgress({
        phase,
        message,
        percent,
        apiStarted,
        apiCompleted,
        apiTotal,
        membersCompleted,
        membersTotal,
        chunksCompleted: completedProgressChunks(membersCompleted, membersTotal),
        chunksTotal,
        chunkSize: MEMBER_PROGRESS_CHUNK_SIZE,
        ...overrides,
      });
    };

    const scheduledApiGet = async (path, retry = 0) => {
      try {
        return await schedule(async () => {
          apiStarted += 1;
          emitProgress(`Calling Torn API at up to ${REQUESTS_PER_MINUTE} requests/minute…`);
          try {
            return await apiGet(path, apiKey);
          } finally {
            apiCompleted += 1;
            emitProgress('Processing the latest Torn API response…');
          }
        });
      } catch (error) {
        const rateLimited = /HTTP 429|Torn API error 5\b|too many requests/i.test(String(error?.message || error));
        if (!rateLimited || retry >= 2) throw error;
        apiTotal += 1;
        emitProgress(`Torn rate limit reached; retrying safely in ${(retry + 1) * 5} seconds…`);
        await sleep((retry + 1) * 5000);
        return scheduledApiGet(path, retry + 1);
      }
    };

    emitProgress(`Loading ${factionIds.length} faction roster${factionIds.length === 1 ? '' : 's'} and Elimination team standings…`);
    const [standingsPayload, factionPayloads] = await Promise.all([
      scheduledApiGet('/torn/elimination'),
      Promise.all(factionIds.map(async (id) => {
        const [basic, members] = await Promise.all([
          scheduledApiGet(`/faction/${id}/basic?striptags=true`),
          scheduledApiGet(`/faction/${id}/members?striptags=true`),
        ]);
        const faction = normalizeFactionBasic(basic, id);
        return { faction, members: normalizeMembers(members, faction) };
      })),
    ]);
    const standings = normalizeTeamStandings(standingsPayload);
    if (!standings.valid) {
      throw new Error('The Torn /torn/elimination response contained no team standings. Export stopped to prevent false dropout results.');
    }
    const factions = factionPayloads.map((entry) => entry.faction);
    const members = factionPayloads.flatMap((entry) => entry.members);
    const previousHistory = readHistory(await storageGet(STORAGE.history, {}));
    const participantLedger = readParticipantLedger(await storageGet(STORAGE.participants, {}));
    const lookupPlan = participantLookupPlan(members, participantLedger, factionIds);
    const rankHistory = {
      ...Object.fromEntries(Object.values(participantLedger).map((participant) => [participant.id, participant])),
      ...previousHistory,
    };

    phase = 'members';
    membersTotal = lookupPlan.lookups.length;
    chunksTotal = Math.ceil(membersTotal / MEMBER_PROGRESS_CHUNK_SIZE);
    apiTotal += membersTotal;
    emitProgress(`Loading ${membersTotal} active or unresolved participant record${membersTotal === 1 ? '' : 's'} in ${chunksTotal} progress chunk${chunksTotal === 1 ? '' : 's'}; reusing ${lookupPlan.frozen.length} confirmed dropout${lookupPlan.frozen.length === 1 ? '' : 's'} without API calls…`);
    const normalizedResponses = [];
    const freshRecords = await Promise.all(lookupPlan.lookups.map(async (member) => {
      const payload = await scheduledApiGet(`/user/${member.id}/competition`);
      const competition = normalizeCompetition(payload);
      normalizedResponses.push({ member, competition });
      const record = classifyMember(member, competition, participantLedger[member.id], standings);
      membersCompleted += 1;
      const currentChunk = Math.min(chunksTotal, Math.max(1, Math.ceil(membersCompleted / MEMBER_PROGRESS_CHUNK_SIZE)));
      emitProgress(`Loaded member ${membersCompleted} of ${membersTotal} — progress chunk ${currentChunk} of ${chunksTotal}.`);
      return record;
    }));
    const frozenRecords = lookupPlan.frozen.map((participant) => frozenParticipantRecord(participant, standings));
    const records = [...freshRecords, ...frozenRecords];
    const previouslyActive = lookupPlan.lookups.filter((member) => participantLedger[member.id]?.status === 'active');
    const activeStandingsExist = [...standings.byId.values()].some((team) => !team.eliminated);
    if (
      previouslyActive.length >= 5
      && activeStandingsExist
      && freshRecords.filter((record) => record.status === 'active').length === 0
      && normalizedResponses.every(({ competition }) => competition.valid && competition.teamId == null)
    ) {
      throw new Error('Torn returned no team enrollment for every known active participant. Export stopped instead of incorrectly marking the alliance as dropped out.');
    }

    phase = 'finalizing';
    emitProgress('Calculating alliance, faction, and team rankings…');
    const players = assignRanks(records.filter((player) => player.enrolled && player.status !== 'inactive'), rankHistory);
    await storageSet(STORAGE.participants, serializeParticipantLedger(players, participantLedger));
    await storageSet(STORAGE.history, serializeHistory(players));
    return { factions, players, generatedAt: new Date().toISOString() };
  }

  function isSnapshotCacheFresh(entry, now = Date.now(), maxAgeMs = SNAPSHOT_CACHE_MAX_AGE_MS) {
    const cachedAt = Number(entry?.cachedAt);
    const snapshot = entry?.snapshot;
    const age = now - cachedAt;
    return Number.isFinite(cachedAt)
      && age >= 0
      && age < maxAgeMs
      && Array.isArray(snapshot?.factions)
      && Array.isArray(snapshot?.players);
  }

  function createSnapshotProvider(options) {
    const {
      loadCache,
      saveCache,
      fetchSnapshot,
      now = () => Date.now(),
      maxAgeMs = SNAPSHOT_CACHE_MAX_AGE_MS,
      onCacheHit = () => {},
    } = options;
    let memoryCache = null;
    let inFlight = null;

    return function getSnapshot(context) {
      if (inFlight) return inFlight;
      inFlight = (async () => {
        const checkedAt = now();
        let cached = memoryCache;
        if (!isSnapshotCacheFresh(cached, checkedAt, maxAgeMs)) cached = await loadCache();
        if (isSnapshotCacheFresh(cached, checkedAt, maxAgeMs)) {
          memoryCache = cached;
          onCacheHit(cached, checkedAt, context);
          return cached.snapshot;
        }

        const snapshot = await fetchSnapshot(context);
        const entry = { cachedAt: now(), snapshot };
        memoryCache = entry;
        await saveCache(entry);
        return snapshot;
      })();
      inFlight.finally(() => { inFlight = null; }).catch(() => {});
      return inFlight;
    };
  }

  function isUsableKey(key) {
    return Boolean(key && key !== PDA_API_KEY && key.length >= 10);
  }

  async function resolveApiKey() {
    if (isUsableKey(PDA_API_KEY)) return PDA_API_KEY;
    const saved = String(await storageGet(STORAGE.apiKey, '') || '').trim();
    if (isUsableKey(saved)) return saved;
    const supplied = String(global.prompt('Enter a public Torn API key. It is stored only in this userscript\'s local storage:', '') || '').trim();
    if (!isUsableKey(supplied)) throw new Error('A valid Torn API key is required.');
    await storageSet(STORAGE.apiKey, supplied);
    return supplied;
  }

  async function resolveFactionScope(apiKey, onProgress = () => {}) {
    onProgress({
      phase: 'scope',
      message: 'Loading your current faction before choosing the export scope…',
      percent: 3,
      apiStarted: 1,
      apiCompleted: 0,
      apiTotal: 1,
      membersCompleted: 0,
      membersTotal: null,
      chunksCompleted: 0,
      chunksTotal: null,
    });
    const currentId = await currentFactionId(apiKey);
    onProgress({
      phase: 'scope',
      message: 'Current faction loaded. Confirm the faction or alliance scope.',
      percent: 5,
      apiStarted: 1,
      apiCompleted: 1,
      apiTotal: 1,
      membersCompleted: 0,
      membersTotal: null,
      chunksCompleted: 0,
      chunksTotal: null,
    });
    const saved = await storageGet(STORAGE.factionIds, []);
    const defaults = Array.isArray(saved) && saved.length
      ? saved
      : DEFAULT_ALLIANCE_FACTION_IDS.includes(currentId)
        ? DEFAULT_ALLIANCE_FACTION_IDS
        : currentId ? [currentId] : [];
    const supplied = global.prompt(
      'Faction scope: enter one or more Torn faction IDs separated by commas. Leave the current faction ID alone for a single-faction export; add allied faction IDs for an alliance export.',
      defaults.join(', '),
    );
    if (supplied === null) throw new Error('Export cancelled.');
    const factionIds = parseFactionIds(supplied, currentId);
    if (!factionIds.length) throw new Error('No valid faction IDs were supplied.');
    await storageSet(STORAGE.factionIds, factionIds);
    return factionIds;
  }

  async function copyText(value) {
    try {
      if (typeof GM_setClipboard === 'function') {
        await Promise.resolve(GM_setClipboard(value, 'text'));
        return true;
      }
      if (global.navigator?.clipboard?.writeText) {
        await global.navigator.clipboard.writeText(value);
        return true;
      }
      const textarea = global.document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      global.document.body.appendChild(textarea);
      textarea.select();
      const copied = global.document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch { return false; }
  }

  function createProgressDialog(kind) {
    global.document.getElementById('tehe-progress-overlay')?.remove();
    const overlay = global.document.createElement('div');
    overlay.id = 'tehe-progress-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tehe-progress-title');
    overlay.innerHTML = `<div style="display:block;width:min(92vw,460px);max-height:90vh;overflow:auto;box-sizing:border-box;padding:16px;background:#202225;color:#f2f3f5;border:1px solid #555b64;border-radius:9px;box-shadow:0 14px 45px #000;font-family:Arial,sans-serif;">
  <div id="tehe-progress-title" style="font-size:16px;font-weight:700;line-height:1.35;overflow-wrap:anywhere;">Preparing ${kind === 'discord' ? 'Discord' : kind === 'leaderboard' ? 'Full Faction JSON' : 'Torn HTML'} Export</div>
  <div data-progress-phase style="margin-top:5px;color:#9da3ad;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Starting</div>
  <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;font-size:12px;"><span data-progress-message>Preparing export…</span><strong data-progress-percent>0%</strong></div>
  <div role="progressbar" aria-label="Export loading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="display:block;width:100%;height:12px;margin-top:7px;box-sizing:border-box;overflow:hidden;background:#111318;border:1px solid #454a52;border-radius:7px;">
    <div data-progress-bar style="display:block;width:0%;height:100%;box-sizing:border-box;background:linear-gradient(90deg,#f2a51a,#35d07f,#4da3ff);transition:width .2s ease;"></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:6px;margin-top:11px;font-size:11px;">
    <div data-api-count style="padding:7px;background:#17191d;border:1px solid #34373c;border-radius:4px;">API requests: discovering…</div>
    <div data-member-count style="padding:7px;background:#17191d;border:1px solid #34373c;border-radius:4px;">Members: discovering…</div>
    <div data-chunk-count style="padding:7px;background:#17191d;border:1px solid #34373c;border-radius:4px;">Chunks: discovering…</div>
  </div>
  <div data-cache-note hidden style="margin-top:8px;padding:7px;background:#17271f;color:#55d98a;border:1px solid #315c42;border-radius:4px;font-size:11px;font-weight:700;">Fresh five-minute cache reused — no Torn API calls were made.</div>
  <div data-export-output hidden style="margin-top:13px;padding-top:12px;border-top:1px solid #3c4047;">
    <div data-output-summary style="font-size:12px;font-weight:700;color:#55d98a;">Export ready. Nothing has been copied yet.</div>
    <label data-message-label hidden style="display:block;margin-top:9px;color:#c7cbd1;font-size:11px;font-weight:700;">Discord message
      <select data-message-picker style="display:block;width:100%;margin-top:4px;padding:7px;box-sizing:border-box;background:#151619;color:#f2f3f5;border:1px solid #555b64;border-radius:4px;"></select>
    </label>
    <textarea data-output-preview readonly aria-label="Generated export preview" style="display:block;width:100%;height:130px;margin-top:9px;padding:8px;box-sizing:border-box;resize:vertical;background:#0f1012;color:#e8e9eb;border:1px solid #555b64;border-radius:4px;font:11px/1.4 monospace;white-space:pre-wrap;"></textarea>
    <button type="button" data-export-action style="display:inline-block;margin-top:10px;padding:8px 12px;box-sizing:border-box;background:#287c4d;color:#ffffff;border:1px solid #4bb878;border-radius:5px;font-weight:700;cursor:pointer;">${kind === 'leaderboard' ? 'Download JSON File' : 'Copy to Clipboard'}</button>
  </div>
  <button type="button" data-close-progress hidden style="display:inline-block;margin:10px 0 0 7px;padding:8px 12px;box-sizing:border-box;background:#34383f;color:#f2f3f5;border:1px solid #5a606a;border-radius:5px;font-weight:700;cursor:pointer;">Close</button>
</div>`;
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483646', padding: '12px', boxSizing: 'border-box',
      background: '#000b', display: 'grid', placeItems: 'center',
    });
    global.document.body.appendChild(overlay);

    const dialog = overlay.firstElementChild;
    const progressBar = overlay.querySelector('[role="progressbar"]');
    const bar = overlay.querySelector('[data-progress-bar]');
    const phase = overlay.querySelector('[data-progress-phase]');
    const message = overlay.querySelector('[data-progress-message]');
    const percent = overlay.querySelector('[data-progress-percent]');
    const apiCount = overlay.querySelector('[data-api-count]');
    const memberCount = overlay.querySelector('[data-member-count]');
    const chunkCount = overlay.querySelector('[data-chunk-count]');
    const cacheNote = overlay.querySelector('[data-cache-note]');
    const output = overlay.querySelector('[data-export-output]');
    const outputSummary = overlay.querySelector('[data-output-summary]');
    const preview = overlay.querySelector('[data-output-preview]');
    const pickerLabel = overlay.querySelector('[data-message-label]');
    const picker = overlay.querySelector('[data-message-picker]');
    const actionButton = overlay.querySelector('[data-export-action]');
    const closeButton = overlay.querySelector('[data-close-progress]');
    let current = { percent: 0 };
    let exportItems = [];
    let exportFilename = '';

    const countText = (label, completed, total, suffix = '') => {
      if (total == null) return `${label}: discovering…`;
      return `${label}: ${completed || 0} / ${total}${suffix}`;
    };

    const selectedExportIndex = () => Math.max(0, Math.min(exportItems.length - 1, Number(picker.value) || 0));
    const displaySelectedExport = () => {
      preview.value = exportItems[selectedExportIndex()] || '';
    };

    function update(next) {
      const updateValue = typeof next === 'string' ? { message: next } : (next || {});
      current = { ...current, ...updateValue };
      const value = Math.max(0, Math.min(100, Math.round(toNumber(current.percent, 0))));
      bar.style.width = `${value}%`;
      percent.textContent = `${value}%`;
      progressBar.setAttribute('aria-valuenow', String(value));
      phase.textContent = String(current.phase || 'Loading').replace(/\b\w/g, (letter) => letter.toUpperCase());
      message.textContent = current.message || 'Preparing export…';
      apiCount.textContent = countText('API requests', current.apiCompleted, current.apiTotal, current.cacheHit ? ' (cache)' : '');
      memberCount.textContent = countText('Members', current.membersCompleted, current.membersTotal, current.cacheHit ? ' cached' : '');
      chunkCount.textContent = countText('Chunks', current.chunksCompleted, current.chunksTotal, current.chunkSize ? ` (${current.chunkSize} members each)` : '');
      cacheNote.hidden = !current.cacheHit;
    }

    function completeWithExport(payload, options = {}) {
      exportItems = (Array.isArray(payload) ? payload : [payload]).map((item) => String(item || ''));
      exportFilename = String(options.filename || '');
      picker.replaceChildren();
      exportItems.forEach((item, index) => {
        const option = global.document.createElement('option');
        option.value = String(index);
        option.textContent = `Message ${index + 1} of ${exportItems.length} (${item.length.toLocaleString()} characters)`;
        picker.appendChild(option);
      });
      pickerLabel.hidden = kind !== 'discord' || exportItems.length <= 1;
      displaySelectedExport();
      output.hidden = false;
      closeButton.hidden = false;
      update({ phase: 'complete', message: kind === 'leaderboard'
        ? 'JSON export generated. Review it below, then download when ready.'
        : 'Export generated. Review it below, then copy when ready.', percent: 100 });
      outputSummary.textContent = kind === 'leaderboard'
        ? `JSON file ready: ${exportFilename}. Nothing has been downloaded yet.`
        : exportItems.length > 1
        ? `${exportItems.length} Discord messages are ready. Select and copy each one in order.`
        : 'Export ready. Nothing has been copied yet.';
      dialog.scrollTop = dialog.scrollHeight;
    }

    function fail(errorMessage) {
      update({ phase: 'error', message: errorMessage || 'Export failed.' });
      message.style.color = '#ff7b8d';
      bar.style.background = '#ff5d73';
      closeButton.hidden = false;
    }

    picker.addEventListener('change', displaySelectedExport);
    actionButton.addEventListener('click', async () => {
      const index = selectedExportIndex();
      if (kind === 'leaderboard') {
        if (downloadJsonFile(exportItems[index] || '', exportFilename)) {
          outputSummary.textContent = `Downloaded ${exportFilename}. The generated JSON remains available here for another download.`;
          outputSummary.style.color = '#55d98a';
          actionButton.textContent = 'Download JSON Again';
        } else {
          outputSummary.textContent = 'The browser could not start the JSON download. The JSON remains visible below.';
          outputSummary.style.color = '#ffcf66';
        }
        return;
      }
      const copied = await copyText(exportItems[index] || '');
      if (copied) {
        outputSummary.textContent = exportItems.length > 1
          ? `Copied Discord message ${index + 1} of ${exportItems.length}. The generated messages remain available here.`
          : 'Copied to the clipboard. The generated export remains available here for re-copying.';
        outputSummary.style.color = '#55d98a';
        actionButton.textContent = 'Copy to Clipboard Again';
      } else {
        outputSummary.textContent = 'Clipboard permission was unavailable. The export is selected below for manual copying.';
        outputSummary.style.color = '#ffcf66';
        preview.focus();
        preview.select();
      }
    });
    closeButton.addEventListener('click', () => overlay.remove());
    update(current);

    return { update, completeWithExport, fail, close: () => overlay.remove() };
  }

  function setStatus(message, tone = 'normal') {
    const element = global.document?.getElementById('tehe-export-status');
    if (!element) return;
    element.textContent = message;
    element.style.color = tone === 'error' ? '#ff7b8d' : tone === 'success' ? '#55d98a' : '#c7cbd1';
  }

  const getExportSnapshot = createSnapshotProvider({
    loadCache: () => storageGet(STORAGE.snapshot, null),
    saveCache: (entry) => storageSet(STORAGE.snapshot, entry),
    fetchSnapshot: async (onProgress) => {
      onProgress({ phase: 'preparing', message: 'Checking for authoritative saved rankings…', percent: 1 });
      const sharedSnapshot = await requestSharedExportSnapshot(onProgress);
      if (sharedSnapshot) {
        await persistSharedSnapshot(sharedSnapshot);
        return sharedSnapshot;
      }
      onProgress({ phase: 'preparing', message: 'Shared rankings are unavailable; checking exporter API access and settings…', percent: 2 });
      const apiKey = await resolveApiKey();
      const factionIds = await resolveFactionScope(apiKey, onProgress);
      return collectSnapshot(apiKey, factionIds, onProgress, { apiOffset: 1 });
    },
    onCacheHit: (entry, now, onProgress) => {
      const secondsRemaining = Math.max(1, Math.ceil((SNAPSHOT_CACHE_MAX_AGE_MS - (now - entry.cachedAt)) / 1000));
      const membersTotal = entry.snapshot.players.length;
      const chunksTotal = Math.ceil(membersTotal / MEMBER_PROGRESS_CHUNK_SIZE);
      onProgress({
        phase: 'cache',
        message: `Using cached live data; a fresh API lookup is required in ${secondsRemaining} seconds.`,
        percent: 95,
        cacheHit: true,
        apiStarted: 0,
        apiCompleted: 0,
        apiTotal: 0,
        membersCompleted: membersTotal,
        membersTotal,
        chunksCompleted: chunksTotal,
        chunksTotal,
        chunkSize: MEMBER_PROGRESS_CHUNK_SIZE,
      });
    },
  });

  async function runExport(kind, buttons) {
    const progressDialog = createProgressDialog(kind);
    buttons.forEach((button) => { button.disabled = true; });
    try {
      setStatus('Preparing export…');
      const snapshot = await getExportSnapshot((progress) => {
        progressDialog.update(progress);
        setStatus(typeof progress === 'string' ? progress : progress.message);
      });
      progressDialog.update({ phase: 'rendering', message: 'Applying the approved styling and formatting…', percent: 99 });
      if (kind === 'discord') {
        const messages = buildDiscordMessages(snapshot);
        const savedExports = readHistory(await storageGet(STORAGE.exports, {}));
        await storageSet(STORAGE.exports, { ...savedExports, [kind]: { generatedAt: new Date().toISOString(), payload: messages } });
        progressDialog.completeWithExport(messages);
        setStatus(`${messages.length} Discord message${messages.length === 1 ? '' : 's'} ready to copy.`, 'success');
      } else {
        const isJson = kind === 'leaderboard';
        const payload = isJson ? buildFactionJson(snapshot) : buildNewsletterHtml(snapshot);
        const filename = isJson ? factionJsonFilename(snapshot) : '';
        const savedExports = readHistory(await storageGet(STORAGE.exports, {}));
        await storageSet(STORAGE.exports, { ...savedExports, [kind]: {
          generatedAt: new Date().toISOString(),
          mediaType: isJson ? 'application/json' : 'text/html',
          filename: filename || null,
          payload,
        } });
        progressDialog.completeWithExport(payload, { filename });
        setStatus(isJson ? 'Full faction JSON ready to download.' : 'Torn HTML ready to copy.', 'success');
      }
    } catch (error) {
      const errorMessage = error?.message || 'Export failed.';
      progressDialog.fail(errorMessage);
      setStatus(errorMessage, errorMessage === 'Export cancelled.' ? 'normal' : 'error');
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function findEliminationHeader() {
    if (!global.document) return null;
    const matches = (selector) => [...global.document.querySelectorAll(selector)].filter((element) => {
      if (element.closest('#tehe-export-controls')) return false;
      return /^elimination$/i.test(String(element.textContent || '').trim());
    });
    const semantic = matches('h1,h2,h3,h4,h5,[role="heading"]');
    if (semantic.length) return semantic[0];
    const titled = matches('#mainContainer [class*="title"],main [class*="title"]')
      .filter((element) => !/^(A|BUTTON)$/i.test(element.tagName));
    return titled.find((element) => !titled.some((other) => other !== element && element.contains(other))) || null;
  }

  function createPanel() {
    if (!global.document?.body || global.document.getElementById('tehe-export-controls')) return;
    const header = findEliminationHeader();
    if (!header) return;
    const panel = global.document.createElement('span');
    panel.id = 'tehe-export-controls';
    panel.setAttribute('aria-label', 'Elimination exports');
    panel.innerHTML = `<style>
  #tehe-export-controls{display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center;max-width:100%;margin-left:8px;box-sizing:border-box;vertical-align:middle;font:11px Arial,sans-serif}
  #tehe-export-controls button{display:inline-block;width:auto;min-height:24px;margin:0;padding:3px 7px;box-sizing:border-box;border:1px solid #666b73;border-radius:4px;background:#30343a;color:#f7f7f7;font:700 10px/1.25 Arial,sans-serif;white-space:nowrap;cursor:pointer}
  #tehe-export-controls button:hover{background:#3a4048;border-color:#9299a3}
  #tehe-export-controls button:disabled{opacity:.55;cursor:wait}
  #tehe-export-status{display:inline-block;max-width:100%;margin-left:3px;color:#9da3ad;font:10px/1.25 Arial,sans-serif;white-space:normal}
</style>
<button type="button" data-export="newsletter" title="${escapeHtml(BUTTON_LABELS.newsletter)}" aria-label="${escapeHtml(BUTTON_LABELS.newsletter)}">HTML Export</button>
<button type="button" data-export="discord" title="${escapeHtml(BUTTON_LABELS.discord)}" aria-label="${escapeHtml(BUTTON_LABELS.discord)}">Discord Export</button>
<button type="button" data-export="leaderboard" title="${escapeHtml(BUTTON_LABELS.leaderboard)}" aria-label="${escapeHtml(BUTTON_LABELS.leaderboard)}">Full Faction Export</button>
<span id="tehe-export-status" role="status">Ready.</span>`;
    const buttons = [...panel.querySelectorAll('button[data-export]')];
    buttons.forEach((button) => button.addEventListener('click', () => runExport(button.dataset.export, buttons)));
    header.appendChild(panel);
  }

  function init() {
    createPanel();
    const observer = new MutationObserver(createPanel);
    observer.observe(global.document.documentElement, { childList: true, subtree: true });
  }

  const core = Object.freeze({
    VERSION,
    SNAPSHOT_CACHE_MAX_AGE_MS,
    REQUESTS_PER_MINUTE,
    REQUEST_START_INTERVAL_MS,
    MAX_CONCURRENT_REQUESTS,
    BUTTON_LABELS,
    TEAM_STYLES,
    STORAGE,
    SHARED_EXPORT,
    DEFAULT_ALLIANCE_FACTION_IDS,
    PARTICIPANT_SEED,
    escapeHtml,
    escapeDiscord,
    canonicalTeamName,
    teamStyle,
    factionStyle,
    normalizeFactionBasic,
    normalizeMembers,
    normalizeTeamStandings,
    normalizeCompetition,
    participantComparator,
    assignRanks,
    classifyMember,
    buildNewsletterHtml,
    buildDiscordMessages,
    buildFactionJson,
    factionJsonFilename,
    downloadJsonFile,
    parseFactionIds,
    readHistory,
    readSharedRecord,
    normalizeSharedExportSnapshot,
    isSharedSnapshotFresh,
    sharedBridgeAvailable,
    requestSharedExportSnapshot,
    seedParticipantLedger,
    readParticipantLedger,
    serializeParticipantLedger,
    participantLookupPlan,
    frozenParticipantRecord,
    serializeHistory,
    roastPlayer,
    packDiscordBlocks,
    createRequestScheduler,
    isSnapshotCacheFresh,
    createSnapshotProvider,
    pacedMap,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (global?.document && typeof MutationObserver !== 'undefined') init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
