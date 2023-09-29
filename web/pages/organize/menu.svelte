<script lang="ts">
  import {
    changeCategory,
    deleteCategory,
    feedsByCategory,
    getCategories,
    organizeFeeds,
    organizeLoading
  } from '@slowreader/core'
  import { organizeMessages as t } from '@slowreader/core/messages'

  import { getURL } from '../../stores/router.js'
  import UiLoader from '../../ui/loader.svelte'

  export let currentFeed: string | undefined = undefined

  let categories = getCategories()
</script>

{#if $organizeLoading || $categories.isLoading}
  <UiLoader />
{:else}
  <ul>
    {#each feedsByCategory($categories, $organizeFeeds) as [category, feeds] (category.id)}
      <li>
        {#if category.id === 'general'}
          <h2>{$t.generalCategory}</h2>
        {:else}
          <h2>{category.title}</h2>
          <button
            on:click={() => {
              let title = prompt($t.categoryName, category.title)
              if (title) {
                changeCategory(category.id, { title })
              }
            }}>{$t.renameCategory}</button
          >
          <button
            on:click={() => {
              deleteCategory(category.id)
            }}>{$t.deleteCategory}</button
          >
        {/if}
        {#each feeds as feed (feed.id)}
          <li>
            {#if currentFeed === feed.id}
              <strong>{feed.title}</strong>
            {:else}
              <a href={getURL('feed', { id: feed.id })}>{feed.title}</a>
            {/if}
          </li>
        {/each}
      </li>
    {/each}
  </ul>
{/if}
