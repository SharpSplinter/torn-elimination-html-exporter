# Torn Elimination HTML Exporter

A standalone userscript for desktop userscript managers and TornPDA. It does not modify or depend on the existing Torn Elimination Rankings script.

The exporter uses the finalized Torn Forum/Newsletter and native Discord layouts as its output templates.

## What it adds

Three export actions:

1. **Export Torn HTML — Elimination Alliance Update (Top Performers, Team Styling & Dropout Roast)**
2. **Export Discord Markdown — Elimination Alliance Update (Three Mobile-Safe Messages with Team Icons & Dropout Roast)**
3. **Export Torn HTML — Full Faction Leaderboard (Current Faction; Alliance/Additional Factions Optional)**

The Torn actions copy finished Torn-compatible inline HTML to the clipboard. The Discord action copies message 1 immediately and opens a numbered clipboard panel for the remaining messages. If clipboard permission is unavailable, selectable text remains available. The script never downloads an export file.

## Output templates

### Torn Forum/Newsletter HTML

- Inline CSS only; no scripts, stylesheets, or CSS variables in exported markup.
- `width: 100%`, `max-width: 601px`, border-box sizing, overflow containment, and long-name wrapping throughout.
- Torn-safe text badges replace Unicode emoji that Torn may convert to question marks.
- Centered bold headers, faction-colored banners, team-colored player names, A/F rank badges, movement, attacks, and dropout call-outs.

### Discord Markdown

- Native H1-H3 headings, `-#` subtext, block-quoted player cards, bold masked profile links, and escaped player names.
- Colored team markers and the agreed team icons; no ANSI or code-block coloring.
- Output is packed into messages no longer than 1,950 characters for safe posting across Discord clients.

## Install

### Desktop

[Install the userscript directly](https://raw.githubusercontent.com/SharpSplinter/torn-elimination-html-exporter/main/Torn%20Elimination%20HTML%20Exporter.user.js) in Tampermonkey or another compatible userscript manager, open Torn's Elimination page, and enter a public Torn API key on the first export.

### TornPDA

Import the `.user.js` file as a userscript. TornPDA replaces the embedded API-key marker automatically and routes API requests through its native HTTP bridge.

## Use

1. Open Torn's Elimination page and select an export button in the fixed **Elimination Update Exports** panel.
2. Confirm the current faction ID or enter multiple comma-separated faction IDs for an alliance-wide export.
3. Wait while the script reads member competition records. Requests are deliberately paced in groups of ten.
4. Paste Torn HTML into the Torn faction newsletter/forum Source Code editor, or paste the numbered Discord messages into Discord in order.

The script stores only the entered faction scope, the desktop API key, and previous rank/team snapshots in userscript-local storage. Previous snapshots provide movement indicators and former-team details for members who drop out between runs.

## Validation

Run the dependency-free test suite with:

```bash
node --test torn-elimination-html-exporter.test.js
```
