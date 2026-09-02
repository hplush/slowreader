<script lang="ts">
  import { mdiChevronLeft, mdiClose } from '@mdi/js'
  import {
    closeLastPopup,
    type FeedValue,
    layoutType,
    commonMessages as t,
    themeMode
  } from '@slowreader/core'
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { on } from 'svelte/events'

  import Button from './button.svelte'

  let {
    children,
    header,
    id,
    navbar = false,
    reading
  }: {
    children: Snippet
    header?: Snippet
    id: string
    navbar?: boolean
    reading?: FeedValue['reading']
  } = $props()

  const INTERACTIVE_ELEMENTS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT'])

  function isInteractive(element: HTMLElement): boolean {
    for (let tag of INTERACTIVE_ELEMENTS) {
      let interactive = element.tagName === tag ? element : element.closest(tag)
      if (interactive && !interactive.getAttribute('aria-current')) {
        return true
      }
    }
    return false
  }

  onMount(() => {
    return on(document.body, 'mousedown', e => {
      let clicked = e.target as HTMLElement
      if (!clicked.closest('.popup') && !isInteractive(clicked)) {
        on(document.body, 'click', closeLastPopup, { once: true })
      }
    })
  })
</script>

<dialog
  {id}
  class="popup"
  class:is-comfort-mode={reading === 'slow'}
  class:is-navbar={navbar}
  class:is-non-comfort-mode={reading === 'fast'}
  data-anchor="popup"
  open
>
  {#if !navbar}
    <header
      class="popup_header"
      class:is-comfort-mode={$layoutType !== 'desktop' && $themeMode !== 'fast'}
      class:is-non-comfort-mode={$layoutType !== 'desktop' &&
        $themeMode === 'fast'}
    >
      <div class="popup_center">
        <div class="popup_other">
          {#if header}
            {@render header()}
          {/if}
        </div>
        <Button
          icon={$layoutType !== 'desktop' ? mdiChevronLeft : mdiClose}
          onclick={closeLastPopup}
          size="icon"
          tabindex={-1}
          variant="plain"
        >
          {$t.closePopup}
        </Button>
      </div>
    </header>
  {/if}
  {#if navbar}
    {@render children()}
  {:else}
    <div class="popup_body">
      <div class="popup_content">
        {@render children()}
      </div>
    </div>
  {/if}
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

    .popup.is-navbar {
      @mixin background var(--main-land-color);

      box-sizing: border-box;
      inset: auto 0 var(--navbar-height) 0;
      z-index: 9;
      flex-direction: column;
      gap: 0.125rem;
      width: 100%;
      max-height: calc(100dvh - var(--navbar-height) + var(--min-size));
      padding: 0.5rem 0.375rem;
      overflow: auto;
      box-shadow:
        inset 0 -0.5px 0 var(--separator-color),
        var(--bottom-panel-shadow);
      translate: 0 0;
      transition: translate var(--big-time) var(--slide-easing);

      @starting-style {
        translate: 0 100%;
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
      position: relative;
      box-sizing: border-box;
      height: calc(100% - var(--navbar-height));
      overflow: hidden auto;

      @media (--mobile) {
        padding: var(--page-padding);
      }
    }

    .popup_content {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: var(--page-padding);
    }
  }
</style>
