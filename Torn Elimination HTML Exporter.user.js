// ==UserScript==
// @name         Torn Elimination HTML Exporter
// @namespace    https://github.com/SharpSplinter/torn-elimination-html-exporter
// @version      1.0.0
// @description  Export styled Torn HTML newsletters and full faction Elimination leaderboards.
// @author       SharpSplinter
// @homepageURL  https://github.com/SharpSplinter/torn-elimination-html-exporter
// @supportURL   https://github.com/SharpSplinter/torn-elimination-html-exporter/issues
// @downloadURL  https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js
// @updateURL    https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js
// @match        https://www.torn.com/page.php?sid=competition*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @connect      api.torn.com
// @run-at       document-end
// ==/UserScript==

(function eliminationHtmlExporter(global) {
  'use strict';

  const VERSION = '1.0.0';
  const API_BASE = 'https://api.torn.com/v2';
  const PDA_API_KEY = '###PDA-APIKEY###';
  const BUTTON_LABELS = Object.freeze({
    newsletter: 'Export Torn HTML — Elimination Alliance Update (Top Performers, Team Styling & Dropout Roast)',
    leaderboard: 'Export Torn HTML — Full Faction Leaderboard (Current Faction; Alliance/Additional Factions Optional)',
  });
  const STORAGE = Object.freeze({
    apiKey: 'tehe.apiKey',
    factionIds: 'tehe.factionIds',
    history: 'tehe.rankHistory.v1',
  });
  const REQUEST_DELAY_MS = 1200;
  const CHUNK_SIZE = 10;
  const CHUNK_PAUSE_MS = 10000;

  const TEAM_STYLES = Object.freeze({
    'rocket scientists': { name: 'Rocket Scientists', icon: '🚀', color: '#ff9f43' },
    'brain surgeons': { name: 'Brain Surgeons', icon: '🧠', color: '#56c7f2' },
    'touching grass': { name: 'Touching Grass', icon: '🌿', color: '#9ac300' },
    'sticks and stones': { name: 'Sticks and Stones', icon: '🪨', color: '#d4632d' },
    apex: { name: 'APEX', icon: '🌋', color: '#ef5b55' },
    reptilians: { name: 'Reptilians', icon: '👁️', color: '#95a76f' },
    'conspiracy theorists': { name: 'Conspiracy Theorists', icon: '📐', color: '#42b6d0' },
    'gold dust': { name: 'Gold Dust', icon: '✨', color: '#f2b544' },
    'loose cannons': { name: 'Loose Cannons', icon: '💣', color: '#9ca8cc' },
    'high voltage': { name: 'High Voltage', icon: '⚡', color: '#29abe2' },
    'inanimate objects': { name: 'Inanimate Objects', icon: '🪑', color: '#e1e5e5' },
    'nine lives': { name: 'Nine Lives', icon: '🐈', color: '#b8bed8' },
  });

  const KNOWN_FORMER_TEAMS = Object.freeze({
    3583932: 'Loose Cannons',
    959585: 'Sticks and Stones',
    4093649: 'Loose Cannons',
    3676010: 'Rocket Scientists',
    2911255: 'Reptilians',
  });

  const SPECIAL_ROASTS = Object.freeze({
    a1ry: (p) => `${p.name} managed ${p.attacks} attacks and still found the fastest route out of the event. At least that ${movementText(p.movement)} gave the exit some momentum.`,
    Five: (p) => `${p.name} lived up to the name by contributing roughly five fewer attacks than anyone was hoping for: a flawless zero.`,
    GORYDAMNREAPER: (p) => `${p.name} brought the intimidating name, left the attacks at zero, and reaped absolutely nothing.`,
    'Atomic-Toast': (p) => `${p.name} skipped the atomic part and went straight to toast: zero attacks and an early trip home.`,
    Dscott138: (p) => `${p.name} vanished from the Reptilians so quietly that even the conspiracy board has no attacks to pin on them.`,
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
      icon: '🎯',
      color: '#d7dce2',
    };
  }

  function factionStyle(faction, index = 0) {
    const identity = `${faction?.tag || ''} ${faction?.name || ''}`.toLowerCase();
    if (identity.includes('$3xy') || identity.includes('naughty souls')) {
      return { icon: '💜', color: '#c084fc', background: '#24152f' };
    }
    if (identity.includes('nasa') || identity.includes('naughty sanctuary')) {
      return { icon: '💙', color: '#67c7ff', background: '#102633' };
    }
    const palette = [
      { icon: '🧡', color: '#ff9f43', background: '#2c2118' },
      { icon: '💚', color: '#77d68a', background: '#17281c' },
      { icon: '💛', color: '#f4d35e', background: '#2b2717' },
      { icon: '❤️', color: '#ff7675', background: '#2d1919' },
    ];
    return palette[index % palette.length];
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
      };
      if (normalized.id) byId.set(normalized.id, normalized);
      byName.set(canonicalTeamName(name), normalized);
    }
    return { byId, byName };
  }

  function normalizeCompetition(payload) {
    const source = unwrap(payload, 'competition') || {};
    return {
      name: String(source.name || source.competition || ''),
      score: toNumber(source.score),
      attacks: toNumber(source.attacks),
      teamName: String(source.team?.name || source.team || '').trim(),
      teamId: toNumber(source.team?.id ?? source.team_id, null),
    };
  }

  function participantComparator(a, b) {
    return (
      toNumber(b.score) - toNumber(a.score) ||
      toNumber(b.attacks) - toNumber(a.attacks) ||
      (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }) ||
      toNumber(a.id) - toNumber(b.id)
    );
  }

  function assignRanks(players, previousHistory = {}) {
    const sorted = [...players].sort(participantComparator);
    sorted.forEach((player, index) => {
      player.allianceRank = index + 1;
      const previousRank = toNumber(previousHistory[player.id]?.allianceRank, null);
      player.movement = previousRank ? previousRank - player.allianceRank : 0;
    });

    const factions = new Map();
    const teams = new Map();
    for (const player of sorted) {
      if (!factions.has(player.factionId)) factions.set(player.factionId, []);
      factions.get(player.factionId).push(player);
      const teamKey = canonicalTeamName(player.teamName);
      if (teamKey) {
        if (!teams.has(teamKey)) teams.set(teamKey, []);
        teams.get(teamKey).push(player);
      }
    }
    for (const group of factions.values()) {
      group.sort(participantComparator).forEach((player, index) => { player.factionRank = index + 1; });
    }
    for (const group of teams.values()) {
      group.sort(participantComparator).forEach((player, index) => { player.teamRank = index + 1; });
    }
    return sorted;
  }

  function classifyMember(member, competition, prior, standings) {
    const inElimination = /elimination/i.test(competition.name);
    let currentTeam = competition.teamName;
    if (!currentTeam && competition.teamId && standings.byId.has(competition.teamId)) {
      currentTeam = standings.byId.get(competition.teamId).name;
    }
    const previousTeam = prior?.teamName || KNOWN_FORMER_TEAMS[member.id] || '';
    const hasActivity = competition.score > 0 || competition.attacks > 0;
    const status = inElimination && currentTeam
      ? 'active'
      : inElimination && (hasActivity || previousTeam)
        ? 'dropped'
        : 'inactive';
    const teamName = currentTeam || previousTeam;
    const standing = standings.byId.get(competition.teamId) || standings.byName.get(canonicalTeamName(teamName));
    return {
      ...member,
      status,
      teamName,
      teamId: competition.teamId || standing?.id || null,
      teamScore: standing?.score ?? competition.score,
      teamPosition: standing?.position ?? null,
      score: competition.score,
      attacks: competition.attacks,
    };
  }

  function factionTitle(faction) {
    const tag = faction.tag ? `[${faction.tag}] ` : '';
    return `${tag}${faction.name}`.toUpperCase();
  }

  function statusIcon(player) {
    if (player.status === 'dropped') return '🔴';
    if (player.allianceRank <= 3) return ['🥇', '🥈', '🥉'][player.allianceRank - 1];
    if (player.allianceRank <= 10) return '🟢';
    if (player.allianceRank <= 15) return '🔵';
    return '⚪';
  }

  function movementHtml(player) {
    if (player.movement > 0) return ` <span style="color:#35d07f;font-weight:700;">▲${player.movement}</span>`;
    if (player.movement < 0) return ` <span style="color:#ff5d73;font-weight:700;">▼${Math.abs(player.movement)}</span>`;
    return '';
  }

  function playerRowHtml(player) {
    const team = teamStyle(player.teamName);
    const teamRank = player.teamRank ? ` #${player.teamRank}` : '';
    const former = player.status === 'dropped' ? 'Former ' : '';
    return `<div style="margin:8px 0;padding:10px 12px;background:#17191d;border-left:4px solid ${team.color};border-radius:4px;line-height:1.45;">
  <span style="font-size:18px;">${statusIcon(player)}</span>&nbsp;
  <a href="https://www.torn.com/profiles.php?XID=${player.id}" style="color:${team.color};font-weight:700;text-decoration:none;">${escapeHtml(player.name)}</a>
  <span style="color:#f2f3f5;font-weight:700;"> — 🅰 #${player.allianceRank}${movementHtml(player)} &nbsp; 🅵 #${player.factionRank}</span><br>
  <span style="color:#c7cbd1;">${team.icon} ${former}<span style="color:${team.color};font-weight:700;">${escapeHtml(team.name)}${teamRank}</span> &nbsp;•&nbsp; ⚔️ ${player.attacks.toLocaleString()} attacks</span>
</div>`;
  }

  function factionSummary(factionPlayers) {
    const active = factionPlayers.filter((player) => player.status === 'active');
    const topThree = active.filter((player) => player.allianceRank <= 3).length;
    const topTen = active.filter((player) => player.allianceRank <= 10).length;
    const topFifteen = active.filter((player) => player.allianceRank <= 15).length;
    const clauses = [];
    if (topThree === 3) clauses.push('a clean sweep of the alliance podium');
    else if (topThree) clauses.push(`${topThree} podium place${topThree === 1 ? '' : 's'}`);
    if (topTen) clauses.push(`${topTen} place${topTen === 1 ? '' : 's'} in the alliance top ten`);
    if (topFifteen > topTen) clauses.push(`${topFifteen - topTen} more inside the top fifteen`);
    return clauses.length
      ? `The faction currently holds ${clauses.join(', including ')}.`
      : 'The faction is still hunting for its first alliance top-fifteen position.';
  }

  function roastPlayer(player) {
    if (SPECIAL_ROASTS[player.name]) return SPECIAL_ROASTS[player.name](player);
    if (player.attacks === 0) return `${player.name} recorded zero attacks and treated Elimination like spectator mode with extra steps.`;
    if (player.movement > 0) return `${player.name} climbed ${player.movement} places, then apparently kept climbing straight out of the event.`;
    return `${player.name} finished with ${player.attacks} attacks before the elimination door completed its one-way demonstration.`;
  }

  function headerBlock(title, subtitle) {
    return `<div style="text-align:center;font-weight:700;">
  <div style="font-size:28px;color:#ffffff;letter-spacing:.4px;margin-bottom:8px;">${escapeHtml(title)}</div>
  <div style="font-size:14px;color:#c7cbd1;margin-bottom:5px;">${subtitle}</div>
  <div style="font-size:14px;color:#c7cbd1;">🅰 <span style="color:#ffffff;">Alliance Rank</span> &nbsp;•&nbsp; 🅵 <span style="color:#ffffff;">Faction Rank</span></div>
</div>`;
  }

  function factionHeaderHtml(faction, index) {
    const style = factionStyle(faction, index);
    return `<div style="margin:24px 0 12px;padding:12px;text-align:center;font-size:20px;font-weight:700;color:${style.color};background:${style.background};border:1px solid ${style.color};border-radius:5px;">${style.icon} ${escapeHtml(factionTitle(faction))}</div>`;
  }

  function sectionHeaderHtml(icon, label, color) {
    return `<div style="margin:18px 0 10px;text-align:center;font-size:17px;font-weight:700;color:${color};">${icon} ${escapeHtml(label)}</div>`;
  }

  function documentShell(body) {
    return `<!-- Torn Elimination HTML Exporter v${VERSION} -->
<div style="max-width:600px;margin:0 auto;padding:22px;background:#202225;color:#f2f3f5;font-family:Arial,Helvetica,sans-serif;border:1px solid #34373c;border-radius:7px;box-sizing:border-box;">
${body}
</div>`;
  }

  function buildNewsletterHtml(snapshot) {
    const players = snapshot.players || [];
    const factions = snapshot.factions || [];
    const activeTop = players.filter((player) => player.status === 'active' && player.allianceRank <= 15);
    const dropped = players.filter((player) => player.status === 'dropped');
    const parts = [
      headerBlock(
        '🏆 ELIMINATION ALLIANCE UPDATE',
        '🥇🥈🥉 <span style="color:#ffd166;">Podium</span> &nbsp;•&nbsp; 🟢 <span style="color:#35d07f;">Top 10</span> &nbsp;•&nbsp; 🔵 <span style="color:#4da3ff;">Top 15</span> &nbsp;•&nbsp; 🔴 <span style="color:#ff5d73;">Dropped Out</span>',
      ),
    ];

    factions.forEach((faction, index) => {
      const group = activeTop.filter((player) => player.factionId === faction.id);
      if (!group.length) return;
      parts.push(factionHeaderHtml(faction, index));
      const podium = group.filter((player) => player.allianceRank <= 3);
      const topTen = group.filter((player) => player.allianceRank > 3 && player.allianceRank <= 10);
      const topFifteen = group.filter((player) => player.allianceRank > 10 && player.allianceRank <= 15);
      if (podium.length) {
        parts.push(sectionHeaderHtml('🥇🥈🥉', 'PODIUM', '#ffd166'));
        parts.push(...podium.map(playerRowHtml));
      }
      if (topTen.length) {
        parts.push(sectionHeaderHtml('🟢', 'ALLIANCE TOP 10', '#35d07f'));
        parts.push(...topTen.map(playerRowHtml));
      }
      if (topFifteen.length) {
        parts.push(sectionHeaderHtml('🔵', 'ALLIANCE TOP 15', '#4da3ff'));
        parts.push(...topFifteen.map(playerRowHtml));
      }
      parts.push(`<div style="margin:14px 4px 0;color:#d7d9dd;line-height:1.55;">${escapeHtml(factionSummary(group))}</div>`);
    });

    if (dropped.length) {
      parts.push('<div style="margin:28px 0 8px;padding:13px;text-align:center;font-size:22px;font-weight:700;color:#ff5d73;background:#31191f;border:1px solid #ff5d73;border-radius:5px;">🔴 DROPPED OUT — WALL OF SHAME 🔴</div>');
      factions.forEach((faction, index) => {
        const group = dropped.filter((player) => player.factionId === faction.id);
        if (!group.length) return;
        parts.push(factionHeaderHtml(faction, index));
        for (const player of group) {
          parts.push(playerRowHtml(player));
          parts.push(`<div style="margin:-2px 8px 13px;color:#ffadb8;font-style:italic;line-height:1.5;">🔥 ${escapeHtml(roastPlayer(player))}</div>`);
        }
      });
    }

    parts.push('<div style="margin-top:25px;text-align:center;font-weight:700;color:#9ca3ad;">Keep swinging, keep climbing—and if you drop out, at least give the newsletter something funny to write.</div>');
    return documentShell(parts.join('\n'));
  }

  function buildLeaderboardHtml(snapshot) {
    const players = snapshot.players || [];
    const factions = snapshot.factions || [];
    const parts = [
      headerBlock(
        '🏆 FULL ELIMINATION LEADERBOARD',
        '🥇🥈🥉 <span style="color:#ffd166;">Podium</span> &nbsp;•&nbsp; 🟢 <span style="color:#35d07f;">Top 10</span> &nbsp;•&nbsp; 🔵 <span style="color:#4da3ff;">Top 15</span> &nbsp;•&nbsp; ⚪ <span style="color:#d7dce2;">Full Field</span> &nbsp;•&nbsp; 🔴 <span style="color:#ff5d73;">Dropped Out</span>',
      ),
    ];

    factions.forEach((faction, index) => {
      const group = players
        .filter((player) => player.factionId === faction.id && player.status !== 'inactive')
        .sort((a, b) => a.factionRank - b.factionRank);
      if (!group.length) return;
      parts.push(factionHeaderHtml(faction, index));
      parts.push(sectionHeaderHtml('📊', `${group.length} ELIMINATION PARTICIPANTS`, '#ffffff'));
      parts.push(...group.map(playerRowHtml));
      const attacks = group.reduce((total, player) => total + player.attacks, 0);
      const active = group.filter((player) => player.status === 'active').length;
      const dropped = group.filter((player) => player.status === 'dropped').length;
      parts.push(`<div style="margin:14px 4px 0;text-align:center;font-weight:700;color:#c7cbd1;">${active} active &nbsp;•&nbsp; ${dropped} dropped &nbsp;•&nbsp; ${attacks.toLocaleString()} total attacks</div>`);
    });

    parts.push('<div style="margin-top:25px;text-align:center;font-weight:700;color:#9ca3ad;">Generated from current Torn Elimination competition data.</div>');
    return documentShell(parts.join('\n'));
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

  function serializeHistory(players) {
    return Object.fromEntries(players.map((player) => [player.id, {
      allianceRank: player.allianceRank,
      factionRank: player.factionRank,
      teamName: player.teamName,
      attacks: player.attacks,
      score: player.score,
      status: player.status,
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

  async function pacedMap(items, worker, onProgress = () => {}) {
    const results = [];
    for (let index = 0; index < items.length; index += 1) {
      results.push(await worker(items[index], index));
      onProgress(index + 1, items.length);
      const completed = index + 1;
      if (completed >= items.length) continue;
      await sleep(completed % CHUNK_SIZE === 0 ? CHUNK_PAUSE_MS : REQUEST_DELAY_MS);
    }
    return results;
  }

  async function currentFactionId(apiKey) {
    const payload = await apiGet('/user/faction?striptags=true', apiKey);
    const source = unwrap(payload, 'faction') || {};
    return toNumber(source.id ?? source.ID, null);
  }

  async function collectSnapshot(apiKey, factionIds, onProgress = () => {}) {
    onProgress('Loading faction rosters and team standings…');
    const [standingsPayload, factionPayloads] = await Promise.all([
      apiGet('/torn/elimination', apiKey).catch(() => ({ elimination: [] })),
      Promise.all(factionIds.map(async (id) => {
        const [basic, members] = await Promise.all([
          apiGet(`/faction/${id}/basic?striptags=true`, apiKey),
          apiGet(`/faction/${id}/members?striptags=true`, apiKey),
        ]);
        const faction = normalizeFactionBasic(basic, id);
        return { faction, members: normalizeMembers(members, faction) };
      })),
    ]);
    const standings = normalizeTeamStandings(standingsPayload);
    const factions = factionPayloads.map((entry) => entry.faction);
    const members = factionPayloads.flatMap((entry) => entry.members);
    const previousHistory = readHistory(await storageGet(STORAGE.history, {}));

    const records = await pacedMap(members, async (member) => {
      const payload = await apiGet(`/user/${member.id}/competition`, apiKey);
      return classifyMember(member, normalizeCompetition(payload), previousHistory[member.id], standings);
    }, (done, total) => onProgress(`Loading Elimination records… ${done}/${total}`));

    const players = assignRanks(records.filter((player) => player.status !== 'inactive'), previousHistory);
    await storageSet(STORAGE.history, serializeHistory(players));
    return { factions, players, generatedAt: new Date().toISOString() };
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

  async function resolveFactionScope(apiKey) {
    const currentId = await currentFactionId(apiKey);
    const saved = await storageGet(STORAGE.factionIds, []);
    const defaults = Array.isArray(saved) && saved.length ? saved : currentId ? [currentId] : [];
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

  function showCopyFallback(html) {
    const overlay = global.document.createElement('div');
    overlay.id = 'tehe-copy-fallback';
    overlay.innerHTML = `<div style="width:min(92vw,700px);background:#202225;border:1px solid #555;border-radius:8px;padding:16px;color:#fff;box-shadow:0 12px 40px #000;">
  <div style="font-weight:700;margin-bottom:10px;">Copy the generated Torn HTML</div>
  <textarea style="width:100%;height:60vh;box-sizing:border-box;background:#111;color:#eee;border:1px solid #555;padding:10px;">${escapeHtml(html)}</textarea>
  <button type="button" style="margin-top:10px;padding:9px 14px;">Close</button>
</div>`;
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2147483647', background: '#000b', display: 'grid', placeItems: 'center' });
    overlay.querySelector('button').addEventListener('click', () => overlay.remove());
    global.document.body.appendChild(overlay);
    overlay.querySelector('textarea').select();
  }

  async function deliverHtml(html) {
    const copied = await copyText(html);
    if (!copied) showCopyFallback(html);
    return copied;
  }

  function setStatus(message, tone = 'normal') {
    const element = global.document?.getElementById('tehe-export-status');
    if (!element) return;
    element.textContent = message;
    element.style.color = tone === 'error' ? '#ff7b8d' : tone === 'success' ? '#55d98a' : '#c7cbd1';
  }

  async function runExport(kind, buttons) {
    buttons.forEach((button) => { button.disabled = true; });
    try {
      setStatus('Preparing export…');
      const apiKey = await resolveApiKey();
      const factionIds = await resolveFactionScope(apiKey);
      const snapshot = await collectSnapshot(apiKey, factionIds, (message) => setStatus(message));
      const html = kind === 'newsletter' ? buildNewsletterHtml(snapshot) : buildLeaderboardHtml(snapshot);
      const copied = await deliverHtml(html);
      setStatus(copied ? 'Copied Torn HTML to the clipboard.' : 'Clipboard access was unavailable; use the open copy box.', copied ? 'success' : 'normal');
    } catch (error) {
      setStatus(error?.message || 'Export failed.', error?.message === 'Export cancelled.' ? 'normal' : 'error');
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function createPanel() {
    if (!global.document?.body || global.document.getElementById('tehe-export-panel')) return;
    const panel = global.document.createElement('section');
    panel.id = 'tehe-export-panel';
    panel.setAttribute('aria-label', 'Elimination HTML exports');
    panel.innerHTML = `<style>
  #tehe-export-panel{position:fixed;right:14px;bottom:14px;z-index:999999;width:min(360px,calc(100vw - 28px));box-sizing:border-box;padding:12px;background:#202225ee;border:1px solid #45484f;border-radius:9px;box-shadow:0 8px 28px #0009;font:13px Arial,sans-serif;color:#f2f3f5}
  #tehe-export-panel .tehe-title{text-align:center;font-weight:700;margin:0 0 8px;color:#fff}
  #tehe-export-panel button{display:block;width:100%;margin:7px 0;padding:9px 10px;border:1px solid #59606a;border-radius:6px;background:#30343a;color:#f7f7f7;font-weight:700;line-height:1.3;text-align:left;cursor:pointer}
  #tehe-export-panel button:hover{background:#3a4048;border-color:#7e8794}
  #tehe-export-panel button:disabled{opacity:.55;cursor:wait}
  #tehe-export-status{min-height:16px;margin-top:7px;text-align:center;font-size:12px;color:#c7cbd1}
  @media(max-width:520px){#tehe-export-panel{right:8px;bottom:8px;width:calc(100vw - 16px)}#tehe-export-panel button{font-size:12px}}
</style>
<div class="tehe-title">Elimination HTML Exports</div>
<button type="button" data-export="newsletter">${escapeHtml(BUTTON_LABELS.newsletter)}</button>
<button type="button" data-export="leaderboard">${escapeHtml(BUTTON_LABELS.leaderboard)}</button>
<div id="tehe-export-status" role="status">Ready.</div>`;
    const buttons = [...panel.querySelectorAll('button[data-export]')];
    buttons.forEach((button) => button.addEventListener('click', () => runExport(button.dataset.export, buttons)));
    global.document.body.appendChild(panel);
  }

  function init() {
    createPanel();
    const observer = new MutationObserver(createPanel);
    observer.observe(global.document.documentElement, { childList: true, subtree: true });
  }

  const core = Object.freeze({
    VERSION,
    BUTTON_LABELS,
    TEAM_STYLES,
    escapeHtml,
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
    buildLeaderboardHtml,
    parseFactionIds,
    readHistory,
    serializeHistory,
    roastPlayer,
    pacedMap,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (global?.document && typeof MutationObserver !== 'undefined') init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
