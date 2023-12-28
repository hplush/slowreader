<script lang="ts">
  import { mdiFileTree, mdiPlusCircleOutline } from '@mdi/js'
  import { hasFeeds, router } from '@slowreader/core'
  import { navbarMessages as t } from '@slowreader/core/messages'

  import { getURL } from '../../stores/router.js'
  import NavbarItem from './item.svelte'
</script>

<NavbarItem
  current={$router.route === 'add' || $router.route === 'preview'}
  href={getURL('add')}
  icon={mdiPlusCircleOutline}
  secondary
>
  {$t.add}
</NavbarItem>

{#if $hasFeeds}
  <NavbarItem
    current={$router.route === 'feeds' || $router.route === 'feed'}
    href={getURL('feeds')}
    icon={mdiFileTree}
    secondary
  >
    {$t.feedsByCategory}
  </NavbarItem>
{/if}
