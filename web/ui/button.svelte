<button class="button"><slot /></button>

<style>
  .button {
    height: var(--control-height);
    padding: 0 var(--padding-l);
    font-weight: 600;
    background: var(--card-color);
    border: none;
    border-radius: var(--inner-radius);
    box-shadow: var(--button-shadow);

    &:hover,
    &:focus-visible,
    &:active {
      background: var(--hover-color);
    }

    &:active {
      line-height: calc(var(--control-height) + 2px);
      box-shadow: var(--button-active-shadow);
    }
  }
</style>
