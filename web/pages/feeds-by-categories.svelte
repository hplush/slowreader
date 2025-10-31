<script lang="ts">
  import { mdiRenameOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    changeCategory,
    deleteCategory,
    type FeedsByCategoriesPage,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Feeds from '../ui/feeds.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: FeedsByCategoriesPage } = $props()

  let { groups, opened } = page
</script>

<PopupablePage title={[$t.byCategoryTitle, $t.feedsTitle]}>
  <Stack gap="xl">
    {#each $groups as [category, feeds] (category.id)}
      <Stack gap="s">
        <Stack gap="s" row>
          <Title>{category.title}</Title>
          {#if category.id !== 'general' && category.id !== 'broken'}
            <Button
              icon={mdiRenameOutline}
              onclick={() => {
                let title = prompt($t.categoryName, category.title)
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
        </Stack>
        <Feeds current={$opened} list={feeds} />
      </Stack>
    {/each}
  </Stack>
</PopupablePage>
