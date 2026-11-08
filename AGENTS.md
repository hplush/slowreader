# LLM Guide

In all interactions, plans, and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Code Style

- Prefer short one-word variable names. Avoid abbreviations: use `current` instead of `cur`.
- Do not add any comments to generated code by default. Even a “why” comment needs a reason: add it only if deleting it would likely make someone reintroduce a bug. Otherwise prefer a better name, a test, or nothing.
- Never write a comment, which repeats the name of the function or variable. Comment only what the code can’t say: why, not what.
- If a function or variable needs a comment to explain what it does, rename it to say that instead: `waitDisappearFromMenu()`, `menuHasUnread()`, `noNeedWait`. Keep comments only for why.
- Import only specific functions. Don’t import everything.
- Don’t use `export default`, use name exports instead.
- Always use `.ts` in TS files imports.
- Use discriminant union in types: `{ missing: true } | { missing: false, content: string }` instead of `{ missing: boolean, content?: string }`.
- Do not create variable which you will use in single place.
- Do not create constants used only once. Inline the value even when it looks magic or needs an explanation.
- Always use I18n, don’t put English messages in UI hardcoded.
- Follow BEM: block styles only its own elements. Never change other block by nesting (`.a .b`, `.a + .b`). Wrap it into own element or add a prop to that block.
- Think about a11y aspect on any new component in `web/ui/`. Check every new UI element with screen reader, keyboard and touch. Think about a11y not as a rules, but about real UX.

## Architecture

- Avoid adding dependencies.
- Keep non-browser logic in `core/`. Client folders should have only environment-specific code.
- Update `README.md` of the package on every new script, folder, or tool.
- App’s error page (`web/pages/fatal.svelte`, error mode styles and icons) is duplicated in static `web/public/404.html` and `web/public/500.html`. Change all of them together.
- Use OKLCH color mode and APCA contrast check for any color operations.
- Keep `core/schema.ts` loader-agnostic. Never add a field for one loader or service. Map loader data to a universal shape, like `<source>` list instead of `hls` URL.

## Changelog

- If change is visible to users or self-hosters, add file to `unreleased-changes/`: `feature-NAME.md` with `# Title` and a short description, or `fix-NAME.md` with one sentence.
- Add `security-NAME.md` with one sentence for every security or privacy improvement, even internal one, like CI hardening or dependency isolation.
- Write for users, not developers. Skip CI, docs, refactoring, tests, and dependency updates, unless it improves security.
- Update existing file in `unreleased-changes/` instead of adding a new one, if the change improves an unreleased feature.

## LLMS

- Never change `eslint.config.ts`. Always change code to fix found issues.
- Never use `as any`. If the type is unknown, use `unknown` and narrow with runtime checks.
- Always merge type and regular import.
- Import and run `.ts` directly by Node.js without `tsx`.
- Kill every server you started, like `pnpm start`, before finishing the work. Kill it by PID: `pkill -f` matches your own shell too and kills it instead.

## Debugging

- Explain the bug as a step-by-step story, not as a report: what the value is for, what the code was supposed to do, then numbered steps of what really happened, then the fix.
- Use the real values from the user’s data (`localStorage` keys, IDs, counts) in every step.
- Define every term before using it. No jargon, no abbreviations, no `t0`/`t1` timelines, no pseudo-code where a sentence works.
- Explain why every broken step was broken, including why the app could not recover by itself.

## Testing

- At the end of the file changing run `pnpm quick`. Fix issues only in files changed by you.
- Run specific test by `pnpm bnt path/to/test.test.ts -t 'test name'`.
- Never put cleanup as last lines of a test: failed assertion skips it and breaks next tests or freezes the run. Use `afterEach()` or `t.after()` right after the setup. Helpers must restore state before an assertion.
- Add story to `web/stories/` for every new UI state.
- New variant of a `web/ui/` component belongs to that component’s story too if it is exists, not only to the page which asked for it.
- Try to combine cases in stories to reduce number of stories.
- Do not run benchmark by your own. Ask user to run it.

## Browser

- Use Playwright MCP for visual issues and client database bugs. See [docs/development/browser.md](./docs/development/browser.md).
