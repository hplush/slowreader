<script lang="ts">
  import PageIcon from './page-icon.svelte'

  let { icon, text }: { icon: string; text: string } = $props()
</script>

<div class="placeholder">
  <PageIcon path={icon} />
  <div class="placeholder_text">{text}</div>
</div>

<style>
  :global {
    .placeholder {
      --icon-size: 10rem;

      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      margin: 1rem auto;
      color: --tune-background(--placeholder);
    }

    .placeholder_text {
      width: 18rem;
      color: var(--secondary-text-color);
    }
  }
</style>
