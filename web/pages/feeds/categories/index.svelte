<script lang="ts">
  import { organizeMessages as t } from '@slowreader/core/messages'

  import TwoStepsPage from '../../../ui/two-steps-page.svelte'
  import FeedsCategoriesList from './list.svelte'
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <FeedsCategoriesList slot="one" />
</TwoStepsPage>
