<span class="app-icon">
  <img
    class="app-icon_image"
    alt=""
    height="96"
    src="/icon-192.png"
    width="96"
  />
</span>

<style>
  :global {
    .app-icon {
      position: relative;
      display: inline-block;
      border-radius: 22.5%;
    }

    .app-icon::after {
      position: absolute;
      inset: 0;
      content: '';
      border-radius: inherit;
      box-shadow: var(--app-icon-shadow);
    }

    .app-icon_image {
      display: block;
      border-radius: inherit;
    }
  }
</style>
