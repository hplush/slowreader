Fixes # (issue)

<!-- Describe what did you change -->

## Motivation

<!-- Why you did these changes. -->

## Screenshot or video

<!-- Delete if is not appropriated -->

## Checklist

- [ ] Don’t rush. Check all changes in PR again.
- [ ] Think about changing documentation.
  - If you added a script to `scripts/`, add comment with description.
  - If you added new folder, add its description to project’s `README.md`.
  - If you added config, describe how we are using this tool in config’s comment.
  - If you added something to architecture of the project, describe it in project’s `README.md`.
  - Try to focus on “why?”, not “how?”.
- If you added new dependency:
  - [ ] Look for alternatives, not just take the most popular one.
  - [ ] Check alternatives for [bundle size](https://bundlejs.com/), [`node_modules` size](https://packagephobia.com/), and [subdependencies number](https://npmgraph.js.org).
  - [ ] Check by their repository/issues/PR that project is active.
  - [ ] Run `cd web && pnpm size`, check the JS bundle size changes, about limits if necessary.
- [ ] Think about testing
  - If you added a feature, add unit tests.
  - If you added a new state to UI, add visual tests.
  - If you fixed the bug, think about preventing bug regression in the future.
- If you changed web client:
  - [ ] Think about moving code to `core/`. What code will be useful also on another platforms.
  - [ ] Run `pnpm size` and check JS bundle size difference. Is it relevant to the changes? Change limit in `web/.size-limit.json` if necessary.
  - [ ] Think about keyboard UX. Is it easy to use the new feature with keyboard only by one hand. Is it easy to understand what keys to press?
  - [ ] Think about HTML semantics.
  - [ ] Think about accessability. Check a11y recommendations. Think how screen reader users will use tool. Is it easy to use screen on screen with bad contrast?
  - [ ] Think about translations. Will
  - [ ] Think about right-to-left languages. What parts of screen should be mirrored for Arabic or Hebrew languages.
- If you changed colors token in web client:
  - [ ] Think about app loading styles inlined in `index.html`.
- If you changed `core/`:
  - [ ] Think about making types more precise? Can you better explain data relations by types?
  - [ ] Think about conflict resolution. We don’t need some very smart changing merging, just 2 changes of the same item on different clients should not break database. What if user change item on one machine and remove it on another?
  - [ ] Think about log and storage migration.
- If you changed English translations:
  - [ ] Change translation ID you changed the meaning for the text.
