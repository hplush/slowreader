<script lang="ts">
  import { mdiChevronDown } from '@mdi/js'
  import type { Snippet } from 'svelte'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'

  let {
    actions,
    children,
    compact = false,
    disabled = false,
    hint,
    id,
    onexpand,
    ontoggle,
    open,
    short,
    title
  }: {
    actions?: Snippet<[string]>
    children: Snippet
    compact?: boolean
    disabled?: boolean
    hint: string
    id: string
    onexpand: () => void
    ontoggle: () => void
    open: boolean
    short: string
    title: string
  } = $props()

  let locked = $derived(disabled && !(compact && actions))
</script>

<div class="foldable" class:is-open={open}>
  <div class="foldable_header">
    <Clickable
      class="foldable_button"
      aria-controls={disabled ? undefined : id}
      aria-expanded={open}
      disabled={locked}
      onclick={(e: MouseEvent) => {
        // Only for mouse click, space/Enter we will handle below
        if (e.detail) ontoggle()
      }}
      onkeydown={(e: KeyboardEvent) => {
        if (locked) return
        if (e.key === 'Enter') {
          // KeyUX moves focus into the list on Enter, so it only opens
          onexpand()
        } else if (e.key === ' ') {
          ontoggle()
        }
      }}
      role="menuitem"
    >
      <span class="foldable_icon">
        <Icon path={mdiChevronDown} />
      </span>
      <span id={`${id}-title`} class="foldable_title">{title}</span>
      <span class="foldable_hint" aria-hidden="true">{short}</span>
      <span class="sr-only">{hint}</span>
    </Clickable>
    {#if !compact}
      {@render actions?.(`${id}-title`)}
    {/if}
  </div>
  {#if open}
    {#if compact && actions}
      <div class="foldable_actions">
        {@render actions(`${id}-title`)}
      </div>
    {/if}
    {#if !disabled}
      <div {id} class="foldable_content">
        {@render children()}
      </div>
    {/if}
  {/if}
</div>

<style lang="postcss">
  :global {
    .foldable {
      width: stretch;

      &.is-open {
        padding-bottom: 1rem;
      }
    }

    .foldable_header {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .foldable_button {
      @mixin clickable;

      display: flex;
      flex: 1 1 0;
      gap: 0.5rem;
      align-items: baseline;
      min-width: 0;
      padding: 0.25rem 0.5rem 0.25rem 0.25rem;
      margin-inline-start: -0.25rem;
      text-align: start;
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        background: --tune-background(--flat-button);
      }

      &:active {
        box-shadow: var(--pressed-shadow);
      }
    }

    .foldable_icon {
      align-self: center;
      width: var(--icon-size);
      height: var(--icon-size);
      rotate: -90deg;
      transition: rotate var(--simple-time);

      .foldable.is-open & {
        rotate: none;
      }

      .foldable_button:active & {
        translate: 0 1px;
      }

      .foldable_button[aria-disabled='true'] & {
        visibility: hidden;
      }
    }

    .foldable_title {
      flex-shrink: 1;
      min-width: 0;
      font: var(--app-title-font);
      overflow-wrap: anywhere;

      .foldable_button:active & {
        translate: 0 1px;
      }
    }

    .foldable_hint {
      flex-shrink: 0;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      white-space: nowrap;

      .foldable_button:active & {
        translate: 0 1px;
      }
    }

    .foldable_actions {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.125rem;
    }

    .foldable_content {
      margin-top: 0.5rem;

      .foldable_actions + & {
        margin-top: 0.375rem;
      }
    }
  }
</style>
