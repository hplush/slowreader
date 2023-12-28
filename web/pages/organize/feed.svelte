<script lang="ts">
  import { organizeMessages as t } from '@slowreader/core/messages'

  import { openURL } from '../../stores/router.js'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import OrganizeEdit from './edit.svelte'
  import OrganizeMenu from './menu.svelte'

  export let feedId: string

  function onDelete(): void {
    openURL('categories')
  }
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <OrganizeMenu slot="one" currentFeed={feedId} />

  <div slot="two">
    <OrganizeEdit {feedId} on:delete={onDelete} />
  </div>
</TwoStepsPage>
