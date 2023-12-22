<script lang="ts">
  import { deleteFeed } from '@slowreader/core'
  import { organizeMessages as t } from '@slowreader/core/messages'

  import { openURL } from '../../stores/router.js'
  import UiTwoStepsPage from '../../ui/two-steps-page.svelte'
  import OrganizeEdit from './edit.svelte'
  import OrganizeMenu from './menu.svelte'

  export let feedId: string
</script>

<UiTwoStepsPage title={$t.byCategoryTitle}>
  <OrganizeMenu slot="one" currentFeed={feedId} />

  <div slot="two">
    <button
      on:click={() => {
        openURL('feeds')
        deleteFeed(feedId)
      }}>{$t.deleteFeed}</button
    >
    <OrganizeEdit {feedId} />
  </div>
</UiTwoStepsPage>
