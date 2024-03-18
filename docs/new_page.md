# How to Add New Page to Web Client?

If we are adding `foo` page.

1. Add route:
   1. Think about good semantic URL route.
   2. Add `foo` route to `Routes` in `core/router.ts`.
   3. Add `foo` route with URL pattern to `createRouter()` call in `web/stores/router.ts`.
2. If you need a logic on the page, create core module.
   1. Create `core/foo.ts` files with exports with `foo` word.
   2. Export those exports from `core/index.ts`
   3. Add tests in `core/test/foo.test.ts`.
3. Add translations for page:
   1. Create `core/messages/foo/en.ts`.
   2. Export this files from `core/messages/index.ts`.
4. Add page:
   1. Create Svelte component `web/pages/foo.svelte` with using `foo` messages and `foo` core module.
   2. Use this component with route in `web/main/main.svelte`.
   3. Add visual tests in `web/stories/pages/foo.stories.svelte`.
   4. Add link to the page to menu (`web/ui/navbar/`) if necessary.
