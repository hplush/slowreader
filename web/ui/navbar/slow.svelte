<script lang="ts">
  import {
    type CategoryValue,
    type Route,
    router,
    slowCategories,
    commonMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'
  import Loader from '../loader.svelte'
  import NavbarCategory from './category.svelte'
  import NavbarItem from './item.svelte'

  function categoryName(category: CategoryValue): string {
    if (category.id === 'general') {
      return $t.generalCategory
    } else if (category.id === 'broken') {
      return $t.brokenCategory
    } else {
      return category.title
    }
  }

  function isCurrentFeed(page: Route, feedId: string): boolean {
    return page.route === 'slow' && page.params.feed === feedId
  }
</script>

{#if $slowCategories.isLoading}
  <Loader zoneId="navbar_submenu" />
{:else}
  {#each $slowCategories.tree as [category, feeds] (category.id)}
    <NavbarCategory name={categoryName(category)} />
    {#each feeds as [feed, unread] (feed.id)}
      <NavbarItem
        name={`${feed.title} (${unread})`}
        current={isCurrentFeed($router, feed.id)}
        href={getURL({ params: { feed: feed.id }, route: 'slow' })}
        secondary
      />
    {/each}
  {/each}
{/if}
