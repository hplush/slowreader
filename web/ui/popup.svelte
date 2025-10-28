<script lang="ts">
  import { mdiChevronLeft, mdiClose } from '@mdi/js'
  import {
    comfortMode,
    type FeedValue,
    isMobile,
    router,
    commonMessages as t
  } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import { getHashWithoutLastPopup } from '../stores/url-router.ts'
  import Button from './button.svelte'

  let {
    children,
    header,
    id,
    reading
  }: {
    children: Snippet
    header?: Snippet
    id: string
    reading?: FeedValue['reading']
  } = $props()
</script>

<aside
  {id}
  class="popup"
  class:is-comfort-mode={reading === 'slow'}
  class:is-non-comfort-mode={reading === 'fast'}
>
  <header
    class="popup_header"
    class:is-comfort-mode={$isMobile && $comfortMode}
    class:is-non-comfort-mode={$isMobile && !$comfortMode}
  >
    <div class="popup_other">
      {#if header}
        {@render header()}
      {/if}
    </div>
    <Button
      href={getHashWithoutLastPopup($router)}
      icon={$isMobile ? mdiChevronLeft : mdiClose}
      size="icon"
      tabindex={-1}
      variant="plain"
    >
      {$t.closePopup}
    </Button>
  </header>
  <div class="popup_body">
    <div class="popup_content">
      {@render children()}
    </div>
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
        align-items: center;
        box-shadow: var(--popup-shadow);
      }

      @media (--mobile) {
        @mixin background var(--land-color);

        inset: 0;
        z-index: 20;
        flex-direction: column-reverse;
      }
    }

    .popup_header,
    .popup_body {
      @media (--no-mobile) {
        width: stretch;
        max-width: min(
          calc(var(--max-content-width) + 2 * var(--page-padding)),
          var(--popup-size)
        );
      }
    }

    .popup_header,
    .popup_other {
      display: flex;
      gap: 0.5rem;
    }

    .popup_header {
      box-sizing: border-box;
      flex-direction: row-reverse;
      align-items: center;
      justify-content: space-between;
      padding: var(--navbar-padding) var(--page-padding);

      @media (--mobile) {
        height: var(--navbar-height);
        padding: 0 var(--navbar-padding);
        box-shadow: var(--bottom-panel-shadow);

        @mixin background var(--main-land-color);
      }
    }

    .popup_body {
      box-sizing: border-box;
      height: calc(100% - var(--navbar-height));
      overflow: hidden scroll;

      @media (--mobile) {
        padding: var(--page-padding);
      }
    }

    .popup_content {
      padding: var(--page-padding);
    }
  }
</style>
