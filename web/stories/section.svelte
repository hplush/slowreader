<script lang="ts">
  export let height: number | undefined = undefined
  export let width: number | undefined = undefined
</script>

<section
  style=" width: {width}px;height: {height}px"
  class:is-sized={width !== undefined || height !== undefined}
>
  <slot />
</section>

<style>
  section {
    position: relative;
    margin-top: 1rem;

    &:first-child {
      margin-top: 0;
    }

    &.is-sized {
      margin-inline: auto;
      outline: 1px solid var(--zone-color);
    }
  }
</style>
