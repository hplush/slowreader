<script lang="ts">
  import { mdiChevronDown } from '@mdi/js'
  import {
    closedCategories,
    openCategory,
    toggleCategory
  } from '@slowreader/core'
  import type { Snippet } from 'svelte'
  import type { KeyboardEventHandler, MouseEventHandler } from 'svelte/elements'

  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    closable = true,
    id,
    name
  }: {
    children: Snippet
    closable?: boolean
    id: string
    name: string
  } = $props()

  let closed = $derived(closable && $closedCategories.has(id))
</script>

<div
  class="navbar-category"
  class:is-closable={closable}
  class:is-closed={closed}
>
  <Clickable
    class="navbar-category_button"
    aria-controls={`navbar-${id}-submenu`}
    aria-expanded={false}
    aria-haspopup="menu"
    onclick={closable
      ? ((e => {
          if (e.detail) toggleCategory(id)
        }) as MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>)
      : undefined}
    onkeydown={closable
      ? ((e => {
          if (e.key === 'Enter') {
            openCategory(id)
          } else if (e.key === ' ') {
            toggleCategory(id)
          }
        }) as KeyboardEventHandler<HTMLAnchorElement | HTMLButtonElement>)
      : undefined}
    role="menuitem"
    tabindex={-1}
  >
    {#if closable}
      <div class="navbar-category_icon">
        <Icon path={mdiChevronDown} />
      </div>
    {/if}
    <div class="navbar-category_text">
      {name}
    </div>
  </Clickable>
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
    }

    .navbar-category_button {
      @mixin clickable;

      position: relative;
      display: flex;
      gap: 0.3125rem;
      width: stretch;
      padding: 0.3125rem 0 0.125rem 0.5rem;
      background: transparent;
      border-radius: var(--base-radius);
      align-items: center;
      color: var(--secondary-text-color);

      .navbar-category.is-closable &:hover,
      .navbar-category.is-closable &:focus-visible,
      .navbar-category.is-closable &:active {
        background: --tune-background(--flat-button);
      }

      .navbar-category:not(.is-closable) & {
        padding-inline-start: 2rem;
        cursor: default;
      }
    }

    .navbar-category_icon {
      transition: rotate var(--simple-time);
      width: var(--icon-size);
      height: var(--icon-size);

      .navbar-category.is-closed & {
        rotate: -90deg;
      }

      .navbar-category.is-closable .navbar-category_button:hover &,
      .navbar-category.is-closable .navbar-category_button:focus-visible & {
        opacity: 100%;
      }

      .navbar-category.is-closable .navbar-category_button:active & {
        translate: 0 1px;
      }
    }

    .navbar-category_text {
      font: var(--secondary-font);

      .navbar-category.is-closable .navbar-category_button:active & {
        translate: 0 1px;
      }
    }
  }
</style>
