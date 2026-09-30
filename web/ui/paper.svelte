<script lang="ts">
  let { lines }: { lines: { label: string; value: string }[] } = $props()
</script>

<div class="paper">
  <div class="is-light-theme">
    {#each lines as line (line.label)}
      <div class="paper_line">
        <span class="paper_label" aria-hidden="true">{line.label}:</span>
        <div
          class="paper_value"
          aria-label={line.label}
          aria-readonly="true"
          onfocus={e => {
            getSelection()?.selectAllChildren(e.currentTarget)
          }}
          role="textbox"
          tabindex="0"
        >
          {line.value}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  :global {
    .paper {
      margin: 0.25rem 0 0.5rem 0;
      padding: 0.5rem 0;
      background: var(--paper-background);
      border-radius: 2px;
      box-shadow: var(--float-box-shadow);
    }

    .paper_line {
      display: flex;
      gap: 0.5rem;
      padding: 0.3rem 1rem;
      font: var(--handwritten-font);
      line-height: 1.5;
      color: var(--text-color);
    }

    .paper_label {
      flex-shrink: 0;
    }

    .paper_value {
      position: relative;
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
      letter-spacing: 0.05em;
      border-radius: 2px;

      &:focus {
        z-index: 1;
      }
    }
  }
</style>
