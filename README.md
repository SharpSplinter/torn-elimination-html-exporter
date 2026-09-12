# Torn Elimination HTML Exporter

A standalone userscript for desktop userscript managers and TornPDA. It produces Torn HTML newsletters, three-part Discord updates, and full faction JSON data files. When **Torn Elimination Faction Rankings** is installed on the same Torn browser/TornPDA profile, the exporter automatically reuses its authoritative participant, dropout, attack, and rank snapshot. It retains its own API-backed fallback when the rankings script is unavailable.

The exporter uses the finalized Torn Forum/Newsletter and native Discord layouts as its output templates.

Alliance, faction, and team placements are ranked by Elimination attacks. The script cross-checks every participant against the live `/torn/elimination` standings: a confirmed participant on a surviving team remains active, a participant whose enrollment disappears is dropped, and every member of an eliminated team is dropped. Ordinary faction members who never enrolled are excluded from every export.

## What it adds

Three compact export actions appear directly beside the **Elimination** page heading:

1. **Export Torn HTML — Elimination Alliance Update (Top Performers, Team Styling & Dropout Roast)**
2. **Export Discord Markdown — Elimination Alliance Update (Three Mobile-Safe Messages with Team Icons & Dropout Roast)**
3. **Export JSON File — Full Faction Elimination Rankings (Current Faction; Alliance/Additional Factions Optional)**

Selecting an export opens a progress dialog with a live completion bar, percentage, API-request count, member count, and ten-member progress-chunk count. When generation reaches 100%, the same dialog keeps a selectable preview open. Torn HTML and Discord exports reveal an explicit **Copy to Clipboard** button; the Full Faction export reveals **Download JSON File**. Nothing is copied or downloaded automatically. Discord messages can be selected and copied individually, while the generated JSON remains available for repeated downloads until the dialog is closed.

All three export actions share the same complete data snapshot for up to five minutes. The preferred source is the companion rankings script's persistent snapshot; the exporter requests one refresh there and imports the result into its own durable cache. The other formats can then be generated immediately without repeating faction or member lookups. The cache survives a page reload, and simultaneous requests share one in-progress lookup. Once the snapshot reaches five minutes old, the next export must obtain fresh data before generating output.

Version 1.7.0 started a clean exporter participant/rank cache so terminal states produced by older exporter releases cannot contaminate the authoritative rankings import. Saved API and faction settings remain intact.

Version 1.8.0 changes Full Faction Export from an HTML leaderboard into a structured JSON file. The completed progress window keeps the JSON available and downloads it only when **Download JSON File** is explicitly selected.

A separate persistent participant ledger is seeded with the 63 supplied Naughty Souls/Sanctuary participants: 55 active and eight confirmed dropouts. It preserves the highest confirmed attack count so Torn cannot erase historical dropout results. Once a participant is confirmed dropped, that state is terminal: the script never calls that member's competition endpoint again and only recalculates their alliance/faction ranks. Unseeded faction scopes receive a roster discovery pass, after which only confirmed participants remain in the ledger.

## Output templates

### Torn Forum/Newsletter HTML

- Inline CSS only; no scripts, stylesheets, or CSS variables in exported markup.
- Fluid `width: auto`, `max-width: 601px`, border-box sizing, and long-name wrapping throughout so Torn does not clip the right edge.
- Torn-safe text badges replace Unicode emoji that Torn may convert to question marks.
- Centered bold headers, team-colored player names, A/F rank badges, movement, attacks, and dropout call-outs.
- One global active order—Podium, Alliance Top 10, then Alliance Top 15—with factions separated only in the final Dropped Out section.

### Discord Markdown

- Native H1-H3 headings, `-#` subtext, block-quoted player cards, bold masked profile links, and escaped player names.
- Colored team markers and the agreed team icons; no ANSI or code-block coloring.
- Exactly three messages, each no longer than 1,950 characters: Podium/Top 10, Top 15/snapshots, then Dropped Out grouped by faction.

### Full Faction JSON

- Downloads one UTF-8 `.json` file after an explicit click in the completed progress dialog.
- Includes export metadata, event scope, global team standings, faction summaries, every active participant, and every confirmed dropout.
- Preserves alliance, faction, and team ranks; attacks; movement; former team details; and profile URLs without including API keys.

## Install

### Desktop

[Install the userscript directly](https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js) in Tampermonkey or another compatible userscript manager, open Torn's Elimination page, and enter a public Torn API key on the first export.

### TornPDA

Import the `.user.js` file as a userscript. TornPDA replaces the embedded API-key marker automatically and routes API requests through its native HTTP bridge.

## Use

1. Open Torn's Elimination page and select **HTML Export**, **Discord Export**, or **Full Faction Export** beside the page heading.
2. Confirm the current faction ID or enter multiple comma-separated faction IDs for an alliance-wide export.
3. Follow the live progress bar while the script reads faction rosters, live team standings, and active/unresolved participant competition records. The dialog reports the percentage, completed/total API requests, members, and ten-member progress chunks, including how many confirmed dropouts were reused without calls. A start-time scheduler targets 90 API calls per minute with up to six requests in flight, leaving headroom beneath Torn's 100-calls-per-minute user limit. Setup calls, faction calls, and member calls all use the same limiter.
4. At 100%, review the persistent preview. Select **Copy to Clipboard** for Torn HTML/Discord, or **Download JSON File** for the Full Faction export.
5. Paste Torn HTML into the Torn faction newsletter/forum Source Code editor, paste the numbered Discord messages into Discord, or retain/import the downloaded JSON as needed.

The script stores only the entered faction scope, the desktop API key, persistent participant/rank history, generated export payloads, and the latest five-minute snapshot in userscript-local storage. This durable state provides movement indicators, preserves former-team and attack data after dropout, and keeps completed exports available for subsequent updates without poisoning the live participant set. The companion rankings bridge publishes only non-secret event data (participant identity, team, attacks, status, and ranks) to Torn-origin browser storage; API keys never enter that bridge.

If the live `/torn/elimination` standings are missing or malformed, the export stops with an error. It never substitutes an empty team list or marks the full roster as dropped out.

If Torn returns HTTP 429 or API error 5, the exporter automatically backs off and retries through the same rate-limited queue. Because Torn applies the limit across all keys belonging to a user, other tools using your keys can consume the remaining headroom.

## Validation

Run the dependency-free test suite with:

```bash
node --test torn-elimination-html-exporter.test.js
```
