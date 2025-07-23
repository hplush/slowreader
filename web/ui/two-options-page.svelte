<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    one,
    paddingTwo = true,
    title,
    two
  }: {
    one: Snippet
    paddingTwo?: boolean
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
      <div bind:this={first} class="two-options-page_option is-padding">
        {@render one()}
      </div>
      <div class="two-options-page_option" class:is-padding={paddingTwo}>
        {@render two()}
      </div>
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

      @media (width <= 41rem) {
        align-items: flex-end;
      }
    }

    .two-options-page_center {
      box-sizing: border-box;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      justify-content: center;
      height: var(--two-options-page-height, auto);

      @media (width <= 41rem) {
        flex-direction: column-reverse;
        gap: 0.5rem;
        height: auto;
      }
    }

    .two-options-page_option {
      width: 18rem;
      max-width: 100%;
      padding: 0 1rem 1rem;
      margin: 0.5rem 0;

      &:first-child {
        --current-background: var(--main-land-color);

        background: var(--main-land-color);
        border-radius: calc(1rem + var(--base-radius));
      }

      &.is-padding {
        padding-top: 1rem;
      }

      @media (width <= 41rem) {
        margin: 0;

        &:first-child {
          margin-bottom: 1rem;
        }
      }
    }
  }
</style>
