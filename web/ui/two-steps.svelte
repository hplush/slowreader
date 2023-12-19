<div class="two-steps">
  <div class="two-steps_step">
    <slot name="one" />
  </div>
  <div class="two-steps_step">
    <slot name="two" />
  </div>
</div>

<style>
  .two-steps {
    box-sizing: border-box;
    display: flex;
    gap: var(--padding-l);
    justify-content: center;
    width: 100%;
    min-height: 100%;
    padding: var(--padding-m) 0;
  }

  .two-steps_step {
    width: 50%;
    max-width: 600px;
    min-height: 100%;
  }
</style>
