<script generics="Value extends object" lang="ts">
  import type { Snippet } from 'svelte'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'

  interface Link<ItemValue> {
    arrow?: string
    controls?: string
    href: string
    item: ItemValue
  }

  let {
    current,
    id,
    item,
    links
  }: {
    current: undefined | Value
    id?: string
    item: Snippet<[Value]>
    links: Link<Value>[]
  } = $props()
</script>

<ul
  {id}
  class="links"
  class:is-arrow={!!links[0]?.arrow}
  aria-hidden="true"
  role="menu"
>
  {#each links as i (i.href)}
    <li>
      <Clickable
        class="links_item"
        aria-controls={i.controls ?? null}
        aria-current={current === i.item ? 'page' : null}
        href={i.href}
        role="menuitem"
        tabindex={-1}
      >
        {@render item(i.item)}
        {@const icon = i.arrow}
        {#if icon}
          <div class="links_arrow">
            <Icon path={icon} />
          </div>
        {/if}
      </Clickable>
    </li>
  {/each}
</ul>

<style lang="postcss">
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

      &:not([aria-current='page']):active {
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

      .links_item:not([aria-current='page']):active & {
        translate: 0 1px;
      }

      .links_item:not([aria-current='page']) & {
        opacity: 20%;
      }
    }
  }
</style>
