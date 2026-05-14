<script lang="ts">
  import {
    mdiBug,
    mdiEye,
    mdiShieldSearch,
    mdiAccountGroup,
    mdiChevronLeft,
    mdiClose
  } from '@mdi/js'
  import {
    type AboutPage,
    settingsMessages,
    aboutMessages as t,
    layoutType
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: AboutPage } = $props()
  let { credits, showCredits } = $derived(page)

  $effect(() => {
    if ($showCredits) {
      function handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
          page.toggleCredits()
        }
      }
      window.addEventListener('keydown', handleKeydown)
      return () => {
        window.removeEventListener('keydown', handleKeydown)
      }
    }
  })
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    <Title>{$t.slowReader}</Title>
    <Output label={$t.version} value={page.appVersion} />
    <Note icon={mdiShieldSearch} variant="good">
      <Stack>
        {$t.opensource}
        <Button
          href="https://github.com/hplush/slowreader"
          icon={mdiEye}
          size="wide"
          target="_blank"
          variant="secondary"
        >
          {$t.viewSources}
        </Button>
      </Stack>
    </Note>
    <Button
      href="https://github.com/hplush/slowreader/issues/new"
      icon={mdiBug}
      size="wide"
      target="_blank"
      variant="secondary"
    >
      {$t.reportIssue}
    </Button>
    <Button
      size="wide"
      icon={mdiAccountGroup}
      onclick={page.toggleCredits}
      variant="secondary">{$t.credits}</Button
    >
  </Stack>
</ThinPage>

{#if $showCredits}
  <div class="credits_overlay" role="dialog" aria-modal="true">
    <div class="credits_close">
      <Button
        icon={$layoutType !== 'desktop' ? mdiChevronLeft : mdiClose}
        onclick={page.toggleCredits}
        size="icon"
        variant="plain"
      >
        {$t.closeCredits}
      </Button>
    </div>

    <div class="credits_content">
      <div class="credits_scroll">
        <div class="credits_list">
          <h2 class="credits_title">{$t.slowReader}</h2>

          <section class="credits_section">
            <h3>{$t.companies}</h3>
            <div class="credit_item">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="75"
                height="75"
                fill="none"
                viewBox="0 0 300 300"
                aria-hidden="true"
                class="HeaderLogo-module--logo--7060a HeaderLogo-module--monochrome--5dd53"
                ><g fill="currentColor"
                  ><path
                    d="M4 266a14.002 14.002 0 0 0 14 14h8v-7h-8a6 6 0 0 1-6-6v-12h12v-7H12v-9h14v-7H4v34zm40 1a6.002 6.002 0 0 1-6 6h-2v-41h-8v48h10a14.002 14.002 0 0 0 14-14v-34h-8v35zm18-35h-8v48h8v-48zm10 0h-8v48h20v-7H72v-41zm42 5.24a13.172 13.172 0 0 0-10-5.24H94v48h8v-41h2c1.591 0 3.117.632 4.243 1.757A6.003 6.003 0 0 1 110 245v35h8v-35c0-1.591.632-3.117 1.757-4.243A6.003 6.003 0 0 1 124 239h2v41h8v-48h-10a13.176 13.176 0 0 0-10 5.24zm22 8.76v34h8v-17h8v17h8v-48h-10a13.996 13.996 0 0 0-9.899 4.101A13.996 13.996 0 0 0 136 246zm16 10h-8v-11c0-1.591.632-3.117 1.757-4.243A6.003 6.003 0 0 1 150 239h2v17zm20-24h-10v48h8v-17h2c1.591 0 3.117.632 4.243 1.757A6.003 6.003 0 0 1 178 269v11h8v-10a12.401 12.401 0 0 0-5.54-10.5A12.401 12.401 0 0 0 186 249v-3c0-3.713-1.475-7.274-4.101-9.899A13.996 13.996 0 0 0 172 232zm6 18a6.003 6.003 0 0 1-1.757 4.243A6.003 6.003 0 0 1 172 256h-2v-17h2c1.591 0 3.117.632 4.243 1.757A6.003 6.003 0 0 1 178 245v5zm10-11h6v41h8v-41h6v-7h-20v7zm30-7h-8v48h8v-48zm2 14v34h8v-16h8v16h8v-48h-10a13.996 13.996 0 0 0-9.899 4.101A13.996 13.996 0 0 0 220 246zm16 11h-8v-12c0-1.591.632-3.117 1.757-4.243A6.003 6.003 0 0 1 234 239h2v18zm26-19.36a15.64 15.64 0 0 0-12-5.64h-4v48h8v-39.35c4.12 1.71 8 6.53 8 11.35v28h8v-48h-8v5.64zM296 248v-4c0-9-4.28-13-12-13s-12 5.28-12 13c0 15 16 15.06 16 24v1c0 3-1 5-4 5s-4-2-4-5v-5h-8v4c0 9.08 4.28 13 12 13s12-5.28 12-13c0-14.94-16-15-16-24v-1c0-3 1-5 4-5s4 2 4 5v5h8zM100 100v28h47.7l-11.58-9.27 14.2-4.73-14.2-4.73L147.7 100H100zM48 72a6 6 0 0 0 3.333-1.011 6 6 0 0 0 2.21-2.693 6 6 0 0 0 .342-3.467 6 6 0 0 0-1.642-3.072 6 6 0 0 0-3.073-1.642 6 6 0 0 0-3.466.342 6 6 0 0 0-2.693 2.21A6 6 0 0 0 42 66a6 6 0 0 0 6 6zm0-10a4 4 0 0 1 2.222.674 4 4 0 0 1 1.473 1.795 4 4 0 0 1 .228 2.311 4 4 0 0 1-1.095 2.048 4 4 0 0 1-2.048 1.095 3.999 3.999 0 0 1-2.31-.227 4 4 0 0 1-1.796-1.474A4 4 0 0 1 44 66a4 4 0 0 1 1.172-2.828A4 4 0 0 1 48 62zm24 10a6 6 0 0 0 3.333-1.011 6 6 0 0 0 2.21-2.693 6 6 0 0 0 .342-3.467 6 6 0 0 0-1.642-3.072 6 6 0 0 0-3.072-1.642 6 6 0 0 0-3.467.342 6 6 0 0 0-2.693 2.21A6 6 0 0 0 66 66a6 6 0 0 0 6 6zm0-10a4 4 0 0 1 2.222.674 4 4 0 0 1 1.474 1.795 4 4 0 0 1 .227 2.311 4 4 0 0 1-1.095 2.048 4 4 0 0 1-2.048 1.095 3.999 3.999 0 0 1-2.31-.227 4 4 0 0 1-1.796-1.474A4 4 0 0 1 68 66a4 4 0 0 1 1.172-2.828A4 4 0 0 1 72 62z"
                  ></path><path
                    d="M136.12 141.27 147.7 132H96v-32h-2l-4-8-4 8h-4l-4-8-4 8h-4l-4-8-4 8h-4l-4-8-4 8h-4l-4-8-3.09 6.17a8 8 0 0 1-2.622-4.052 8 8 0 0 1 .185-4.822 8 8 0 0 1 2.926-3.839 8 8 0 0 1 4.6-1.457l4 8 4-8h4l4 8 4-8h4l4 8 4-8h4l4 8 4-8h8V48c0-6.75-1.72-12.22-5-16.22l5.29-5.29A10.61 10.61 0 0 0 102 28a2 2 0 0 0 1.414-3.414A2 2 0 0 0 102 24c-3.81 0-6-2.19-6-6a2 2 0 0 0-.586-1.414A2 2 0 0 0 92 18a10.61 10.61 0 0 0 1.51 5.66L88.22 29c-4-3.28-9.47-5-16.22-5H48c-6.75 0-12.22 1.72-16.22 5l-5.29-5.29A10.61 10.61 0 0 0 28 18a2 2 0 0 0-.586-1.414A2 2 0 0 0 24 18c0 3.81-2.19 6-6 6a2 2 0 0 0-1.414.586A2 2 0 0 0 18 28a10.61 10.61 0 0 0 5.66-1.51L29 31.78c-3.28 4-5 9.47-5 16.22v34.82L3.88 94l18 10-18 10 18 10-18 10 18 10-18 10L24 165.18V172a3.998 3.998 0 0 1-4 4H4v42.83L18.83 204H24a27.914 27.914 0 0 0 14.975-4.323A27.915 27.915 0 0 0 49.3 188H88a3.997 3.997 0 0 1 4 4v16h42.83L120 193.17V188a28.13 28.13 0 0 0-24-27.71V160h51.7l-11.58-9.27 14.2-4.73-14.2-4.73zM72 56a10 10 0 0 1 9.239 6.173 10 10 0 0 1 .569 5.778 10 10 0 0 1-2.737 5.12 10.001 10.001 0 0 1-5.12 2.737 10 10 0 0 1-5.778-.57 10 10 0 0 1-4.488-3.682A10 10 0 0 1 62 66a10 10 0 0 1 10-10zm-24 0a10 10 0 0 1 9.239 6.173 10 10 0 0 1 .569 5.778 10 10 0 0 1-2.737 5.12 10 10 0 0 1-5.12 2.737 10 10 0 0 1-5.778-.57 10 10 0 0 1-4.488-3.682A10 10 0 0 1 38 66a10 10 0 0 1 10-10zM24 160.6 12.12 154 24 147.4v13.2zm0-20L12.12 134 24 127.4v13.2zm0-20L12.12 114 24 107.4v13.2zm0-20L12.12 94 24 87.4v13.2zM236 72a5.996 5.996 0 0 0 3.333-1.011 5.997 5.997 0 0 0 2.21-2.693 6.005 6.005 0 0 0-1.3-6.539 6.002 6.002 0 0 0-9.232.91A6.002 6.002 0 0 0 230 66a6 6 0 0 0 6 6zm0-10a4 4 0 0 1 2.222.674 4.002 4.002 0 0 1 1.474 1.795c.302.731.381 1.535.227 2.311a3.993 3.993 0 0 1-1.095 2.048 3.998 3.998 0 0 1-6.154-.606 4.004 4.004 0 0 1 .498-5.05A3.998 3.998 0 0 1 236 62zm-24 10a5.996 5.996 0 0 0 3.333-1.011 5.997 5.997 0 0 0 2.21-2.693 6.005 6.005 0 0 0-1.3-6.539 6.002 6.002 0 0 0-9.232.91A6.002 6.002 0 0 0 206 66a6 6 0 0 0 6 6zm0-10a4 4 0 0 1 2.222.674 4.002 4.002 0 0 1 1.474 1.795c.302.731.381 1.535.227 2.311a3.993 3.993 0 0 1-1.095 2.048 3.998 3.998 0 0 1-6.154-.606 4.004 4.004 0 0 1 .498-5.05A3.998 3.998 0 0 1 212 62z"
                  ></path><path
                    d="M236 72a5.996 5.996 0 0 0 3.333-1.011 5.997 5.997 0 0 0 2.21-2.693 6.005 6.005 0 0 0-1.3-6.539 6.002 6.002 0 0 0-9.232.91A6.002 6.002 0 0 0 230 66a6 6 0 0 0 6 6zm0-10a4 4 0 0 1 2.222.674 4.002 4.002 0 0 1 1.474 1.795c.302.731.381 1.535.227 2.311a3.993 3.993 0 0 1-1.095 2.048 3.998 3.998 0 0 1-6.154-.606 4.004 4.004 0 0 1 .498-5.05A3.998 3.998 0 0 1 236 62zm-24 10a5.996 5.996 0 0 0 3.333-1.011 5.997 5.997 0 0 0 2.21-2.693 6.005 6.005 0 0 0-1.3-6.539 6.002 6.002 0 0 0-9.232.91A6.002 6.002 0 0 0 206 66a6 6 0 0 0 6 6zm0-10a4 4 0 0 1 2.222.674 4.002 4.002 0 0 1 1.474 1.795c.302.731.381 1.535.227 2.311a3.993 3.993 0 0 1-1.095 2.048 3.998 3.998 0 0 1-6.154-.606 4.004 4.004 0 0 1 .498-5.05A3.998 3.998 0 0 1 212 62z"
                  ></path><path
                    d="M298.83 208 284 193.17V188a28.128 28.128 0 0 0-24-27.71V100h-10v-1a2.999 2.999 0 0 0-5.121-2.121A2.999 2.999 0 0 0 244 99v1h-6v-1a2.999 2.999 0 0 0-5.121-2.121A2.999 2.999 0 0 0 232 99v1h-6v-1a2.999 2.999 0 0 0-5.121-2.121A2.999 2.999 0 0 0 220 99v1h-6v-1a2.999 2.999 0 0 0-5.121-2.121A2.999 2.999 0 0 0 208 99v1a8 8 0 1 1 0-16h6v1a2.999 2.999 0 0 0 5.121 2.121A2.999 2.999 0 0 0 220 85v-1h6v1a2.999 2.999 0 0 0 5.121 2.121A2.999 2.999 0 0 0 232 85v-1h6v1a2.999 2.999 0 0 0 5.121 2.121A2.999 2.999 0 0 0 244 85v-1h6v1a2.999 2.999 0 0 0 5.121 2.121A2.999 2.999 0 0 0 256 85v-1h4v-4.2a10 10 0 0 0 0-19.6V48c0-15.25-8.75-24-24-24h-24c-15.25 0-24 8.75-24 24v12.2a10 10 0 0 0 0 19.6V128a3.995 3.995 0 0 1-2.828-1.172A3.995 3.995 0 0 1 184 124v-24c0-1.06-.421-2.078-1.172-2.828A3.998 3.998 0 0 0 180 96a3.998 3.998 0 0 0-4 4v1a.997.997 0 0 1-1 1 .997.997 0 0 1-1-1v-1c0-1.06-.421-2.078-1.172-2.828A3.998 3.998 0 0 0 170 96a3.998 3.998 0 0 0-4 4v1a.997.997 0 0 1-1 1 .997.997 0 0 1-1-1v-1c0-1.06-.421-2.078-1.172-2.828A3.998 3.998 0 0 0 160 96a3.998 3.998 0 0 0-4 4v28a28 28 0 0 0 28 28h4v16a3.995 3.995 0 0 1-1.172 2.828A3.995 3.995 0 0 1 184 176h-16v42.83L182.83 204H188a27.918 27.918 0 0 0 25.3-16H252c1.061 0 2.078.421 2.828 1.172A3.995 3.995 0 0 1 256 192v16h42.83zM260 64.34a6 6 0 0 1 2.905 2.192 6.001 6.001 0 0 1 0 6.936A6 6 0 0 1 260 75.66V64.34zm-72 11.32a6 6 0 0 1-2.905-2.192 6.001 6.001 0 0 1 0-6.936A6 6 0 0 1 188 64.34v11.32zm24 .34a10.002 10.002 0 0 1-9.239-6.173 9.998 9.998 0 0 1-.569-5.778 9.998 9.998 0 0 1 13.635-7.288A10.003 10.003 0 0 1 222 66a10.002 10.002 0 0 1-10 10zm24 0a10.002 10.002 0 0 1-9.239-6.173 9.998 9.998 0 0 1-.569-5.778 9.998 9.998 0 0 1 13.635-7.288A10.003 10.003 0 0 1 246 66a10.002 10.002 0 0 1-10 10zm-39.85-27.47c-.64-1-1-1.53-2.15-1.53v-2a4.223 4.223 0 0 1 2.289.668 4.222 4.222 0 0 1 1.561 1.802c.64 1 1 1.53 2.15 1.53s1.51-.5 2.15-1.53a4.234 4.234 0 0 1 1.565-1.795 4.238 4.238 0 0 1 2.285-.669c.81 0 1.603.232 2.285.669a4.234 4.234 0 0 1 1.565 1.795c.64 1 1 1.53 2.15 1.53s1.51-.5 2.15-1.53a4.234 4.234 0 0 1 1.565-1.795 4.238 4.238 0 0 1 2.285-.669c.81 0 1.603.232 2.285.669a4.234 4.234 0 0 1 1.565 1.795c.64 1 1 1.53 2.15 1.53s1.51-.5 2.15-1.53a4.234 4.234 0 0 1 1.565-1.795 4.238 4.238 0 0 1 2.285-.669c.81 0 1.603.232 2.285.669a4.234 4.234 0 0 1 1.565 1.795c.64 1 1 1.53 2.15 1.53s1.51-.5 2.15-1.53a4.234 4.234 0 0 1 1.565-1.795 4.238 4.238 0 0 1 2.285-.669c.81 0 1.603.232 2.285.669a4.234 4.234 0 0 1 1.565 1.795c.64 1 1 1.53 2.15 1.53s1.51-.5 2.15-1.53A4.222 4.222 0 0 1 254 45v2c-1.14 0-1.51.5-2.15 1.53a4.234 4.234 0 0 1-1.565 1.795 4.238 4.238 0 0 1-4.57 0 4.234 4.234 0 0 1-1.565-1.795c-.64-1-1-1.53-2.15-1.53s-1.51.5-2.15 1.53a4.234 4.234 0 0 1-1.565 1.795 4.238 4.238 0 0 1-4.57 0 4.234 4.234 0 0 1-1.565-1.795c-.64-1-1-1.53-2.15-1.53s-1.51.5-2.15 1.53a4.234 4.234 0 0 1-1.565 1.795 4.238 4.238 0 0 1-4.57 0 4.234 4.234 0 0 1-1.565-1.795c-.64-1-1-1.53-2.15-1.53s-1.51.5-2.15 1.53a4.234 4.234 0 0 1-1.565 1.795 4.238 4.238 0 0 1-4.57 0 4.234 4.234 0 0 1-1.565-1.795c-.64-1-1-1.53-2.15-1.53s-1.51.5-2.15 1.53a4.234 4.234 0 0 1-1.565 1.795 4.238 4.238 0 0 1-4.57 0 4.234 4.234 0 0 1-1.565-1.795z"
                  ></path><path
                    d="M264 156a28 28 0 0 0 28-28v-28c0-1.06-.421-2.078-1.172-2.828A3.998 3.998 0 0 0 288 96a3.998 3.998 0 0 0-4 4v1a.997.997 0 0 1-1 1 .997.997 0 0 1-1-1v-1c0-1.06-.421-2.078-1.172-2.828A3.998 3.998 0 0 0 278 96a3.998 3.998 0 0 0-4 4v1a.997.997 0 0 1-1 1 .997.997 0 0 1-1-1v-1c0-1.06-.421-2.078-1.172-2.828A3.998 3.998 0 0 0 268 96a3.998 3.998 0 0 0-4 4v56z"
                  ></path></g
                ></svg
              >
              <p>{$t.evilMartians}</p>
            </div>
            <div class="credit_item">
              <img
                src="/h+h-logo.png"
                alt="h+h lab"
                width="75"
                height="75"
                aria-hidden="true"
              />
              <p>{$t.hhLabs}</p>
            </div>
          </section>

          <section class="credits_section">
            <h3>{$t.contributors}</h3>
            {#each $credits as contributor}
              <div class="contributor">
                <span class="contributor_name">{contributor.login}</span>
                <span class="contributor_dots"></span>
                <span class="contributor_contributions"
                  >{contributor.contributions}</span
                >
              </div>
            {/each}
          </section>

          <section class="credits_section">
            <h3>{$t.allNpmDependenciesAuthors}</h3>
          </section>

          <section class="credits_section">
            <h3>{$t.allCiActionsAuthors}</h3>
          </section>

          <section class="credits_section">
            <h3>
              {$t.devOpsTeam}
            </h3>
          </section>

          <div class="credits_end">
            <p>Thank you for using Slow Reader</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .credits_overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: oklch(0 0 0.9);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
    animation: fadeIn 0.5s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .credits_close {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1001;
  }

  .credits_content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .credits_scroll {
    animation: scrollUp 60s linear infinite;
    padding-top: 100vh;
  }

  @keyframes scrollUp {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-100%);
    }
  }

  .credits_list {
    color: white;
    text-align: center;
    padding: 100px 40px;
    font-family: serif;
  }

  .credits_title {
    font-size: 64px;
    margin-bottom: 100px;
    font-weight: 300;
    letter-spacing: 4px;
  }

  .credits_section {
    margin-bottom: 120px;
  }

  .credits_section h3 {
    font-size: 32px;
    margin-bottom: 40px;
    font-weight: 300;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .credit_item {
    display: flex;
    gap: 32px;
    align-items: center;
    justify-content: flex-start;
    width: 400px;
    margin-inline: auto;
  }

  .credit_item p {
    font-size: 24px;
    font-weight: 300;
  }

  .credit_item img {
    filter: invert(1) brightness(2);
  }

  .contributor {
    display: flex;
    align-items: baseline;
    margin-bottom: 20px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .contributor_name {
    font-size: 24px;
    font-weight: 300;
    white-space: nowrap;
    padding-right: 8px;
  }

  .contributor_dots {
    flex: 1;
    height: 1rem;
    margin: 0 8px;
    align-self: baseline;
    background-image: radial-gradient(
      circle at center,
      rgba(255, 255, 255, 0.6) 2px,
      transparent 2px
    );
    background-size: 12px 12px;
    background-position: 0 100%;
    background-repeat: repeat-x;
  }

  .contributor_contributions {
    font-size: 24px;
    font-weight: 300;
    white-space: nowrap;
    padding-left: 8px;
  }

  .credits_end {
    margin-top: 200px;
    font-size: 28px;
    font-weight: 300;
    opacity: 0.8;
  }

  .credits_end p {
    margin: 0;
  }
</style>
