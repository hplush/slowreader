# LLM Guide

## Code Style

- Prefer short one-word variable names. Avoid abbreviations: use `current` instead of `cur`.
- Do not add any comments to generated code by default.
- Import only specific functions. Don’t import everything.
- Don’t use `export default`.
- Always use `.ts` in TS files imports.
- Use discriminant union in types: `{ missing: true } | { missing: false, content: string }` instead of `{ missing: boolean, content?: string }`.
- Do not create variable which you will use in single place.
- Always use I18n, don’t put English messages in UI hardcoded.

## Architecture

- Avoid adding dependencies.

## LLMS

- Never change `eslint.config.ts`. Always change code to fix found issues.
- Never use `as any`.
- Always merge type and regular import.
- Do not use `tsx`, you can import `.ts` and run it in Node.js directly.

## Testing

- Always run `pnpm quick` after changes.
- Run specific test by `pnpm bnt path/to/test.test.ts -t 'test name'`
