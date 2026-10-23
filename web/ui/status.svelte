<script lang="ts">
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'
  import Label from './label.svelte'

  let {
    children,
    icon,
    joined,
    label
  }: {
    children: Snippet
    icon?: string
    joined?: 'end' | 'middle' | 'start'
    label?: string
  } = $props()
</script>

<div
  class="status"
  class:is-joined-end={joined === 'end'}
  class:is-joined-middle={joined === 'middle'}
  class:is-joined-start={joined === 'start'}
  class:is-labeled={!!label}
>
  {#if label}
    <Label tag="div">{label}</Label>
  {/if}
  <div class="status_value">
    {#if icon}
      <Icon path={icon} />
    {/if}
    {@render children()}
  </div>
</div>

<style lang="postcss">
  :global {
    .status {
      flex-shrink: 1;
      width: stretch;
    }

    .status_value {
      box-sizing: border-box;
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      min-height: var(--control-height);
      padding: 0.4rem var(--control-padding);
      font: var(--control-font);
      border-radius: var(--base-radius);
      box-shadow: var(--flat-control-shadow);

      .status.is-labeled & {
        justify-content: flex-start;
      }

      .status.is-joined-start & {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }

      .status.is-joined-middle & {
        border-radius: 0;
      }

      .status.is-joined-end & {
        border-start-start-radius: 0;
        border-end-start-radius: 0;
      }
    }
  }
</style>
