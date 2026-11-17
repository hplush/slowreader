<script lang="ts">
  import { mdiRenameOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    type CategoriesPage,
    changeCategory,
    commonMessages,
    deleteCategory,
    GENERAL_CATEGORY,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Feeds from '../ui/feeds.svelte'
  import Foldable from '../ui/foldable.svelte'
  import Loader from '../ui/loader.svelte'
  import NoFeeds from '../ui/no-feeds.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'

  let { page }: { page: CategoriesPage } = $props()

  let { expanded, groups, opened, readings, sync } = $derived(page)
</script>

<PopupablePage padding title={[$t.categoriesTitle, $t.feedsTitle]}>
  <Stack gap="m">
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
          <Foldable
            id={`${category.id}-feeds`}
            disabled={feeds.length === 0}
            hint={$t.feedsCount(feeds.length)}
            onexpand={() => {
              page.expand(category.id)
            }}
            ontoggle={() => {
              page.toggle(category.id)
            }}
            open={$expanded.has(category.id)}
            title={category.title}
          >
            {#snippet actions(describedby: string)}
              {#if category.id !== GENERAL_CATEGORY && category.id !== 'broken'}
                <Button
                  aria-describedby={describedby}
                  icon={mdiRenameOutline}
                  onclick={() => {
                    let title = prompt(
                      $commonMessages.categoryName,
                      category.title
                    )
                    if (title) {
                      changeCategory(category.id, { title })
                    }
                  }}
                  size="icon"
                  variant="secondary"
                >
                  {$t.renameCategory}
                </Button>
                <Button
                  aria-describedby={describedby}
                  icon={mdiTrashCanOutline}
                  onclick={() => {
                    if (confirm($t.deleteCategoryConform)) {
                      deleteCategory(category.id)
                    }
                  }}
                  size="icon"
                  variant="secondary-dangerous"
                >
                  {$t.deleteCategory}
                </Button>
              {/if}
            {/snippet}
            <Feeds current={$opened} list={feeds} readings={$readings} />
          </Foldable>
        {/each}
      </Stack>
    {/if}
  </Stack>
</PopupablePage>
