<script lang="ts">
  import { mdiFileTree, mdiPlusCircleOutline } from '@mdi/js'
  import { hasFeeds, router, navbarMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'
  import NavbarItem from './item.svelte'
</script>

<NavbarItem
  name={$t.add}
  current={$router.route === 'add'}
  href={getURL('add')}
  icon={mdiPlusCircleOutline}
  secondary
/>

{#if $hasFeeds}
  <NavbarItem
    name={$t.feedsByCategory}
    current={$router.route === 'categories'}
    href={getURL('categories')}
    icon={mdiFileTree}
    secondary
  />
{/if}
