<script lang="ts">
  export let compact = false
</script>

<div class="row" class:is-compact={compact}>
  <slot />
</div>

<style>
  .row {
    display: flex;
    gap: var(--padding-l);
    align-items: center;

    &.is-compact {
      gap: var(--padding-m);
    }
  }
</style>
