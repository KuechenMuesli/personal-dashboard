<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade } from 'svelte/transition';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalFooter from '$lib/components/LegalFooter.svelte';

  let { form, data } = $props();
  import { page } from '$app/stores';
  let loading = $state(false);
  let isSignUp = $state($page.url.searchParams.has('signup'));

  async function signInWithGithub() {
    loading = true;
    const { error } = await data.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      console.error(error);
      loading = false;
    }
  }

</script>

<div class="relative flex min-h-screen items-center justify-center bg-app p-4 text-primary">
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, var(--ds-border-strong) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="ds-panel relative z-10 w-full max-w-[380px] p-8">

    <div class="mb-8">
      <h1 class="mb-1 text-2xl font-semibold tracking-tight">{isSignUp ? i18n.t.login.createAccount : i18n.t.login.welcomeBack}</h1>
      <p class="text-sm text-secondary">{isSignUp ? i18n.t.login.signUpDesc : i18n.t.login.signInDesc}</p>
    </div>

    {#if form?.error}
      <div class="ds-alert ds-alert-error mb-6" in:fade>
        {form.error}
      </div>
    {/if}

    {#if form?.message}
      <div class="ds-alert mb-6 border-accent/25 bg-accent-soft text-accent" in:fade>
        {form.message}
      </div>
    {/if}

    <button type="button" disabled={loading} onclick={signInWithGithub} class="ds-btn ds-btn-secondary w-full py-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
      {isSignUp ? 'Sign up with GitHub' : 'Sign in with GitHub'}
    </button>

    <div class="flex items-center gap-3 mb-6">
      <div class="h-px flex-1 bg-line-strong"></div>
      <div class="ds-label">OR</div>
      <div class="h-px flex-1 bg-line-strong"></div>
    </div>

    <form method="POST" action={isSignUp ? "?/signup" : "?/login"} use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); } }} class="space-y-4">
      <div>
        <label for="email" class="ds-label mb-1.5 ml-1 block">{i18n.t.login.email}</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com" class="ds-input" />
      </div>
      <div>
      <div class="flex justify-between items-center mt-1">
        <label for="password" class="ds-label ml-1 block">{i18n.t.login.password}</label>
        {#if !isSignUp}
          <a href="/login/reset-password" class="text-[10px] font-medium text-secondary transition-colors hover:text-primary">{i18n.t.login.forgotPassword}</a>
        {/if}
      </div>
      <input type="password" id="password" name="password" required placeholder="••••••••" class="ds-input" />
    </div>

    <button type="submit" disabled={loading} class="ds-btn ds-btn-primary mt-6 w-full py-3">
      {loading ? (isSignUp ? i18n.t.login.creating : i18n.t.login.signingIn) : (isSignUp ? i18n.t.login.signUpBtn : i18n.t.login.signInBtn)}
    </button>
  </form>



  <div class="mt-8 text-center text-[11px] font-medium text-muted">
    {#if isSignUp}
      {i18n.t.login.alreadyHaveAccount}
      <button type="button" class="ml-1 text-primary hover:underline" onclick={() => isSignUp = false}>{i18n.t.login.signInBtn}</button>
    {:else}
      {i18n.t.login.dontHaveAccount}
      <button type="button" class="ml-1 text-primary hover:underline" onclick={() => isSignUp = true}>{i18n.t.login.signUpBtn}</button>
    {/if}
  </div>

  <LegalFooter class="mt-8" />

  </div>
</div>
