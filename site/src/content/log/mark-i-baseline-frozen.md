---
title: "The Mark I graph is frozen and taggable"
date: 2026-06-30
area: Platform
mark: I
status: Ready
summary: "The stable tag mark-i-baseline points to the exact commits that formed the original eleven-repository graph, in the meta-repository and in every child."
---

Mark II preserves the exact submodule graph recorded by the frozen Mark I root commit:

```text
99904d756d370ccc585640b5eb430f4b1bd0626c
```

The stable tag `mark-i-baseline` exists in the Mark I meta-repository, the Mark II meta-repository,
and all eleven child repositories. It points to the exact commits that formed the original Mark I
graph.

It does not prevent child repositories from evolving, and it does not change the Mark I history.
Mark I is historical infrastructure; Mark II is the active development line. Future submodule
pointer updates belong to Mark II.
