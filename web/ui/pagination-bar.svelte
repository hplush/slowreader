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

<div class="pagination-bar">
  <input
    id="pagination"
    name="pagination"
    class="pagination-bar_input"
    max={totalPages}
    min="1"
    type="range"
    value={currentPage}
    on:change={onChange}
  />
  <label for="pagination">{label}</label>
</div>

<style>
  .pagination-bar {
    display: flex;
    gap: var(--padding-l);
    width: 100%;
    padding-top: var(--padding-l);
    padding-bottom: var(--padding-l);
  }

  .pagination-bar_input {
    flex: 1;
  }
</style>
