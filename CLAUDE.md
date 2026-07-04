# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cath-Flow (導管室排程工作台) is a cardiac catheterization lab scheduling workbench — a prototype UI for managing lab time slots, doctor leave/slot releases, and backfilling released time with waitlisted cases. The entire application lives in one file, `CathFlow排程工作台.html`, containing all CSS, HTML markup, and vanilla JavaScript inline. There are no dependencies, no build step, no package manager, and no test suite. The UI is in Traditional Chinese (zh-TW).

## Running and deploying

- Run locally by opening `CathFlow排程工作台.html` directly in a browser, or serve the repo root: `python3 -m http.server` and visit `http://localhost:8000/`.
- Deployment is GitHub Pages serving the repo as-is (`.nojekyll` disables Jekyll). `index.html` is only a meta-refresh redirect to the main file, using the URL-encoded form of its Chinese filename (`CathFlow%E6%8E%92%E7%A8%8B%E5%B7%A5%E4%BD%9C%E5%8F%B0.html`). If the main file is ever renamed, both links in `index.html` must be updated with the matching URL-encoded name.

## Architecture (all inside CathFlow排程工作台.html)

The file is ordered: CSS in `<style>` (top), static HTML markup for the layout shell and modals, then a single `<script>` (starting around line 394) with all logic.

**State and persistence.** A single global `app` object holds all state: `page` (schedule/leave/stats/cases), `currentDate`, `view` (day/week/released), selection IDs, filters, and the three data arrays `slots`, `cases`, `logs`. Data persists to `localStorage` under the key `cathflow_v2`; `loadFromStorage()` falls back to the `DEFAULT_SLOTS` / `DEFAULT_CASES` / `DEFAULT_LOGS` seed data when the key is absent or unparsable. When testing changes to the seed data or the data shape, clear that localStorage key first — otherwise stale stored data masks your changes. The demo "today" is hardcoded as `TODAY = "2026-05-09"` and the seed data clusters around it.

**Rendering.** Everything re-renders through `render()`, which dispatches on `app.page` to the page-specific `render*()` functions and rebuilds DOM via `innerHTML` template strings. `render()` also calls `saveToStorage()`, so any mutation followed by `render()` is automatically persisted. All user-supplied strings interpolated into HTML must go through `esc()`.

**Domain model.** A slot has a `status` of `routine`, `assigned`, `released` (doctor on leave, time available for backfill), `urgent`, or `hold` (backfilled with a waitlist case). Status labels/badges/colors are mapped by `STATUS_LABELS`, `STATUS_BADGE`, and matching CSS classes. Cases in the waiting pool (`status: "waiting"`) can be assigned into a released slot via `assignCase()`, which links slot and case through `assignedCaseId`/`assignedSlotId` and flips the slot to `hold`. Slot creation is guarded by `hasOverlapWithNonReleased()` (released slots don't block), and `adjustReleasedSlots()` shrinks or splits an overlapping released slot when new work is placed on top of it.

**Timeline math.** The day view axis spans 08:00–18:00. `timeToLeft()`/`timeToWidth()` convert times to percentages using hardcoded constants (480 = 08:00 in minutes, 600 = 10-hour span); the CSS grid header (`.time-header`, 10 columns) and the axis background gradient (`background-size: 10% 100%`) encode the same 10-hour assumption. Changing operating hours requires updating all three in sync.

**Events.** Beyond a handful of directly-bound controls (date nav, filters, forms), interaction is one delegated `document`-level click handler keyed on `data-*` attributes (`data-slot-id`, `data-delete-slot`, `data-case-action`, `data-page`, `data-close`, `data-add-wlab`). New interactive elements rendered via `innerHTML` should follow this data-attribute pattern rather than attaching listeners, since re-renders destroy the nodes.

**Reference data.** `DOCTORS`, `PROCEDURES`, and `LABS` are constant arrays at the top of the script; `populateSelects()` feeds them into the form/filter `<select>`s at startup. CSV export (`exportCSV`) prepends a UTF-8 BOM so Excel opens the Chinese text correctly.
