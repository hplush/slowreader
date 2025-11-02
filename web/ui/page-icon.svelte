<script lang="ts">
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'

  let {
    children,
    extra,
    path
  }: { children?: Snippet; extra?: string; path: string } = $props()
</script>

<div class="page-icon">
  <div class="page-icon_position">
    {#if extra}
      <div class="page-icon_extra">
        <Icon path={extra} />
      </div>
    {/if}
    <Icon {path} />
  </div>
  {#if children}
    <div class="page-icon_text">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  :global {
    .page-icon {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 10rem;
      min-height: 40vh;
      color: --tune-background(--placeholder);

      --icon-size: 10rem;
    }

    .page-icon_position {
      position: relative;
    }

    .page-icon_extra {
      position: absolute;
      inset-inline-start: -15%;
      top: -15%;
      z-index: 1;
      color: var(--fire2-color);

      --icon-size: 6rem;
    }

    .page-icon_text {
      width: 18rem;
      margin-top: 1rem;
      color: var(--secondary-text-color);
    }
  }
</style>
