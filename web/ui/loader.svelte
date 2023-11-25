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

<style global>
  .loader {
    position: relative;
    display: block;
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

  @mixin chromium-only {
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
      animation: loader-indeterminate 1.8s infinite
        cubic-bezier(0.45, 0, 0.55, 1);
    }
  }

  @mixin safari-only {
    .loader:indeterminate::-webkit-progress-value {
      transform: translateX(-50%);
      animation: loader-indeterminate 1.8s infinite
        cubic-bezier(0.45, 0, 0.55, 1);
    }
  }

  .loader:indeterminate::-moz-progress-bar {
    transform: translateX(-50%);
    animation: loader-indeterminate 1.8s infinite cubic-bezier(0.45, 0, 0.55, 1);
  }

  @keyframes loader-indeterminate {
    0% {
      width: 40px;
      margin-left: 20px;
    }

    25% {
      width: 80px;
    }

    50% {
      width: 40px;
      margin-left: calc(100% - 20px);
    }

    75% {
      width: 80px;
    }

    100% {
      width: 40px;
      margin-left: 20px;
    }
  }
</style>
