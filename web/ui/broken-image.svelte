<script lang="ts">
  import { mdiImageOffOutline } from '@mdi/js'

  import Icon from './icon.svelte'

  let { alt }: { alt?: null | string } = $props()
</script>

<span
  class="broken-image"
  aria-label={alt || undefined}
  role={alt ? 'img' : undefined}
  title={alt || undefined}
>
  <Icon path={mdiImageOffOutline} />
</span>

<style>
  :global {
    .broken-image {
      --icon-size: min(1.5rem, 66cqmin);

      container-type: size;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: var(--secondary-text-color);
      background: --tune-background(--image-placeholder);
    }
  }
</style>
