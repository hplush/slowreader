<script lang="ts">
  import {
    changeCategory,
    deleteCategory,
    feedsByCategory,
    getCategories,
    getFeeds
  } from '@slowreader/core'
  import { organizeMessages as t } from '@slowreader/core/messages'

  import { getURL, openURL } from '../../stores/router.js'
  import Button from '../../ui/button.svelte'
  import Loader from '../../ui/loader.svelte'
  import Row from '../../ui/row.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import FeedsEdit from './edit.svelte'

  export let feedId: string | undefined

  let categories = getCategories()
  let allFeeds = getFeeds()
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <div slot="one">
    {#if $allFeeds.isLoading || $categories.isLoading}
      <Loader />
    {:else}
      <ul role="list">
        {#each feedsByCategory($categories, $allFeeds.list) as [category, feeds] (category.id)}
          <li>
            {#if category.id === 'general'}
              <h2>{$t.generalCategory}</h2>
            {:else}
              <h2>
                <Row>
                  {category.title}
                  <Button
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
                    secondary
                    on:click={() => {
                      deleteCategory(category.id)
                    }}
                    >{$t.deleteCategory}
                  </Button>
                </Row>
              </h2>
            {/if}
            <ul role="list">
              {#each feeds as feed (feed.id)}
                <li>
                  {#if feedId === feed.id}
                    <strong>{feed.title}</strong>
                  {:else}
                    <a href={getURL('categories', { id: feed.id })}>
                      {feed.title}
                    </a>
                  {/if}
                </li>
              {/each}
            </ul>
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
