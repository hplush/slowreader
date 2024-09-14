<div class="busy"></div>

<style>
  :global {
    .busy {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      &:active {
        background: var(--hover-color);
      }

      & + & {
        background: rgba(0, 0, 0, 0.5);
      }
    }
  }
</style>
