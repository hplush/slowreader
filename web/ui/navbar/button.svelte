<script lang="ts">
  export let swicther: boolean = false
  export let current: boolean = false
  export let slow: boolean = false
  export let href: string | undefined = undefined
</script>

{#if href}
  <a
    class:is-switcher={swicther}
    class:is-slow={slow}
    {href}
    aria-current={current ? 'page' : null}
  >
    <div><slot /></div>
  </a>
{:else}
  <button>
    <div><slot /></div>
  </button>
{/if}

<style>
  button,
  a {
    box-sizing: border-box;
    display: inline-flex;
    height: 100%;
    padding: 4px;
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    border-radius: 0;
  }

  div {
    display: flex;
    align-items: center;
    padding: 0 16px;
    border: 1px solid var(--navbar-border);
    border-radius: 8px;
  }

  a.is-slow div {
    background: var(--reading-background);
  }

  a.is-switcher:first-child {
    padding-right: 0;
  }

  a.is-switcher:first-child div {
    border-right: none;
    border-radius: 4px 0 0 4px;
  }

  a.is-switcher:last-child {
    padding-left: 0;
  }

  a.is-switcher:last-child div {
    border-radius: 0 4px 4px 0;
  }
</style>
