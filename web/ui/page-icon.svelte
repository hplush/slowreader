<script lang="ts">
  import Icon from './icon.svelte'

  let { extra, path }: { extra?: string; path: string } = $props()
</script>

<div class="page-icon">
  {#if extra}
    <div class="page-icon_extra">
      <Icon path={extra} />
    </div>
  {/if}
  <Icon {path} />
</div>

<style>
  :global {
    .page-icon {
      position: relative;
      width: 10rem;
      color: --tune-background(--placeholder);

      --icon-size: 10rem;
    }

    .page-icon_extra {
      position: absolute;
      inset-inline-start: -40%;
      top: -20%;
      z-index: 1;
      color: var(--dangerous-text-color);

      --icon-size: 8rem;
    }
  }
</style>
