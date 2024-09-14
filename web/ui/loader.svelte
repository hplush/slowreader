<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    label = $t.loading,
    margin = true,
    value,
    zoneId
  }: {
    label?: string
    margin?: boolean
    value?: number
    zoneId?: string
  } = $props()

  let progress: HTMLProgressElement | undefined

  $effect(() => {
    if (progress) {
      if (typeof value === 'number') {
        progress.value = value
      } else {
        progress.removeAttribute('value')
      }
    }
  })
</script>

<progress
  bind:this={progress}
  class="loader"
  class:is-margin={margin}
  aria-describedby={zoneId}
  aria-label={label}
>
</progress>

<style>
  :global {
    .loader {
      position: relative;
      display: block;
      width: 100%;
      max-width: 160px;
      height: 4px;
      margin: 0 auto;
      overflow: hidden;
      appearance: none;
      background: var(--border-color);
      border: none;
      border-radius: 2px;

      &.is-margin {
        margin-block: var(--padding-l);
      }
    }

    .card > .loader:last-child {
      margin-bottom: 0;
    }

    .loader::-webkit-progress-bar {
      background: transparent;
    }

    .loader::-webkit-progress-value {
      background: var(--text-color);
      border-radius: 2px;
    }

    .loader::-moz-progress-bar {
      background: var(--text-color);
      border-radius: 2px;
    }

    /* Safari only */
    @supports (background: -webkit-named-image(i)) {
      .loader:indeterminate::-webkit-progress-value {
        transform: translateX(-50%);
        animation: --indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
      }
    }

    /* Chromium only */
    @supports (not (-moz-appearance: none)) and
      (not (background: -webkit-named-image(i))) {
      .loader:indeterminate::-webkit-progress-value {
        background: transparent;
      }

      .loader:indeterminate::after {
        position: absolute;
        inset: 0;
        content: '';
        background: var(--text-color);
        border-radius: 2px;
        transform: translateX(-50%);
        animation: --indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
      }
    }

    .loader:indeterminate::-moz-progress-bar {
      transform: translateX(-50%);
      animation: --indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
    }

    @keyframes --indeterminate {
      0% {
        width: 25%;
        margin-inline-start: 12.5%;
      }

      25% {
        width: 50%;
      }

      50% {
        width: 25%;
        margin-inline-start: 87.5%;
      }

      75% {
        width: 50%;
      }

      100% {
        width: 25%;
        margin-inline-start: 12.5%;
      }
    }
  }
</style>
