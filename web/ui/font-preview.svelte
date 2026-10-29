<script lang="ts">
  let { text, title }: { text: string; title: string } = $props()
</script>

<div class="font-preview">
  <div class="font-preview_title">{title}</div>
  <p class="font-preview_text">{text}</p>
</div>

<style lang="postcss">
  :global {
    .font-preview {
      @mixin background var(--main-land-color);

      padding: 0.5rem var(--control-padding) 0.7rem var(--control-padding);
      border-radius: var(--base-radius);
      box-shadow: var(--flat-control-shadow);
    }

    .font-preview_title {
      font: var(--post-card-title-font);
    }

    .font-preview_text {
      margin: 0.25rem 0 0 0;
      font: var(--post-text-font);
    }
  }
</style>
