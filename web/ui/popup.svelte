<script lang="ts">
  import { mdiChevronLeft, mdiClose } from '@mdi/js'
  import {
    closeLastPopup,
    comfortMode,
    type FeedValue,
    layoutType,
    router,
    commonMessages as t
  } from '@slowreader/core'
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { on } from 'svelte/events'

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

  onMount(() => {
    return on(document.body, 'click', e => {
      let clicked = e.target as HTMLElement
      if (!clicked.closest('.popup')) {
        closeLastPopup()
      }
    })
  })
</script>

<dialog
  {id}
  class="popup"
  class:is-comfort-mode={reading === 'slow'}
  class:is-non-comfort-mode={reading === 'fast'}
  open
>
  <header
    class="popup_header"
    class:is-comfort-mode={$layoutType !== 'desktop' && $comfortMode}
    class:is-non-comfort-mode={$layoutType !== 'desktop' && !$comfortMode}
  >
    <div class="popup_center">
      <div class="popup_other">
        {#if header}
          {@render header()}
        {/if}
      </div>
      <Button
        href={getHashWithoutLastPopup($router)}
        icon={$layoutType !== 'desktop' ? mdiChevronLeft : mdiClose}
        size="icon"
        tabindex={-1}
        variant="plain"
      >
        {$t.closePopup}
      </Button>
    </div>
  </header>
  <div class="popup_body">
    <div class="popup_content">
      {@render children()}
    </div>
  </div>
</dialog>

<style lang="postcss">
  :global {
    .popup {
      position: fixed;
      display: flex;
      flex-direction: column;
      width: var(--popup-size);
      height: auto;

      @media (--no-mobile) {
        @mixin background var(--main-land-color);

        inset-block: 0;
        inset-inline: auto 0;
        z-index: 9;
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

    .popup_header {
      @media (--mobile) {
        @mixin background var(--main-land-color);

        height: var(--navbar-height);
        box-shadow: var(--bottom-panel-shadow);
      }
    }

    .popup_center,
    .popup_other {
      display: flex;
      gap: 0.5rem;
    }

    .popup_center {
      box-sizing: border-box;
      flex-direction: row-reverse;
      justify-content: space-between;
      max-width: 100%;
      padding: var(--navbar-padding) var(--page-padding);

      @media (--mobile) {
        align-items: center;
        width: calc(var(--thin-content-width) + 2 * var(--page-padding));
        padding-inline: 1rem;
      }
    }

    .popup_body {
      box-sizing: border-box;
      height: calc(100% - var(--navbar-height));
      overflow: hidden auto;

      @media (--mobile) {
        padding: var(--page-padding);
      }
    }

    .popup_content {
      padding: var(--page-padding);
    }
  }
</style>
