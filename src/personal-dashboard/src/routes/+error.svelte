<script lang="ts">
  import { page } from '$app/stores';
  import { Ghost, ArrowLeft } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';
</script>

<div class="relative flex min-h-screen items-center justify-center bg-app p-4 py-12 text-primary">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, var(--ds-border-strong) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="ds-panel relative z-10 my-auto w-full max-w-[500px] p-8 text-center md:p-12">
    
    <div class="mb-6 flex animate-bounce justify-center text-muted" style="animation-duration: 3s;">
      <Ghost size={64} strokeWidth={1.5} />
    </div>

    <h1 class="mb-4 bg-gradient-to-br from-primary to-muted bg-clip-text text-6xl font-bold tracking-tighter text-transparent">
      {$page.status}
    </h1>
    
    <p class="mb-8 text-lg font-medium text-secondary">
      {#if $page.status === 404}
        {i18n.t.errorPage.notFound}
      {:else}
        {$page.error?.message || i18n.t.errorPage.generic}
      {/if}
    </p>

    <a href="/" class="ds-btn ds-btn-secondary px-6 py-3 active:scale-[0.98]">
      <ArrowLeft size={16} class="mr-2" />
      {i18n.t.errorPage.backToDashboard}
    </a>
  </div>
</div>
