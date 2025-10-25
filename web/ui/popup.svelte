<script lang="ts">
  import { mdiChevronLeft, mdiClose } from '@mdi/js'
  import { isMobile, router, commonMessages as t } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import { getHashWithoutLastPopup } from '../stores/url-router.ts'
  import Button from './button.svelte'

  let {
    children,
    header,
    id
  }: { children: Snippet; header?: Snippet; id: string } = $props()
</script>

<aside {id} class="popup">
  <header class="popup_header">
    <Button
      href={getHashWithoutLastPopup($router)}
      icon={$isMobile ? mdiChevronLeft : mdiClose}
      size="icon"
      tabindex={-1}
      variant="plain"
    >
      {$t.closePopup}
    </Button>
    {#if header}
      {@render header()}
    {/if}
  </header>
  <div class="popup_body">
    {@render children()}
  </div>
</aside>

<style>
  :global {
    .popup {
      position: fixed;
      display: flex;
      flex-direction: column;
      width: var(--popup-size);

      @media (--no-mobile) {
        @mixin background var(--main-land-color);

        inset-block: 0;
        inset-inline-end: 0;
        box-shadow: var(--popup-shadow);
      }

      @media (--mobile) {
        inset: 0;
        z-index: 20;
        flex-direction: column-reverse;
        background: var(--land-color);
      }
    }

    .popup_header {
      box-sizing: border-box;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      height: var(--navbar-height);
      padding: 0 0.375rem;

      @media (--mobile) {
        padding: 0 var(--navbar-padding);

        @mixin background var(--main-land-color);

        box-shadow: var(--bottom-panel-shadow);
      }
    }

    .popup_body {
      box-sizing: border-box;
      max-width: var(--max-content-width);
      min-height: 100%;
      padding: var(--page-padding);
      overflow: hidden scroll;

      @media (--no-desktop) {
        min-height: calc(100% - var(--navbar-height));
      }

      @media (--mobile) {
        padding: var(--page-padding);
      }
    }
  }
</style>
