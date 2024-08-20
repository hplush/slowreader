<script lang="ts">
  import { mdiRenameOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    changeCategory,
    commonMessages as common,
    deleteCategory,
    feedsByCategory,
    type FeedValue,
    getCategories,
    getFeeds,
    organizeMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/router.ts'
  import Button from '../../ui/button.svelte'
  import CardLink from '../../ui/card-link.svelte'
  import CardLinks from '../../ui/card-links.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import FeedsEdit from './edit.svelte'

  let { feedId }: { feedId?: string } = $props()

  let categories = getCategories()
  let allFeeds = getFeeds()

  function firstId(feeds: FeedValue[]): string | undefined {
    let first = feeds[0]
    return first ? first.id : undefined
  }
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  {#snippet one()}
    {#if $allFeeds.isLoading || $categories.isLoading}
      <Loader />
    {:else}
      <ul role="list">
        {#each feedsByCategory($categories.list, $allFeeds.list) as [category, feeds] (category.id)}
          <li class="feeds-categories_category">
            {#if category.id === 'general'}
              <h2 class="feeds-categories_title">{$common.generalCategory}</h2>
            {:else if category.id === 'broken'}
              <h2 class="feeds-categories_title">{$common.brokenCategory}</h2>
            {:else}
              <div class="feeds-categories_row">
                <h2 class="feeds-categories_title">
                  {category.title}
                </h2>
                <Button
                  icon={mdiRenameOutline}
                  onclick={() => {
                    let title = prompt($t.categoryName, category.title)
                    if (title) {
                      changeCategory(category.id, { title })
                    }
                  }}
                  secondary
                  >{$t.renameCategory}
                </Button>
                <Button
                  dangerous
                  icon={mdiTrashCanOutline}
                  onclick={() => {
                    if (confirm($t.deleteCategoryConform)) {
                      deleteCategory(category.id)
                    }
                  }}
                  secondary
                  >{$t.deleteCategory}
                </Button>
              </div>
            {/if}
            {#if feeds.length > 0}
              <Card>
                <CardLinks>
                  {#each feeds as feed (feed.id)}
                    <CardLink
                      name={feed.title}
                      controls="feeds-categories_edit"
                      current={feed.id === feedId}
                      first={feed.id === firstId(feeds)}
                      href={getURL({
                        params: { feed: feed.id },
                        route: 'categories'
                      })}
                    ></CardLink>
                  {/each}
                </CardLinks>
              </Card>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/snippet}
  {#snippet two()}
    <div id="feeds-categories_edit">
      {#if feedId}
        <FeedsEdit {feedId} />
      {/if}
    </div>
  {/snippet}
</TwoStepsPage>

<style>
  .feeds-categories_category:not(:first-child) {
    padding-top: var(--padding-xl);
  }

  .feeds-categories_title {
    flex-grow: 1;
    padding-inline-start: var(--padding-l);
    padding-bottom: var(--padding-l);
    font: var(--page-title-font);
  }

  .feeds-categories_row {
    display: flex;
    gap: var(--padding-m);
    align-items: baseline;
  }
</style>
