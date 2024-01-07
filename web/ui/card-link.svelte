<script lang="ts">
  import { mdiChevronRight } from '@mdi/js'
  import { createEventDispatcher } from 'svelte'

  import Icon from './icon.svelte'

  export let href: string | undefined = undefined
  export let name: string
  export let current = false
  export let first = false

  let dispatch = createEventDispatcher<{ click: null }>()

  function onClick(): void {
    dispatch('click')
  }
</script>

<li role="presentation">
  {#if href}
    <a
      class="card-link"
      aria-current={current ? 'page' : null}
      {href}
      role="menuitem"
      tabindex={current || first ? null : -1}
      on:click={onClick}
    >
      {name}
      {#if current}
        <Icon path={mdiChevronRight} />
      {/if}
    </a>
  {:else}
    <button
      class="card-link"
      aria-current={current ? 'page' : null}
      role="menuitem"
      tabindex={current || first ? null : -1}
      on:click={onClick}
    >
      {name}
      {#if current}
        <Icon path={mdiChevronRight} />
      {/if}
    </button>
  {/if}
</li>

<style>
  .card-link {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: calc(100% + 2 * var(--padding-l));
    padding: var(--padding-l);
    margin-inline: calc(-1 * var(--padding-l));
    color: inherit;
    text-align: left;
    text-decoration: none;
    background: none;
    border: none;
    border-top: 1px solid var(--border-color);

    &:hover {
      background: var(--hover-color);
    }

    &:active,
    &[aria-current='page'] {
      padding-block: calc(var(--padding-l) + 2px) calc(var(--padding-l) - 1px);
      border-top: 0;
      box-shadow: var(--card-item-pressed-shadow), var(--card-item-above-shadow);
    }

    &:focus-visible {
      outline-offset: 0;
    }

    &[aria-current='page'] {
      cursor: default;

      &:hover {
        background: none;
      }
    }

    &[aria-current='page'].is-pseudo-hover {
      background: var(--hover-color);
    }
  }

  li:last-child > .card-link {
    border-bottom: 1px solid var(--border-color);
  }

  :global(.card > ul:first-child > li:first-child) > .card-link {
    border-top: none;
    border-radius: var(--outer-radius) var(--outer-radius) 0 0;

    &:active,
    &[aria-current='page'] {
      padding-top: calc(var(--padding-l) + 1px);
      box-shadow:
        var(--card-item-pressed-shadow),
        0 -5px 0 var(--land-color),
        inset 0 1px 0 var(--land-color);
    }
  }

  :global(.card > ul:last-child > li:last-child) > .card-link {
    border-bottom: none;
    border-radius: 0 0 var(--outer-radius) var(--outer-radius);

    &:active,
    &[aria-current='page'] {
      box-shadow:
        var(--card-item-pressed-shadow),
        var(--card-item-above-shadow),
        0 5px 0 var(--land-color);
    }
  }

  :global(.card > ul:first-child > li:first-child:last-child) > .card-link {
    border: none;
    border-radius: var(--outer-radius);

    &:active,
    &[aria-current='page'] {
      padding-top: calc(var(--padding-l) + 1px);
      background: var(--card-color);
      box-shadow:
        var(--card-item-pressed-shadow),
        0 0 0 5px var(--land-color),
        inset 0 1px 0 var(--land-color);
    }
  }

  .card-link:focus-visible::before,
  .card-link:focus-visible::after {
    position: absolute;
    inset-inline-end: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: 100%;
    font: var(--hotkey-font);
    color: var(--hotkey-color);
  }

  .card-link:focus-visible::before {
    top: 0;
    content: '↵';
  }

  li:not(:last-child) > .card-link:focus-visible::after {
    top: calc(100% + 1px);
    content: '↓';
  }

  li:last-child > .card-link:focus-visible::after {
    bottom: calc(100% + 1px);
    content: '↑';
  }

  :global(.is-hotkey-disabled)
    .card-link:not(:first-of-type):focus-visible::before,
  :global(.is-hotkey-disabled)
    .card-link:not(:last-of-type):focus-visible::after {
    display: none;
  }
</style>
