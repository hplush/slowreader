<script lang="ts">
  import { organizeMessages as t } from '@slowreader/core/messages'

  import UiTwoStepsPage from '../../ui/two-steps-page.svelte'
  import OrganizeMenu from './menu.svelte'
</script>

<UiTwoStepsPage title={$t.byCategoryTitle}>
  <OrganizeMenu slot="one" />
</UiTwoStepsPage>
