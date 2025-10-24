<script lang="ts">
  import { mdiClose } from '@mdi/js'
  import { router, commonMessages as t } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import { getHashWithoutLastPopup } from '../stores/url-router.ts'
  import Button from './button.svelte'

  let { children, id }: { children: Snippet; id: string } = $props()
</script>

<aside class="popup">
  <header class="popup_header">
    <Button
      href={getHashWithoutLastPopup($router)}
      icon={mdiClose}
      size="icon"
      variant="plain"
    >
      {$t.closePopup}
    </Button>
  </header>
  <div {id} class="popup_body">
    {@render children()}
  </div>
</aside>

<style>
  :global {
    .popup {
      position: fixed;
      width: var(--popup-size);

      @media (--no-mobile) {
        @mixin background var(--main-land-color);

        inset-block: 0;
        inset-inline-end: 0;
        box-shadow: var(--popup-shadow);
      }

      @media (--mobile) {
        inset: 0;
        bottom: var(--navbar-height);
        z-index: 9;
        background: var(--land-color);
      }
    }

    .popup_header {
      padding: 0.25rem;

      @media (--mobile) {
        display: none;
      }
    }

    .popup_body {
      max-width: var(--max-content-width);
      min-height: 100%;
      padding-block: 1rem;
      margin: 0 auto;
      overflow-x: scroll;
    }
  }
</style>
