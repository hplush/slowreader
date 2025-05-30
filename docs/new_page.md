# How to Add a New Page to a Web Client?

If we are adding `foo` page.

1. Add route:
   1. Think about a good semantic URL route.
   2. Add the `foo` route to `Routes` in `core/router.ts`.
   3. Add `foo` route with URL pattern to `createRouter()` call in `web/stores/router.ts`.
2. If you need logic on the page, create a core module.
   1. Create `core/pages/foo.ts` with `export foo = createPage('foo', builder)` and `FooPage` types. See other pages for example.
   2. Add `foo` to `pages` in `core/pages/index.ts` and re-export `FooPage` type.
   3. Add tests in `core/test/pages/foo.test.ts`. See tests for other pages for example.
3. Add translations for page:
   1. Create `core/messages/foo/en.ts`.
   2. Export these files from `core/messages/index.ts`.
4. Add page:
   1. Create Svelte component `web/pages/foo.svelte` using `foo` messages and `foo` page.
   2. Wrap Svelte styles into `:global {}`. Use BEM system like `.foo_element.is-modifier` for CSS selectors.
   3. Use this component with the route in `web/main/main.svelte`.
   4. Add visual tests in `web/stories/pages/foo.stories.svelte`.
   5. Add a link to the page to the menu (`web/ui/navbar/`) if necessary.
