<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let currentPage: number
  export let totalPages: number
  export let label: string

  let dispatch = createEventDispatcher()

  function onChange(e: { currentTarget: HTMLInputElement } & Event): void {
    dispatch('change', e.currentTarget.value)
  }
</script>

<div class="pagination">
  <input
    class="pagination-bar"
    id="pagination"
    max={totalPages}
    min="1"
    name="pagination"
    type="range"
    value={currentPage}
    on:change={onChange}
  />
  <label for="pagination">{label}</label>
</div>

<style>
  .pagination {
    display: flex;
    gap: var(--padding-l);
    width: 100%;
    padding-top: var(--padding-l);
    padding-bottom: var(--padding-l);
  }

  .pagination-bar {
    flex: 1;
  }
</style>
