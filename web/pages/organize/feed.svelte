<script lang="ts">
  import { deleteFeed, organizeMessages as t } from '@slowreader/core'

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
  }}>{$t.delete}</button
>

<OrganizeEdit {feedId} />
