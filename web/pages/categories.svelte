<script lang="ts">
  import { mdiPencilOutline, mdiPlusCircleOutline } from '@mdi/js'
  import {
    type CategoriesPage,
    commonMessages as common,
    router,
    organizeMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Feeds from '../ui/feeds.svelte'
  import Foldable from '../ui/foldable.svelte'
  import Loader from '../ui/loader.svelte'
  import NoFeeds from '../ui/no-feeds.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: CategoriesPage } = $props()

  let { expanded, groups, opened, readings, scrollTarget, stats, sync } =
    $derived(page)
</script>

<PopupablePage padding title={[$t.categoriesTitle, $t.feedsTitle]}>
  <Stack gap="m">
    <Title>
      {$t.categoriesTitle}
      {#snippet action()}
        <Button
          icon={mdiPlusCircleOutline}
          onclick={() => {
            let title = prompt($common.categoryName)
            if (title) page.add(title)
          }}
        >
          {$t.addCategory}
        </Button>
      {/snippet}
    </Title>
    {#if $sync !== 'none'}
      <Loader
        finished={$sync === 'done'}
        label={$t.syncingFollows}
        track="follows-sync"
      />
    {/if}
    {#if $groups.length === 0}
      <NoFeeds />
    {:else}
      <Stack gap="s" role="menu">
        {#each $groups as [category, feeds] (category.id)}
          {#snippet actions(describedby: string)}
            <Button
              aria-describedby={describedby}
              href={getPopupHash($router, 'category', category.id)}
              icon={mdiPencilOutline}
              size="icon"
            >
              {$t.editCategory}
            </Button>
          {/snippet}
          <Foldable
            id={`${category.id}-feeds`}
            {@attach category.id === $scrollTarget &&
              ((element: HTMLDivElement) => {
                element.scrollIntoView()
                page.scrolled()
              })}
            {actions}
            disabled={feeds.length === 0}
            hint={$t.feedsCount(feeds.length)}
            onexpand={() => {
              page.expand(category.id)
            }}
            ontoggle={() => {
              page.toggle(category.id)
            }}
            open={$expanded.has(category.id)}
            short={String(feeds.length)}
            title={category.title}
          >
            <Feeds
              current={$opened}
              handles
              list={feeds}
              readings={$readings}
              stats={$stats}
            />
          </Foldable>
        {/each}
      </Stack>
    {/if}
  </Stack>
</PopupablePage>
