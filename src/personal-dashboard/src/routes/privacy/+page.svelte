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

<div class="min-h-screen flex items-center justify-center p-4 font-sans text-white relative py-12" style="background-color: var(--theme-body-bg, #121212);">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="w-full max-w-[800px] bg-neutral-800/80 backdrop-blur-xl border border-black/40 rounded-[24px] shadow-2xl p-8 md:p-12 relative z-10 my-auto">
    <button onclick={goBack} class="inline-block text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mb-6">
      &larr; {i18n.t.back || 'Back'}
    </button>

    <h1 class="text-3xl font-bold tracking-tight mb-8">{i18n.t.legal.datenschutz.title}</h1>

    <div class="space-y-8 text-sm text-neutral-300 leading-relaxed">
      <section>
        <h2 class="text-xl font-bold text-white mb-3 tracking-tight">{i18n.t.legal.datenschutz.sec1Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec1Desc}
        </p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-white mb-3 tracking-tight">{i18n.t.legal.datenschutz.sec2Title}</h2>
        <p class="font-bold text-white mb-1">{i18n.t.legal.datenschutz.sec2q1}</p>
        <p class="mb-4">{i18n.t.legal.datenschutz.sec2a1}</p>

        <p class="font-bold text-white mb-1">{i18n.t.legal.datenschutz.sec2q2}</p>
        <p class="mb-4">
          {i18n.t.legal.datenschutz.sec2a2}
        </p>

        <p class="font-bold text-white mb-1">{i18n.t.legal.datenschutz.sec2q3}</p>
        <p>
          {i18n.t.legal.datenschutz.sec2a3}
        </p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-white mb-3 tracking-tight">{i18n.t.legal.datenschutz.sec3Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec3Desc}
        </p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-white mb-3 tracking-tight">{i18n.t.legal.datenschutz.sec4Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec4Desc}
        </p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-white mb-3 tracking-tight">{i18n.t.legal.datenschutz.sec5Title}</h2>
        <p>
          {i18n.t.legal.datenschutz.sec5Desc}
        </p>
      </section>
    </div>
    
    <div class="mt-12 pt-8 border-t border-white/10">
      <LegalFooter />
    </div>
  </div>
</div>
