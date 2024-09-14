<script lang="ts">
  let { name }: { name: string } = $props()
</script>

<div class="navbar-category">{name}</div>

<style>
  :global {
    .navbar-category {
      padding: var(--padding-m) 13px 0 13px;
      font: var(--secondary-font);
      color: var(--secondary-text-color);

      &:first-child {
        padding-top: 0;
      }
    }
  }
</style>
