# Torn Elimination HTML Exporter

A standalone userscript for desktop userscript managers and TornPDA. It does not modify or depend on the existing Torn Elimination Rankings script.

## What it adds

Exactly two export actions:

1. **Export Torn HTML — Elimination Alliance Update (Top Performers, Team Styling & Dropout Roast)**
2. **Export Torn HTML — Full Faction Leaderboard (Current Faction; Alliance/Additional Factions Optional)**

Both actions copy finished Torn-compatible inline HTML to the clipboard. If clipboard permission is unavailable, the script opens a selectable copy box. It never downloads an export file.

## Install

### Desktop

Install the `.user.js` file in Tampermonkey or another compatible userscript manager, visit Torn, and enter a public Torn API key on the first export.

### TornPDA

Import the `.user.js` file as a userscript. TornPDA replaces the embedded API-key marker automatically and routes API requests through its native HTTP bridge.

## Use

1. Open Torn and select either export button in the fixed **Elimination HTML Exports** panel.
2. Confirm the current faction ID or enter multiple comma-separated faction IDs for an alliance-wide export.
3. Wait while the script reads member competition records. Requests are deliberately paced in groups of ten.
4. Paste the copied HTML into the Torn faction newsletter or forum editor.

The script stores only the entered faction scope, the desktop API key, and previous rank/team snapshots in userscript-local storage. Previous snapshots provide movement indicators and former-team details for members who drop out between runs.

## Validation

Run the dependency-free test suite with:

```bash
node --test torn-elimination-html-exporter.test.js
```

