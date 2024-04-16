<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let currentPage: number
  export let totalPages: number
  export let label: string

  $: pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  let dispatch = createEventDispatcher()

  function onPageChange(page: number): void {
    dispatch('click', page)
  }
</script>

<div class="pagination-bar">
  <div class="pagination-bar_progress">
    {#each pages as page (page)}
      <button
        class="pagination-bar_segment"
        class:is-active={page === currentPage}
        class:is-past={page < currentPage}
        on:click={() => {
          onPageChange(page)
        }}
      >
      </button>
    {/each}
  </div>
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

  .pagination-bar_progress {
    display: flex;
    flex: 1;
    padding: 1px;
    background-color: var(--border-color);
    border-radius: var(--radius);
  }

  .pagination-bar_segment {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1;
    font: var(--control-font);
    color: var(--text-color);
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    background: var(--card-color);
    border: none;
    border-inline-end: 1px solid var(--border-color);
    box-shadow: var(--button-shadow);

    &:first-child {
      border-start-start-radius: var(--radius);
      border-end-start-radius: var(--radius);
    }

    &:last-child {
      border-inline-end: none;
      border-start-end-radius: var(--radius);
      border-end-end-radius: var(--radius);
    }

    &:hover,
    &:focus-visible {
      opacity: 80%;
    }

    &:active {
      background-color: var(--land-color);
      opacity: 100%;
    }

    &.is-past {
      background-color: var(--border-color);
      border-inline-end-color: var(--card-color);
    }

    &.is-active {
      z-index: 10;
      border: 2px solid var(--text-color);
      border-radius: var(--radius);
      transform: scale(1.2);
    }
  }
</style>
