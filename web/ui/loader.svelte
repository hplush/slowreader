<script lang="ts">
  import { commonMessages as t } from '@slowreader/core/messages'

  export let label: string = $t.loading
  export let zoneId: string | undefined = undefined
  export let value: number | undefined = undefined

  let progress: HTMLProgressElement | undefined

  $: if (progress) {
    if (typeof value === 'number') {
      progress.value = value
    } else {
      progress.removeAttribute('value')
    }
  }
</script>

<progress
  bind:this={progress}
  class="loader"
  aria-describedby={zoneId}
  aria-label={label}
>
</progress>

<style>
  .loader {
    position: relative;
    display: block;
    max-width: 100%;
    height: 4px;
    margin: 0 auto;
    overflow: hidden;
    appearance: none;
    background: var(--zone-color);
    border: none;
    border-radius: 2px;
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
      animation: indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
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
      animation: indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
    }
  }

  .loader:indeterminate::-moz-progress-bar {
    transform: translateX(-50%);
    animation: indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
  }

  @keyframes indeterminate {
    0% {
      width: 25%;
      margin-left: 12.5%;
    }

    25% {
      width: 50%;
    }

    50% {
      width: 25%;
      margin-left: 87.5%;
    }

    75% {
      width: 50%;
    }

    100% {
      width: 25%;
      margin-left: 12.5%;
    }
  }
</style>
