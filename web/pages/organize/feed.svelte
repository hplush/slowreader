<script lang="ts">
  import { deleteFeed } from '@slowreader/core'
  import { organizeMessages as t } from '@slowreader/core/messages'

  import { openURL } from '../../stores/router.js'
  import OrganizeEdit from './edit.svelte'
  import OrganizeMenu from './menu.svelte'

  export let feedId: string
</script>

<OrganizeMenu currentFeed={feedId} />

<button
  on:click={() => {
    openURL('feeds')
    deleteFeed(feedId)
  }}>{$t.deleteFeed}</button
>

<OrganizeEdit {feedId} />
