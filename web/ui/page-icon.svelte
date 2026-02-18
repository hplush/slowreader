<script lang="ts">
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'

  let {
    align = 'center',
    children,
    extra,
    padding = true,
    path
  }: {
    align?: 'center' | 'start'
    children?: Snippet
    extra?: string
    padding?: boolean
    path: string
  } = $props()
</script>

<div class="page-icon" class:is-padding={padding}>
  <div class="page-icon_position">
    {#if extra}
      <div class="page-icon_extra">
        <Icon path={extra} />
      </div>
    {/if}
    <Icon {path} />
  </div>
  {#if children}
    <div class="page-icon_text" class:is-center={align === 'center'}>
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
      min-width: 10rem;
      color: --tune-background(--placeholder);

      &.is-padding {
        margin-top: 10vh;
      }
    }

    .page-icon_position {
      position: relative;

      --icon-size: 10rem;
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

      &.is-center {
        text-align: center;
      }
    }
  }
</style>
