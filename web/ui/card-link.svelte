<script lang="ts">
  import { mdiChevronRight, mdiListBox } from '@mdi/js'
  import { createEventDispatcher } from 'svelte'

  import Icon from './icon.svelte'
  import type { AriaRole } from 'svelte/elements'

  export let href: string | undefined = undefined
  export let controls: string | undefined = undefined
  export let name: string
  export let current = false
  export let first = false
  export let role: AriaRole = 'option'

  let dispatch = createEventDispatcher<{ click: null }>()

  function onClick(): void {
    dispatch('click')
  }
</script>

<li role="none">
  {#if href}
    <a
      class="card-link"
      aria-controls={controls}
      aria-current={current ? 'page' : null}
      {href}
      {role}
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
      aria-controls={controls}
      aria-current={current ? 'page' : null}
      {role}
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
    text-align: start;
    text-decoration: none;
    word-break: break-all;
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
    border-radius: var(--radius) var(--radius) 0 0;

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
    border-radius: 0 0 var(--radius) var(--radius);

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
    border-radius: var(--radius);

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
</style>
