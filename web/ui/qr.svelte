<script lang="ts">
  import Loader from './loader.svelte'

  let {
    hint,
    label,
    path,
    text
  }: {
    hint: string
    label: string
    path: string
    text: string | undefined
  } = $props()

  let code = $state<{ path: string; size: number; text: string }>()

  $effect(() => {
    let current = text
    if (!current) return
    void import('qr').then(({ encodeQR }) => {
      // Scanners need 4 empty modules around the code
      let rows = encodeQR(current, 'raw', { border: 4 })
      code = {
        path: rows
          .map((row, y) => {
            return row
              .map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))
              .join('')
          })
          .join(''),
        size: rows.length,
        text: current
      }
    })
  })
</script>

<div class="qr">
  <div class="qr_box">
    {#if code && code.text === text}
      <svg
        class="qr_code"
        aria-label={label}
        role="img"
        viewBox="0 0 {code.size} {code.size}"
      >
        <path d={code.path} />
      </svg>
    {:else}
      <Loader />
    {/if}
  </div>
  <p class="qr_hint">{hint}<br /><strong>{path}</strong></p>
</div>

<style>
  :global {
    .qr {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      max-width: 22rem;
    }

    .qr_hint {
      text-align: center;
    }

    .qr_box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 15rem;
      max-width: 100%;
      aspect-ratio: 1;
      background: var(--qr-background);
      border-radius: var(--base-radius);
    }

    .qr_code {
      width: 100%;
      height: 100%;
      fill: var(--qr-color);
    }
  }
</style>
