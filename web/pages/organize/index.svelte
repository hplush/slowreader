<script lang="ts">
  import { organizeMessages as t } from '@slowreader/core/messages'

  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import OrganizeMenu from './menu.svelte'
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <OrganizeMenu slot="one" />
</TwoStepsPage>
