<script lang="ts">
  import { mdiChevronRight } from '@mdi/js'

  import Icon from './icon.svelte'

  let {
    controls,
    current = false,
    first = false,
    href,
    name,
    onclick
  }: {
    controls?: string
    current?: boolean
    first?: boolean
    href?: string
    name: string
    onclick?: () => void
  } = $props()
</script>

<li role="presentation">
  {#if href}
    <a
      class="card-link"
      aria-controls={controls}
      aria-current={current ? 'page' : null}
      {href}
      {onclick}
      role="menuitem"
      tabindex={current || first ? null : -1}
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
      {onclick}
      role="menuitem"
      tabindex={current || first ? null : -1}
    >
      {name}
      {#if current}
        <Icon path={mdiChevronRight} />
      {/if}
    </button>
  {/if}
</li>

<style>
  :global {
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
        box-shadow: var(--card-item-pressed-shadow),
          var(--card-item-above-shadow);
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

    .card > ul:first-child > li:first-child > .card-link {
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

    .card > ul:last-child > li:last-child > .card-link {
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

    .card > ul:first-child > li:first-child:last-child > .card-link {
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
  }
</style>
