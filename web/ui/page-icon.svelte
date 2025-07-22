<script lang="ts">
  import Icon from './icon.svelte'

  let { extra, main }: { extra: string; main: string } = $props()
</script>

<div class="page-icon">
  <div class="page-icon_extra">
    <Icon path={extra} />
  </div>
  <Icon path={main} />
</div>

<style>
  :global {
    .page-icon {
      position: relative;
      width: 200px;

      --icon-size: 200px;
    }

    .page-icon_extra {
      position: absolute;
      inset-inline-start: -40%;
      top: -20%;
      z-index: 1;
      color: var(--dangerous-text-color);
    }
  }
</style>
