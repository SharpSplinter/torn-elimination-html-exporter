# Torn Elimination HTML Exporter

A standalone userscript for desktop userscript managers and TornPDA. It produces Torn HTML newsletters, three-part Discord updates, complete current-faction JSON files, and a persistent master Elimination index. When **Torn Elimination Faction Rankings** is installed on the same Torn browser/TornPDA profile, the exporter imports its participant, dropout, attack, and rank history, then verifies the current roster and live event state through Torn's API.

The exporter uses the finalized Torn Forum/Newsletter and native Discord layouts as its output templates.

Alliance, faction, and team placements are ranked by Elimination attacks. The script uses each user's `Team` field—not the consistently null `team_id` field—to determine enrollment. A member whose initial team was one of the twelve Elimination teams and whose current team becomes `Unknown` is permanently classified as **Dropped Out**. Members who were never enrolled remain separately classified as **Not Participating**. The Full Faction JSON includes both groups so no current faction member is omitted; the styled HTML and Discord updates include only active participants and confirmed dropouts.

## What it adds

One compact **Export Menu** button appears directly beside the **Elimination** page heading. It opens this exact numbered list:

1. **Full Faction JSON Export**
2. **Newsletter Export**
3. **Discord Export**
4. **Full Elimination JSON Export**
5. **API Settings**

**API Settings** is the only menu item containing the API-key and faction-ID fields. It allows the user to select a TornPDA-injected key when available, save or replace a desktop key, and configure one or more faction IDs for all four exports. An export opens a progress dialog with a live completion bar, percentage, API-request count, member count, and ten-member progress-chunk count. It cannot display 100% until all scheduled API requests, members, and chunks reconcile. Newsletter and Discord exports reveal an explicit **Copy to Clipboard** button. Both JSON exports reveal **Share JSON File**, which sends a real JSON file to Android's sharesheet so targets such as Google Drive can receive it. Nothing is copied, shared, or downloaded automatically.

All four export actions share the same complete data snapshot for up to five minutes. The cache is keyed by faction scope, survives a page reload, and deduplicates an in-progress lookup. A companion-rankings snapshot is imported as historical context, while each expired cache refresh still verifies the selected factions' complete live rosters and Elimination state. Other formats generated within five minutes reuse the same snapshot without repeating lookups.

Version 1.7.0 started a clean exporter participant/rank cache so terminal states produced by older exporter releases cannot contaminate the authoritative rankings import. Saved API and faction settings remain intact.

Version 1.9.0 makes Full Faction JSON roster-complete, adds Master Elim Export, uses the competition `Team` field for classification, records twelve-team placements and detail snapshots, skips invalid detail calls for zero-life teams, adds per-export configuration, supports TornPDA-injected keys, fixes TornPDA's inline-button rendering, and prevents incomplete counters from being reported as 100%.

Version 1.10.0 replaces the four header buttons with one Export Menu, moves API and faction configuration into menu option 5, and shares both JSON exports through Android's native sharesheet. Cancelling the sharesheet never starts a download; browsers without file-sharing support retain an explicit download fallback.

A persistent participant ledger is seeded with the supplied Naughty Souls/Sanctuary participant history. It preserves initial team membership and the highest confirmed attack count so Torn cannot erase historical dropout results. Once a participant is confirmed dropped, that state is terminal: the script never calls that member's competition endpoint again and only recalculates their alliance/faction ranks. A separate master index retains current and historical members, initial team snapshots, latest/final attack snapshots, and current team standings across exports.

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

- Shares one UTF-8 `.json` file through Android's native sharesheet after an explicit click in the completed progress dialog.
- Includes every current member of every selected faction—active, dropped out, and not participating—without silently omitting roster members.
- Keeps confirmed dropouts separate from members who never participated.
- Preserves alliance, faction, and team ranks; attacks; movement; former team details; and profile URLs without including API keys.

### Master Elimination JSON

- Shares the entire durable Elimination index as a JSON file, including historical members no longer present on the current faction rosters.
- Records each team's two-digit ID, live placement such as `3rd/12th place`, lives, score, and elimination/detail-lookup state.
- Preserves every participant's initial team snapshot, latest attack snapshot, and terminal final attack snapshot.

## Install

### Desktop

[Install the userscript directly](https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js) in Tampermonkey or another compatible userscript manager, open Torn's Elimination page, and save a public Torn API key under **Export Menu → API Settings**.

### TornPDA

Import the `.user.js` file as a userscript. TornPDA replaces the embedded API-key marker automatically and routes API requests through its native HTTP bridge. When that injected key is present, **API Settings** offers **TornPDA injected key** as a credential source and does not reject it as a placeholder. JSON files use Android's native sharesheet instead of being placed directly in TornPDA's internal data directory.

## Use

1. Open Torn's Elimination page and select the single **Export Menu** button beside the page heading.
2. Choose **5) API Settings** to select the TornPDA-injected or saved/custom API key and save one or more comma-separated faction IDs.
3. Reopen the menu and choose one of the four numbered exports.
4. Follow the live progress bar while the script reads complete faction rosters, `/torn/elimination`, each surviving team's `/torn/{id}/eliminationteam` record, and active/unresolved members' competition records. A team with zero lives remains recorded from the global standings but its unavailable detail endpoint is skipped. The scheduler targets 90 API calls per minute with up to six requests in flight, leaving headroom beneath Torn's 100-calls-per-minute user limit.
5. At 100%, review the persistent preview. Select **Copy to Clipboard** for Newsletter/Discord, or **Share JSON File** for either JSON export. On Android, choose Google Drive or another sharesheet target. A normal download is offered only as a fallback when the browser cannot share files.

The script stores only the entered faction scope, the desktop API key, persistent participant/rank history, generated export payloads, and the latest five-minute snapshot in userscript-local storage. This durable state provides movement indicators, preserves former-team and attack data after dropout, and keeps completed exports available for subsequent updates without poisoning the live participant set. The companion rankings bridge publishes only non-secret event data (participant identity, team, attacks, status, and ranks) to Torn-origin browser storage; API keys never enter that bridge.

If the live `/torn/elimination` standings are missing or malformed, the export stops with an error. It never substitutes an empty team list or marks the full roster as dropped out.

If Torn returns HTTP 429 or API error 5, the exporter automatically backs off and retries through the same rate-limited queue. Because Torn applies the limit across all keys belonging to a user, other tools using your keys can consume the remaining headroom.

## Validation

Run the dependency-free test suite with:

```bash
node --test torn-elimination-html-exporter.test.js
```
