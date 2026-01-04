<script lang="ts" module>
  export interface Link<ItemValue> {
    controls?: string
    href: string
    id: string
    item: ItemValue
    mark?: string
    markTitle?: string
    variant?: 'normal' | 'read'
  }
</script>

<script generics="Value extends object" lang="ts">
  import type { Snippet } from 'svelte'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'

  let {
    current,
    id,
    item,
    links
  }: {
    current?: string
    id?: string
    item: Snippet<[Value]>
    links: Link<Value>[]
  } = $props()
</script>

<ul {id} class="links" aria-hidden="true" role="menu">
  {#each links as i (i.id)}
    <li>
      <Clickable
        class={{
          'is-read': i.variant === 'read',
          'links_item': true
        }}
        aria-controls={i.controls ?? null}
        aria-current={current === i.id ? 'page' : null}
        href={i.href}
        role="menuitem"
        tabindex={-1}
      >
        {@render item(i.item)}
        {@const icon = i.mark}
        {#if icon}
          <div class="links_mark" title={i.markTitle}>
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
      display: flex;
      justify-content: space-between;
      padding: 0.875rem var(--control-padding);
      margin-top: calc(-1 * var(--min-size));
      font: var(--control-font);
      overflow-wrap: anywhere;
      background: --tune-background(--flat-button);
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      li:not(:last-child) > & {
        border-bottom: none;
      }

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

      &.is-read {
        color: var(--secondary-text-color);
        background: var(--current-background);

        &:hover,
        &:active,
        &:focus-visible {
          background: --tune-background(--flat-button-hover);
        }
      }

      &:not([aria-current='page']):active {
        z-index: 1;
        padding-block: calc(0.875rem + var(--min-size))
          calc(0.875rem - var(--min-size));
        border-color: transparent;
        box-shadow: var(--pressed-shadow);
      }

      &[aria-current='page'] {
        z-index: 1;
        cursor: default;
        background: --tune-background(--current);
        border-color: transparent;
        box-shadow: var(--current-shadow);
      }
    }

    .links_mark {
      display: flex;
      align-items: center;
      margin-inline-end: -0.625rem;

      .links_item:not([aria-current='page']):active & {
        translate: 0 1px;
      }

      .links_item:not([aria-current='page'], .is-read) & {
        opacity: 20%;
      }
    }
  }
</style>
