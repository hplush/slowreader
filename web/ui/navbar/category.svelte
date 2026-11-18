<script lang="ts">
  import { mdiChevronDown } from '@mdi/js'
  import {
    closedCategories,
    openCategory,
    navbarMessages as t,
    toggleCategory
  } from '@slowreader/core'
  import type { Snippet } from 'svelte'
  import type { KeyboardEventHandler, MouseEventHandler } from 'svelte/elements'

  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    current,
    href,
    id,
    name
  }: {
    children: Snippet
    current?: boolean
    href?: string
    id: string
    name: string
  } = $props()

  let closed = $derived(!!href && $closedCategories.has(id))
</script>

<div class="navbar-category" class:is-closed={closed}>
  {#if href}
    <div class="navbar-category_header">
      <Clickable
        class="navbar-category_toggle"
        aria-controls={`navbar-${id}-submenu`}
        aria-expanded={!closed}
        aria-label={$t.categoryFeeds({ name })}
        onclick={(e => {
          // Keyboard click has zero detail and is handled in onkeydown
          if (e.detail) toggleCategory(id)
        }) as MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>}
        onkeydown={(e => {
          if (e.key === 'Enter') {
            // KeyUX moves focus into the submenu on Enter, so it only opens
            openCategory(id)
          } else if (e.key === ' ') {
            toggleCategory(id)
          }
        }) as KeyboardEventHandler<HTMLAnchorElement | HTMLButtonElement>}
        role="menuitem"
        tabindex={-1}
      >
        <div class="navbar-category_icon">
          <Icon path={mdiChevronDown} />
        </div>
      </Clickable>
      <Clickable
        class="navbar-category_link"
        aria-controls="page"
        aria-current={current ? 'page' : null}
        {href}
        onkeydown={(e => {
          if (e.key === 'Enter') {
            let link = e.currentTarget
            setTimeout(() => {
              link.tabIndex = -1
            }, 10)
          }
        }) as KeyboardEventHandler<HTMLAnchorElement | HTMLButtonElement>}
        role="menuitem"
        tabindex={-1}
      >
        <span class="navbar-category_text">{name}</span>
      </Clickable>
    </div>
  {:else}
    <Clickable
      class="navbar-category_title"
      aria-controls={`navbar-${id}-submenu`}
      aria-expanded={false}
      aria-haspopup="menu"
      role="menuitem"
      tabindex={-1}
    >
      <span class="navbar-category_text">{name}</span>
    </Clickable>
  {/if}
  {#if !closed}
    <div id={`navbar-${id}-submenu`} aria-hidden="true" role="menu">
      {@render children()}
    </div>
  {/if}
</div>

<style lang="postcss">
  :global {
    .navbar-category {
      padding-top: 0.125rem;

      @media (--no-desktop) {
        &:first-child {
          padding-top: 0;
        }
      }

      @media (--tablet) {
        width: var(--thin-content-width);
        margin: 0 auto;
      }
    }

    .navbar-category_header {
      display: flex;

      @media (--no-desktop) {
        min-height: var(--control-height);
      }
    }

    .navbar-category_toggle {
      @mixin clickable;

      display: flex;
      flex-shrink: 0;
      align-items: center;
      padding: 0.3125rem 0.5rem 0.125rem 0.625rem;
      color: var(--secondary-text-color);
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        background: --tune-background(--flat-button);
      }
    }

    .navbar-category_icon {
      width: var(--icon-size);
      height: var(--icon-size);
      transition: rotate var(--simple-time);

      .navbar-category.is-closed & {
        rotate: -90deg;
      }

      .navbar-category_toggle:active & {
        translate: 0 1px;
      }
    }

    .navbar-category_link {
      @mixin clickable;

      position: relative;
      display: flex;
      flex-grow: 1;
      align-items: center;
      min-width: 0;
      padding: 0.3125rem 0.625rem 0.125rem 0.25rem;
      margin-inline-start: -0.25rem;
      color: var(--secondary-text-color);
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        background: --tune-background(--flat-button);
      }

      &[aria-current='page'] {
        z-index: 2;
        background: --tune-background(--current);
        box-shadow: var(--current-shadow);
      }

      @media (--desktop) {
        &:active:not([aria-current='page']) {
          box-shadow: var(--pressed-shadow);
        }

        &[aria-current='page'] {
          cursor: default;
        }
      }

      @media (--no-desktop) {
        &:active {
          background: --tune-background(--flat-button);
          box-shadow: var(--pressed-shadow);
        }
      }
    }

    .navbar-category_title {
      @mixin clickable;

      width: stretch;
      padding: 0.3125rem 0 0.125rem 2.125rem;
      color: var(--secondary-text-color);
      border-radius: var(--base-radius);

      /* Global cursor of buttons has a bigger specificity */
      .navbar-category:not(.is-closed) & {
        cursor: default;
      }
    }

    .navbar-category_text {
      display: block;
      font: var(--secondary-font);

      .navbar-category_link:not([aria-current='page']):active & {
        translate: 0 1px;
      }

      @media (--no-desktop) {
        .navbar-category_link:active & {
          translate: 0 1px;
        }
      }
    }
  }
</style>
