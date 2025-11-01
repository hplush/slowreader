<script
  generics="Value extends { id: string } | { originId: string } | { url: string }"
  lang="ts"
>
  import type { Snippet } from 'svelte'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'

  let {
    getArrow,
    getControls,
    getCurrent,
    getHref,
    id,
    item,
    list
  }: {
    // eslint-disable-next-line svelte/require-event-prefix
    getArrow?: (value: Value) => string
    // eslint-disable-next-line svelte/require-event-prefix
    getControls?: (value: Value) => string
    // eslint-disable-next-line svelte/require-event-prefix
    getCurrent: (value: Value) => boolean
    // eslint-disable-next-line svelte/require-event-prefix
    getHref: (value: Value) => string
    id?: string
    item: Snippet<[Value]>
    list: readonly Value[]
  } = $props()

  function getId(value: Value): string {
    if ('id' in value) {
      return value.id
    } else if ('originId' in value) {
      return value.originId
    } else {
      return value.url
    }
  }
</script>

<ul {id} class="links" class:is-arrow={!!getArrow}>
  {#each list as i (getId(i))}
    <li>
      <Clickable
        class="links_item"
        aria-controls={getControls?.(i) ?? null}
        aria-current={getCurrent(i) ? 'page' : null}
        href={getHref(i)}
        role="menuitem"
      >
        {@render item(i)}
        {@const icon = getArrow?.(i)}
        {#if icon}
          <div class="links_arrow">
            <Icon path={icon} />
          </div>
        {/if}
      </Clickable>
    </li>
  {/each}
</ul>

<style>
  :global {
    .links {
      width: stretch;
      list-style: none;
    }

    .links_item {
      @mixin clickable;

      position: relative;
      display: block;
      padding: 0.625rem var(--control-padding);
      margin-top: calc(-1 * var(--min-size));
      font: var(--control-font);
      overflow-wrap: anywhere;
      background: --tune-background(--flat-button);
      box-shadow: var(--flat-control-shadow);

      li:first-child & {
        margin-top: 0;
        border-radius: var(--base-radius) var(--base-radius) 0 0;
      }

      li:last-child & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
      }

      li:last-child:first-child & {
        border-radius: var(--base-radius);
      }

      &:hover,
      &:active,
      &:focus-visible {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      &:active {
        z-index: 1;
        padding-block: calc(0.625rem + var(--min-size))
          calc(0.625rem - var(--min-size));
        box-shadow: var(--pressed-shadow);
      }

      &[aria-current='page'] {
        z-index: 1;
        cursor: default;
        background: --tune-background(--current);
        box-shadow: var(--current-shadow);
      }

      .links.is-arrow & {
        padding-inline-end: calc(1.2rem + 2 * 0.125rem);
      }
    }

    .links_arrow {
      --icon-size: 1.2rem;

      position: absolute;
      inset-block: 0;
      inset-inline-end: 0.125rem;
      display: flex;
      align-items: center;

      .links_item:active & {
        translate: 0 1px;
      }

      .links_item:not([aria-current='page']) & {
        opacity: 20%;
      }
    }
  }
</style>
