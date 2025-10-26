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
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 10rem;
      color: --tune-background(--placeholder);

      --icon-size: 8rem;
    }

    .page-icon_extra {
      position: absolute;
      inset-inline-start: -15%;
      top: -15%;
      z-index: 1;
      color: var(--fire2-color);

      --icon-size: 6rem;
    }
  }
</style>
