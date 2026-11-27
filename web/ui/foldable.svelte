<script lang="ts">
  import { mdiChevronDown } from '@mdi/js'
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'

  let {
    actions,
    children,
    disabled = false,
    hint,
    id,
    onexpand,
    ontoggle,
    open,
    short,
    title,
    ...attachments
  }: {
    [attachment: symbol]: Attachment<HTMLDivElement> | false
    actions: Snippet<[string]>
    children: Snippet
    disabled?: boolean
    hint: string
    id: string
    onexpand: () => void
    ontoggle: () => void
    open: boolean
    short: string
    title: string
  } = $props()
</script>

<div class="foldable" class:is-open={open && !disabled} {...attachments}>
  <div class="foldable_header">
    <Clickable
      class="foldable_button"
      aria-controls={disabled ? undefined : id}
      aria-expanded={open}
      {disabled}
      onclick={(e: MouseEvent) => {
        // Only for mouse click, space/Enter we will handle below
        if (e.detail) ontoggle()
      }}
      onkeydown={(e: KeyboardEvent) => {
        if (disabled) return
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
    {@render actions(`${id}-title`)}
  </div>
  {#if open && !disabled}
    <div {id} class="foldable_content">
      {@render children()}
    </div>
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
      gap: 0.25rem;
      align-items: center;
    }

    .foldable_button {
      @mixin clickable;

      display: flex;
      flex: 1 1 0;
      gap: 0.5rem;
      align-items: baseline;
      min-width: 0;
      padding: max(0rem, (var(--control-height) - 1lh) / 2) 0.5rem
        max(0rem, (var(--control-height) - 1lh) / 2) 0.25rem;
      margin-inline-start: -0.25rem;
      font: var(--secondary-title-font);
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

    .foldable_content {
      margin-top: 0.375rem;
    }
  }
</style>
