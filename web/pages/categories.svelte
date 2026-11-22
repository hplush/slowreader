<script lang="ts">
  import { mdiRenameOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    type CategoriesPage,
    changeCategory,
    commonMessages,
    deleteCategory,
    GENERAL_CATEGORY,
    layoutType,
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
  let mobile = $derived($layoutType === 'mobile')
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
          {#snippet actions(describedby: string)}
            <Button
              aria-describedby={describedby}
              icon={mdiRenameOutline}
              onclick={() => {
                let title = prompt($commonMessages.categoryName, category.title)
                if (title) {
                  changeCategory(category.id, { title })
                }
              }}
              size={mobile ? 'wide' : 'icon'}
              variant="secondary"
            >
              {mobile ? $t.rename : $t.renameCategory}
            </Button>
            <Button
              aria-describedby={describedby}
              color="dangerous"
              icon={mdiTrashCanOutline}
              onclick={() => {
                if (confirm($t.deleteCategoryConform)) {
                  deleteCategory(category.id)
                }
              }}
              size={mobile ? 'wide' : 'icon'}
            >
              {mobile ? $t.delete : $t.deleteCategory}
            </Button>
          {/snippet}
          <Foldable
            id={`${category.id}-feeds`}
            actions={category.id !== GENERAL_CATEGORY &&
            category.id !== 'broken'
              ? actions
              : undefined}
            compact={mobile}
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
            <Feeds current={$opened} list={feeds} readings={$readings} />
          </Foldable>
        {/each}
      </Stack>
    {/if}
  </Stack>
</PopupablePage>
