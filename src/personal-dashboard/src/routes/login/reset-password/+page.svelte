<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade } from 'svelte/transition';
  import { i18n } from '$lib/i18n/i18n.svelte';
  
  let { form } = $props();
  let loading = $state(false);
</script>

<div class="relative flex min-h-screen items-center justify-center bg-app p-4 text-primary">
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, var(--ds-border-strong) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="ds-panel relative z-10 w-full max-w-[380px] p-8">
    <div class="mb-8">
      <h1 class="mb-1 text-2xl font-semibold tracking-tight">{i18n.t.resetPassword.title}</h1>
      <p class="text-sm text-secondary">{i18n.t.resetPassword.desc}</p>
    </div>

    {#if form?.error}
      <div class="ds-alert ds-alert-error mb-6" in:fade>
        {form.error}
      </div>
    {/if}
    
    {#if form?.success}
      <div class="ds-alert ds-alert-success mb-6" in:fade>
        {form.message}
      </div>
    {:else}
      <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); } }} class="space-y-4">
        <div>
          <label for="email" class="ds-label mb-1.5 ml-1 block">{i18n.t.login.email}</label>
          <input type="email" id="email" name="email" required placeholder="you@example.com" class="ds-input" />
        </div>
        
        <button type="submit" disabled={loading} class="ds-btn ds-btn-primary mt-6 w-full py-3">
          {loading ? i18n.t.resetPassword.sending : i18n.t.resetPassword.btn}
        </button>
      </form>
    {/if}

    <div class="mt-8 text-center text-[11px] font-medium text-muted">
      <a href="/login" class="ml-1 text-primary hover:underline">{i18n.t.resetPassword.backToLogin}</a>
    </div>
  </div>
</div>
