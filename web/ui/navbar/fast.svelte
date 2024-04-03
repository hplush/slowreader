<script lang="ts">
  import {
    type CategoryValue,
    fastCategories,
    router,
    commonMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'
  import Loader from '../loader.svelte'
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
</script>

{#if $fastCategories.isLoading}
  <Loader zoneId="navbar_submenu" />
{:else if $fastCategories.categories.length > 0}
  {#each $fastCategories.categories as category (category.id)}
    <NavbarItem
      name={categoryName(category)}
      current={$router.route === 'fast' &&
        $router.params.category === category.id}
      href={getURL({ params: { category: category.id }, route: 'fast' })}
      secondary
      on:click
    />
  {/each}
{/if}
