<script lang="ts">
  import { mdiAlertOutline } from '@mdi/js'
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'

  let {
    children,
    hint,
    id = null,
    tag = 'label',
    warning
  }: {
    children: Snippet
    hint?: string
    id?: null | string
    tag?: 'div' | 'h2' | 'label' | 'legend'
    warning?: string
  } = $props()
</script>

<svelte:element this={tag} class="label" class:is-hinted={!!hint} for={id}>
  {@render children()}
  {#if hint}
    <span class="label_hint" class:is-warning={!!warning} title={warning}>
      {#if warning}
        <span class="label_warning">
          <Icon path={mdiAlertOutline} />
          <span class="sr-only">{warning}</span>
        </span>
      {/if}
      {hint}
    </span>
  {/if}
</svelte:element>

<style>
  :global {
    .label {
      padding-inline-start: var(--control-padding);
      padding-bottom: 0.25rem;
      font: var(--control-secondary-font);

      &.is-hinted {
        display: flex;
        flex-wrap: wrap;
        column-gap: 1rem;
        align-items: baseline;
        align-self: stretch;
        justify-content: space-between;
        padding-inline-end: var(--control-padding);
      }
    }

    .label_hint {
      display: inline-flex;
      gap: 0.25rem;
      align-items: baseline;
      margin-inline-start: auto;
      color: var(--secondary-text-color);

      &.is-warning {
        color: var(--warning-text-color);
      }
    }

    .label_warning {
      --icon-size: 1rem;

      display: flex;
      align-self: center;
    }
  }
</style>
