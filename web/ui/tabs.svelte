<script generics="Value extends string" lang="ts">
  import type { Snippet } from 'svelte'

  import { hideIconsOnWrap } from '../lib/wrap.ts'
  import Icon from './icon.svelte'

  let {
    children,
    label,
    onchange,
    value,
    values
  }: {
    children: Snippet
    label: string
    onchange: (value: Value) => void
    value: Value
    values: [Value, string, string?][]
  } = $props()

  let id = $props.id()
</script>

<div class="tabs">
  <div
    class="tabs_list"
    {@attach hideIconsOnWrap('.tabs_name')}
    aria-label={label}
    onfocusout={e => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        for (let tab of e.currentTarget.children) {
          tab.setAttribute('tabindex', tab.ariaSelected === 'true' ? '0' : '-1')
        }
      }
    }}
    role="tablist"
  >
    {#each values as [key, name, icon] (key)}
      <button
        id={`${id}-${key}`}
        class="tabs_tab"
        aria-controls={`${id}-panel`}
        aria-selected={key === value}
        onclick={() => {
          onchange(key)
        }}
        role="tab"
        tabindex={key === value ? 0 : -1}
        type="button"
      >
        <span class="tabs_cap">
          {#if icon}
            <span class="tabs_icon">
              <Icon path={icon} />
            </span>
          {/if}
          <span class="tabs_name">{name}</span>
        </span>
      </button>
    {/each}
  </div>
  <div
    id={`${id}-panel`}
    class="tabs_panel"
    aria-labelledby={`${id}-${value}`}
    role="tabpanel"
  >
    {@render children()}
  </div>
</div>

<style lang="postcss">
  :global {
    .tabs {
      width: stretch;
    }

    .tabs_list {
      display: grid;
      grid-auto-columns: 1fr;
      grid-auto-flow: column;
    }

    .tabs_tab {
      @mixin clickable;

      position: relative;
      min-height: var(--control-height);
      font: var(--control-font);
      border-radius: var(--base-radius) var(--base-radius) 0 0;

      &&[aria-selected='true'] {
        cursor: default;

        &::after {
          position: absolute;
          inset: auto var(--control-padding) 0 var(--control-padding);
          height: 0.1875rem;
          content: '';
          background: var(--text-color);
          border-radius: 0.1875rem 0.1875rem 0 0;
        }
      }

      &:not([aria-selected='true']) {
        color: var(--secondary-text-color);

        &:hover,
        &:active,
        &:focus-visible {
          color: var(--text-color);
          background: --tune-background(--flat-button --flat-button-hover);
        }

        &:active {
          box-shadow: var(--pressed-shadow);
        }
      }
    }

    .tabs_cap {
      box-sizing: border-box;
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 0.4rem var(--control-padding);
      overflow-wrap: anywhere;

      .tabs_tab:not([aria-selected='true']):active & {
        translate: 0 1px;
      }
    }

    .tabs_icon {
      display: contents;

      .tabs_list.is-iconless & {
        display: none;
      }
    }

    .tabs_name {
      flex-shrink: 1;
    }

    .tabs_panel {
      padding: var(--page-padding) var(--popup-padding) 0 var(--popup-padding);
      margin-inline: calc(-1 * var(--popup-padding));
      border-top: var(--min-size) solid var(--border-color);
    }
  }
</style>
