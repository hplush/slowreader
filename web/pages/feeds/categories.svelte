<script lang="ts">
  import { mdiRenameOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    changeCategory,
    deleteCategory,
    feedsByCategory,
    type FeedValue,
    getCategories,
    getFeeds
  } from '@slowreader/core'
  import {
    commonMessages as common,
    organizeMessages as t
  } from '@slowreader/core/messages'

  import { getURL, openURL } from '../../stores/router.js'
  import Button from '../../ui/button.svelte'
  import CardLink from '../../ui/card-link.svelte'
  import CardLinks from '../../ui/card-links.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import Row from '../../ui/row.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import FeedsEdit from './edit.svelte'

  export let feedId: string | undefined

  let categories = getCategories()
  let allFeeds = getFeeds()

  function firstId(feeds: FeedValue[]): string | undefined {
    let first = feeds[0]
    return first ? first.id : undefined
  }
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <div slot="one">
    {#if $allFeeds.isLoading || $categories.isLoading}
      <Loader />
    {:else}
      <ul role="list">
        {#each feedsByCategory($categories, $allFeeds.list) as [category, feeds] (category.id)}
          <li class="feeds-categories_category">
            {#if category.id === 'general'}
              <h2 class="feeds-categories_title">{$common.generalCategory}</h2>
            {:else if category.id === 'broken'}
              <h2 class="feeds-categories_title">{$common.brokenCategory}</h2>
            {:else}
              <Row compact>
                <h2 class="feeds-categories_title">
                  {category.title}
                </h2>
                <Button
                  icon={mdiRenameOutline}
                  secondary
                  on:click={() => {
                    let title = prompt($t.categoryName, category.title)
                    if (title) {
                      changeCategory(category.id, { title })
                    }
                  }}
                  >{$t.renameCategory}
                </Button>
                <Button
                  dangerous
                  icon={mdiTrashCanOutline}
                  secondary
                  on:click={() => {
                    if (confirm($t.deleteCategoryConform)) {
                      deleteCategory(category.id)
                    }
                  }}
                  >{$t.deleteCategory}
                </Button>
              </Row>
            {/if}
            {#if feeds.length > 0}
              <Card>
                <CardLinks>
                  {#each feeds as feed (feed.id)}
                    <CardLink
                      name={feed.title}
                      current={feed.id === feedId}
                      first={feed.id === firstId(feeds)}
                      href={getURL('categories', { feed: feed.id })}
                    ></CardLink>
                  {/each}
                </CardLinks>
              </Card>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div slot="two">
    {#if feedId}
      <FeedsEdit
        {feedId}
        on:delete={() => {
          openURL('categories')
        }}
      />
    {/if}
  </div>
</TwoStepsPage>

<style>
  .feeds-categories_category:not(:first-child) {
    padding-top: var(--padding-xl);
  }

  .feeds-categories_title {
    flex-grow: 1;
    padding-inline-start: var(--padding-l);
    margin-bottom: var(--padding-l);
    font: var(--page-title-font);
  }
</style>
