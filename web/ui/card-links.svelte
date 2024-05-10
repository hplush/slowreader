<script lang="ts">
  import type { AriaRole } from 'svelte/elements'

  export let node: HTMLUListElement | null = null
  export let id: string | undefined = undefined
  export let role: AriaRole | undefined = 'listbox'

  let sub_role: AriaRole | undefined = undefined
  // move to utils/tools?
  switch (role) {
    case 'listbox':
      sub_role = 'option'
      break
    case 'menu':
    case 'menubar':
      sub_role = 'menuitem'
      break
    case 'tablist':
      sub_role = 'tab'
      break
  }
</script>

<ul bind:this={node} {id} class="card-links" {role}>
  <slot role={sub_role} />
</ul>

<style>
  .card-links {
    margin-block: var(--padding-l);
    list-style: none;
  }

  :global(.card) > .card-links:first-child {
    margin-top: calc(-1 * var(--padding-l));
  }

  :global(.card) > .card-links:last-child {
    margin-bottom: calc(-1 * var(--padding-l));
  }
</style>
