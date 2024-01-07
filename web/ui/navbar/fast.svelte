<script lang="ts">
  import { fastCategories, router } from '@slowreader/core'
  import { commonMessages as t } from '@slowreader/core/messages'

  import { getURL } from '../../stores/router.js'
  import Loader from '../loader.svelte'
  import NavbarItem from './item.svelte'
</script>

{#if $fastCategories.isLoading}
  <Loader />
{:else if $fastCategories.categories.length > 0}
  {#each $fastCategories.categories as category (category.id)}
    <NavbarItem
      current={$router.route === 'fast' &&
        $router.params.category === category.id}
      href={getURL('fast', { category: category.id })}
      secondary
    >
      {#if category.id === 'general'}
        {$t.generalCategory}
      {:else}
        {category.title}
      {/if}
    </NavbarItem>
  {/each}
{/if}
