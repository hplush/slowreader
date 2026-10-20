<script lang="ts">
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'
  import Label from './label.svelte'

  let {
    children,
    icon,
    label
  }: { children: Snippet; icon?: string; label?: string } = $props()
</script>

<div class="status" class:is-labeled={!!label}>
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
    }
  }
</style>
