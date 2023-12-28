<script lang="ts">
  import { organizeMessages as t } from '@slowreader/core/messages'

  import { openURL } from '../../../stores/router.js'
  import TwoStepsPage from '../../../ui/two-steps-page.svelte'
  import FeedsEdit from '../edit.svelte'
  import FeedsCategoriesList from './list.svelte'

  export let feedId: string

  function onDelete(): void {
    openURL('categories')
  }
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <FeedsCategoriesList slot="one" currentFeed={feedId} />

  <div slot="two">
    <FeedsEdit {feedId} on:delete={onDelete} />
  </div>
</TwoStepsPage>
