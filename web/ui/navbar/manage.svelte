<script lang="ts">
  import { mdiFileTree, mdiPlusCircleOutline } from '@mdi/js'
  import { hasFeeds, router } from '@slowreader/core'
  import { navbarMessages as t } from '@slowreader/core/messages'

  import { getURL } from '../../stores/router.js'
  import UiNavbarItem from './item.svelte'
</script>

<UiNavbarItem
  current={$router.route === 'add' || $router.route === 'preview'}
  href={getURL('add')}
  icon={mdiPlusCircleOutline}
  secondary
>
  {$t.add}
</UiNavbarItem>

{#if $hasFeeds}
  <UiNavbarItem
    current={$router.route === 'feeds' || $router.route === 'feed'}
    href={getURL('feeds')}
    icon={mdiFileTree}
    secondary
  >
    {$t.feedsByCategory}
  </UiNavbarItem>
{/if}
