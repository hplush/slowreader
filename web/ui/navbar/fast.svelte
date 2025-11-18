<script lang="ts">
  import { fastMenu, router } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import NavbarItem from './item.svelte'
</script>

<div class="navbar-fast">
  {#each $fastMenu as category (category.id)}
    <NavbarItem
      name={category.title}
      current={$router.route === 'fast' &&
        $router.params.category === category.id}
      href={getURL({ params: { category: category.id }, route: 'fast' })}
    />
  {/each}
</div>

<style>
  :global {
    .navbar-fast {
      @media (--no-desktop) {
        padding-top: 0.375rem;
      }
    }
  }
</style>
