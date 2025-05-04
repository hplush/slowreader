<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    label = $t.loading,
    value,
    zoneId
  }: {
    label?: string
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
      height: 6px;
      margin: 0 auto;
      overflow: hidden;
      appearance: none;
      background: var(--border-color);
      border: none;
      border-radius: 3px;
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
        animation: --loader-bouncing 1.8s infinite
          cubic-bezier(0.45, 0, 0.55, 1);
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
        animation: --loader-bouncing 1.8s infinite
          cubic-bezier(0.45, 0, 0.55, 1);
      }
    }

    .loader:indeterminate::-moz-progress-bar {
      transform: translateX(-50%);
      animation: --loader-bouncing 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
    }

    @keyframes --loader-bouncing {
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
