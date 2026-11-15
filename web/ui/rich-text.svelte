<script lang="ts">
  import { parseRichTranslation } from '@slowreader/core'

  let {
    secondary = false,
    text,
    url
  }: { secondary?: boolean; text: string; url?: string } = $props()
</script>

<div class="rich-text" class:is-secondary={secondary}>
  {@html parseRichTranslation(text, url)}
</div>

<style>
  :global {
    .rich-text.is-secondary {
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }

    .rich-text p {
      padding-top: 0.5rem;

      &:first-child {
        padding-top: 0;
      }
    }

    .rich-text a {
      color: currentcolor;

      &:hover {
        text-decoration: none;
      }
    }
  }
</style>
