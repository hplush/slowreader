<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    one,
    title,
    two
  }: {
    one: Snippet
    title: string
    two: Snippet
  } = $props()

  let first: HTMLDivElement | undefined
  let center: HTMLDivElement | undefined

  $effect(() => {
    if (first && center) {
      center.style.setProperty(
        '--two-options-page-height',
        `${first.offsetHeight}px`
      )
    }
  })
</script>

<Page {title}>
  <div class="two-options-page">
    <div bind:this={center} class="two-options-page_center">
      <div bind:this={first} class="two-options-page_option">
        {@render one()}
      </div>
      <div class="two-options-page_option">{@render two()}</div>
    </div>
  </div>
</Page>

<style>
  :global {
    .two-options-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100svh;

      @media (width <= 630px) {
        align-items: flex-end;
      }
    }

    .two-options-page_center {
      box-sizing: border-box;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      justify-content: center;
      height: var(--two-options-page-height, auto);

      @media (width <= 630px) {
        flex-direction: column-reverse;
        gap: 8px;
        height: auto;
      }
    }

    .two-options-page_option {
      width: var(--thin-page-width);
      max-width: 100%;
      padding: 16px;
      margin: 8px 0;

      &:first-child {
        --current-background: var(--main-land-color);

        background: var(--main-land-color);
        border-radius: calc(16px + var(--button-radius));
      }

      @media (width <= 630px) {
        margin: 0;

        &:first-child {
          margin-bottom: 16px;
        }
      }
    }
  }
</style>
