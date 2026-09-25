<script lang="ts">
  import { mdiArrowLeft } from '@mdi/js'
  import { currentPage, authMessages as t, userId } from '@slowreader/core'

  import { hasLanding } from '../lib/landing.ts'
  import Button from './button.svelte'

  let hideMenu = $derived($currentPage.hideMenu)
</script>

{#if hasLanding && (!$userId || $hideMenu)}
  <div class="home-button">
    <Button href="/" icon={mdiArrowLeft} rel="external" variant="plain">
      {$t.home}
    </Button>
  </div>
{/if}

<style>
  :global {
    .home-button {
      position: absolute;
      inset-block-start: var(--navbar-padding);
      inset-inline-start: var(--navbar-padding);
    }
  }
</style>
