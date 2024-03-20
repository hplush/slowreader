Fixes # (issue)

<!-- Describe what did you change -->

## Motivation

<!-- Why did you make these changes? -->

## Screenshot or video

<!-- Delete if it is not relevant -->

## Checklist

- [ ] Don’t rush. Check all changes in PR again.
- [ ] Think about changing documentation.
  - If you added a script to `scripts/`, add a comment with a description.
  - If you added a new folder, add its description to the project’s `README.md`.
  - If you added config, describe how we use this tool in the config’s comment.
  - If you added something to the project’s architecture, describe it in the project’s `README.md`.
  - Try to focus on “why?”, not “how?”.
- If you added a new dependency:
  - [ ] Look for alternatives, not just take the most popular one.
  - [ ] Check alternatives for [bundle size](https://bundlejs.com/), [`node_modules` size](https://packagephobia.com/), and [subdependencies number](https://npmgraph.js.org).
  - [ ] Check that the project is active by their repository/issues/PR.
  - [ ] Run `cd web && pnpm size`, check the JS bundle size changes, about limits if necessary.
- [ ] Think about testing
  - If you added a feature, add unit tests.
  - If you added a new state to the UI, add visual tests.
  - If you fixed the bug, think about preventing bug regression in the future.
- If you changed web client:
  - [ ] Think about moving code to `core/`. What code will also be useful on other platforms?
  - [ ] Run `pnpm size` and check the difference in the JS bundle size. Is it relevant to the changes? Change the limit in `web/.size-limit.json` if necessary.
  - [ ] Think about keyboard UX. Is it easy to use the new feature with only one hand on a keyboard? Is it easy to understand what keys to press?
  - [ ] Think about HTML semantics.
  - [ ] Think about accessibility. Check a11y recommendations. Think about how screen reader users will use the tool. Is it easy to use on a screen with bad contrast?
  - [ ] Think about translations. Will
  - [ ] Think about right-to-left languages. What parts of the screen should be mirrored for Arabic or Hebrew languages?
- If you changed the colors token in the web client:
  - [ ] Think about app loading styles inlined in `index.html`.
- If you changed `core/`:
  - [ ] Think about making types more precise. Can you better explain data relations by type?
  - [ ] Think about conflict resolution. We don’t need some very smart changing merging; just 2 changes of the same item on different clients should not break the database. What if the user changes an item on one machine and removes it on another?
  - [ ] Think about log and storage migration.
- If you changed English translations:
  - [ ] Change translation ID if you change the meaning of the text.
