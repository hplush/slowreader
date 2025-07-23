<script lang="ts">
  let { lines }: { lines: string[] } = $props()
</script>

<div class="paper is-light-theme">
  {#each lines as line, index (index)}
    <input
      class="paper_line"
      onfocus={e => {
        e.currentTarget.select()
      }}
      readonly
      type="text"
      value={line}
    />
  {/each}
</div>

<style>
  :global {
    .paper {
      padding: 0.5rem 0;
      background: var(--paper-background);
      border-radius: 2px;
      box-shadow: var(--float-shadow);
    }

    .paper_line {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      padding: 0.3rem 1rem;
      font: var(--handwritten-font);
      color: var(--text-color);
      background: transparent;
      border: none;
      border-radius: 2px;

      &:focus {
        z-index: 1;
      }
    }
  }
</style>
