<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalFooter from '$lib/components/LegalFooter.svelte';

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/login';
    }
  }
</script>

<div class="relative flex min-h-screen items-center justify-center bg-app p-4 text-primary py-12">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, var(--ds-border-strong) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="ds-panel relative z-10 my-auto w-full max-w-[800px] p-8 md:p-12">
    <button onclick={goBack} class="ds-label mb-6 inline-block transition-colors hover:text-primary">
      &larr; {i18n.t.back || 'Back'}
    </button>

    <h1 class="mb-8 text-3xl font-semibold tracking-tight">{i18n.t.legal.datenschutz.title}</h1>

    <div class="space-y-8 text-sm leading-relaxed text-secondary">
      <section>
        <h2 class="mb-3 text-xl font-semibold tracking-tight text-primary">{i18n.t.legal.datenschutz.sec1Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec1Desc}
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-xl font-semibold tracking-tight text-primary">{i18n.t.legal.datenschutz.sec2Title}</h2>
        <p class="mb-1 font-semibold text-primary">{i18n.t.legal.datenschutz.sec2q1}</p>
        <p class="mb-4">{i18n.t.legal.datenschutz.sec2a1}</p>

        <p class="mb-1 font-semibold text-primary">{i18n.t.legal.datenschutz.sec2q2}</p>
        <p class="mb-4">
          {i18n.t.legal.datenschutz.sec2a2}
        </p>

        <p class="mb-1 font-semibold text-primary">{i18n.t.legal.datenschutz.sec2q3}</p>
        <p>
          {i18n.t.legal.datenschutz.sec2a3}
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-xl font-semibold tracking-tight text-primary">{i18n.t.legal.datenschutz.sec3Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec3Desc}
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-xl font-semibold tracking-tight text-primary">{i18n.t.legal.datenschutz.sec4Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec4Desc}
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-xl font-semibold tracking-tight text-primary">{i18n.t.legal.datenschutz.sec5Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec5Desc}
        </p>
      </section>
    </div>
    
    <div class="mt-12 border-t border-line pt-8">
      <LegalFooter />
    </div>
  </div>
</div>
