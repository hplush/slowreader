# LLM Guide

In all interactions, plans, and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Code Style

- Prefer short one-word variable names. Avoid abbreviations: use `current` instead of `cur`.
- Do not add any comments to generated code by default.
- Never write a comment, which repeats the name of the function or variable. Comment only what the code can’t say: why, not what.
- Import only specific functions. Don’t import everything.
- Don’t use `export default`, use name exports instead.
- Always use `.ts` in TS files imports.
- Use discriminant union in types: `{ missing: true } | { missing: false, content: string }` instead of `{ missing: boolean, content?: string }`.
- Do not create variable which you will use in single place.
- Do not create constants used only once. Inline the value even when it looks magic or needs an explanation.
- Always use I18n, don’t put English messages in UI hardcoded.

## Architecture

- Avoid adding dependencies.
- Keep non-browser logic in `core/`. Client folders should have only environment-specific code.
- Update `README.md` of the package on every new script, folder, or tool.

## LLMS

- Never change `eslint.config.ts`. Always change code to fix found issues.
- Never use `as any`. If the type is unknown, use `unknown` and narrow with runtime checks.
- Always merge type and regular import.
- Do not use `tsx`, you can import `.ts` and run it in Node.js directly.

## Debugging

- Explain the bug as a step-by-step story, not as a report: what the value is for, what the code was supposed to do, then numbered steps of what really happened, then the fix.
- Use the real values from the user’s data (`localStorage` keys, IDs, counts) in every step.
- Define every term before using it. No jargon, no abbreviations, no `t0`/`t1` timelines, no pseudo-code where a sentence works.
- Explain why every broken step was broken, including why the app could not recover by itself.

## Testing

- Run specific test by `pnpm bnt path/to/test.test.ts -t 'test name'`.
- Do not run benchmark by your own. Ask user to run it.
- Add story to `web/stories/` for every new UI state.
- Try to combine cases in stories to reduce number of stories.

## Browser

- Use Playwright MCP for visual issues and client database bugs. See [docs/browser.md](./docs/browser.md).
