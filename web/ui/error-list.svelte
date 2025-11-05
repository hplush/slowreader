<script lang="ts">
  type ErrorItem = { errorText: string; title: string; url: string }

  let { list }: { list: ErrorItem[] } = $props()
</script>

<ul class="error-list">
  {#each list as item (item.url)}
    <li class="error-list_item">
      <a class="error-list_link" href={item.url}>
        {item.title}
      </a>
      <div class="error-list_text">
        {item.errorText}
      </div>
    </li>
  {/each}
</ul>

<style lang="postcss">
  :global {
    .error-list {
      width: stretch;
      list-style: none;
      border: 0.125rem solid --tune-background(--note);
      border-radius: var(--base-radius);

      @mixin background var(--note-dangerous-background);
    }

    .error-list_item {
      &:not(:first-child) {
        border-top: 0.125rem solid --tune-background(--note);
      }
    }

    .error-list_link {
      display: block;
      padding: 0.625rem var(--control-padding) 0 var(--control-padding);
      font: var(--control-secondary-font);
      color: currentcolor;
      overflow-wrap: anywhere;
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        text-decoration: none;
      }

      &:active {
        translate: 0 1px;
      }
    }

    .error-list_text {
      padding: 0 var(--control-padding) 0.625rem var(--control-padding);
    }
  }
</style>
