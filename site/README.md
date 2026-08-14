# M.A.R.K. II — build log site

Astro static site for GitHub Pages, built on the Fidelio design system (light, Inter, one accent,
four type sizes). Deployed at `https://brightwav3.github.io/Assistant-mark-II/`.

## Run

```bash
cd site
npm install
npm run dev      # http://localhost:4321/Assistant-mark-II
npm run build    # -> site/dist
```

## Deploy

The repository root owns the canonical `.github/workflows/pages.yml` workflow. It uses the official
Astro GitHub Action to build this directory and GitHub Pages to deploy the resulting static artifact.
In the repository settings, Pages must use **GitHub Actions** as its source. `astro.config.mjs`
already sets `site`/`base` for the project-page URL.

## Structure

```
src/
  content/log/*.md          the build log — one markdown file per entry
  content/config.ts         frontmatter schema (title, date, area, status, summary)
  data/site.ts              repositories, facts, host support
  styles/site.css           imports the Fidelio tokens, then page-level primitives
  styles/ds/                vendored design-system tokens + base (do not edit)
  layouts/BaseLayout.astro  document shell, header, footer
  components/
    SiteHeader.astro  SiteFooter.astro  StatusPill.astro
    Intro.astro       LogList.astro     SignalPath.astro
    SubsystemTable.astro  HostTable.astro
  pages/
    index.astro             landing: intro, latest 3 entries, signal path
    entries.astro           all entries + client-side filters (mark / area / state / search)
    marks/index.astro       the three Marks as cards
    marks/[mark].astro      one mark: scope, facts, and its entries
    system.astro            signal path, repositories, host support
    log/[...slug].astro     one entry, with older/newer pager
```

Entry frontmatter carries `mark: I | II | III`, which drives the Marks pages and the Entries
filters. `src/data/marks.ts` holds each mark's question, facts, and prose.

## Writing an entry

Add a markdown file to `src/content/log/`:

```md
---
title: "Delegation survives session closure"
date: 2026-09-02
area: Intelligence        # Voice | Intelligence | Audio | Memory | Platform
status: Ready             # Ready | Needs work | Not built yet
summary: "One sentence stating what is now true."
---

Body in markdown. Code fences, tables, and inline code are styled.
```

The index, the status pill, and the entry page pick it up with no component changes.

## Brand mark

`SiteHeader.astro` renders `public/brand-mark.svg` at 20×20. Supply the **white** version — light
mode inverts it to black with a CSS filter, dark mode shows it as-is. Drop the file at
`site/public/brand-mark.svg`.

## Dark mode

`:root[data-theme="dark"]` in `src/styles/site.css` overrides the semantic aliases only. The theme is
set before first paint by an inline script in `BaseLayout.astro` (stored preference, else
`prefers-color-scheme`), and toggled by the button in `SiteHeader.astro`.

## Design constraints

Type sizes are 12 / 13 / 14 / 24px only, two Inter weights (400/500), radii 4/8/16/pill, flat
surfaces, one accent blue for interactivity, ink for the primary action. Do not add a fifth type
size or a second accent.
