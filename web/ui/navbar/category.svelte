<script lang="ts">
  export let name: string
</script>

<div class="navbar-category">{name}</div>

<style>
  .navbar-category {
    padding: var(--padding-m) var(--padding-l) 0 var(--padding-l);
    font: var(--secondary-font);
    color: var(--secondary-text-color);

    &:first-child {
      padding-top: 0;
    }
  }
</style>
