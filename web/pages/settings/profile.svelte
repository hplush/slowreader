<script lang="ts">
  import { signOut, settingsMessages as t } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import CardActions from '../../ui/card-actions.svelte'
  import Card from '../../ui/card.svelte'
  import Page from '../../ui/page.svelte'
  import UnderConstruction from '../../ui/under-construction.svelte'
</script>

<Page title={$t.profile} type="list">
  <Card>
    <UnderConstruction />
    <CardActions>
      <Button
        dangerous
        onclick={() => {
          if (!confirm($t.deleteProfileConfirm)) return
          signOut()
        }}
      >
        {$t.deleteProfile}
      </Button>
    </CardActions>
  </Card>
</Page>
