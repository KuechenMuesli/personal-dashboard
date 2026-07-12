<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade } from 'svelte/transition';
  import {
    ArrowLeft,
    Download,
    Upload,
    AlertTriangle,
    Palette,
    Database,
    User,
    LogOut,
    LogIn,
    UserPlus,
    Check,
    Link
  } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount } from 'svelte';
  import LegalFooter from "$lib/components/LegalFooter.svelte";

  let { data, form } = $props();
  let emailLoading = $state(false);
  let passwordLoading = $state(false);
  let deleteLoading = $state(false);

  let activeTab = $state('account'); // 'appearance', 'data', 'account', 'integrations'
  let globalTheme = $state('theme-default');

  let THEMES = $derived([
    { id: 'theme-default', name: i18n.t.themes.default, colors: ['#121212', '#262626', '#3b82f6'] },
    { id: 'theme-oled', name: i18n.t.themes.oled, colors: ['#000000', '#0a0a0a', '#38bdf8'] },
    { id: 'theme-midnight', name: i18n.t.themes.midnight, colors: ['#020617', '#0f172a', '#818cf8'] },
    { id: 'theme-hacker', name: i18n.t.themes.hacker, colors: ['#050505', '#022c22', '#10b981'] },
    { id: 'theme-sunset', name: i18n.t.themes.sunset, colors: ['#2a111a', '#3a1623', '#f43f5e'] },
    { id: 'theme-light', name: i18n.t.themes.light, colors: ['#f4f4f5', '#ffffff', '#2563eb'] },
    { id: 'theme-paper', name: i18n.t.themes.paper, colors: ['#fdf6e3', '#eee8d5', '#268bd2'] }
  ]);

  onMount(() => {
    const savedTheme = localStorage.getItem('dashboard-theme');
    if (savedTheme) globalTheme = savedTheme;
  });

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.body.className = globalTheme;
      localStorage.setItem('dashboard-theme', globalTheme);
    }
  });

  function exportConfig() {
    const config: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-') && !key.includes('auth-token')) {
        config[key] = localStorage.getItem(key) || "";
      }
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importConfig(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (!config['dashboard-layout']) {
          alert("Invalid configuration file.");
          return;
        }
        if (confirm("This will overwrite your current layout and settings. Continue?")) {
          const authTokens: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token') || key === 'dashboard-user' || key === 'dashboard-layout-id')) {
              authTokens[key] = localStorage.getItem(key)!;
            }
          }
          localStorage.clear();
          Object.entries(authTokens).forEach(([k, v]) => localStorage.setItem(k, v));
          Object.entries(config).forEach(([key, value]) => {
            if (key !== 'dashboard-timestamp') {
              localStorage.setItem(key, value as string);
            }
          });
          localStorage.setItem('dashboard-timestamp', Date.now().toString());
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse the config file.");
      }
    };
    reader.readAsText(file);
  }

  let unlinkLoading = $state(false);
  async function unlinkMicrosoft() {
    if (!confirm(i18n.t.integrations.unlinkConfirm)) return;
    unlinkLoading = true;
    try {
      await fetch('/api/ms-todo', { method: 'DELETE' });
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert(i18n.t.integrations.unlinkError);
    } finally {
      unlinkLoading = false;
    }
  }
</script>

<div class="h-screen overflow-hidden flex items-center justify-center p-4 font-sans text-white relative" style="background-color: var(--theme-body-bg, #121212);">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="w-full max-w-[1000px] h-[90vh] flex flex-col bg-neutral-800/80 backdrop-blur-xl border border-black/40 rounded-[24px] shadow-2xl p-6 md:p-8 relative z-10">

    <div class="mb-8 shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div>
        <a href="/" class="inline-flex items-center text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mb-6">
          <ArrowLeft size={14} class="mr-2" /> {i18n.t.accountSettings.backToDash}
        </a>
        <h1 class="text-3xl font-bold">{i18n.currentLang === 'de' ? 'Einstellungen' : 'Settings'}</h1>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-4 md:gap-8 flex-1 min-h-0">

      <!-- Sidebar / Vertical Tabs (Desktop) & Segmented Control (Mobile) -->
      <div class="w-full md:w-1/4 flex flex-row md:flex-col gap-1 md:gap-2 shrink-0 bg-black/40 md:bg-transparent p-1 md:p-0 rounded-xl md:rounded-none overflow-visible">
        <button
          class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm tracking-wide transition-all {activeTab === 'account' ? 'bg-neutral-700 md:bg-blue-500/10 text-white shadow-md md:shadow-[0_0_15px_rgba(59,130,246,0.15)] md:border md:border-blue-500/50' : 'text-neutral-400 hover:text-white md:hover:bg-white/5 border border-transparent'}"
          onclick={() => activeTab = 'account'}
        >
          <User size={16} class="hidden md:block" /> {i18n.t.accountSettings.tabAccount}
        </button>
        <button
          class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm tracking-wide transition-all {activeTab === 'appearance' ? 'bg-neutral-700 md:bg-blue-500/10 text-white shadow-md md:shadow-[0_0_15px_rgba(59,130,246,0.15)] md:border md:border-blue-500/50' : 'text-neutral-400 hover:text-white md:hover:bg-white/5 border border-transparent'}"
          onclick={() => activeTab = 'appearance'}
        >
          <Palette size={16} class="hidden md:block" /> {i18n.t.accountSettings.tabAppearance}
        </button>
        <button
          class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm tracking-wide transition-all {activeTab === 'data' ? 'bg-neutral-700 md:bg-blue-500/10 text-white shadow-md md:shadow-[0_0_15px_rgba(59,130,246,0.15)] md:border md:border-blue-500/50' : 'text-neutral-400 hover:text-white md:hover:bg-white/5 border border-transparent'}"
          onclick={() => activeTab = 'data'}
        >
          <Database size={16} class="hidden md:block" /> {i18n.t.accountSettings.tabData}
        </button>
        {#if data.user}
        <button
          class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm tracking-wide transition-all {activeTab === 'integrations' ? 'bg-neutral-700 md:bg-blue-500/10 text-white shadow-md md:shadow-[0_0_15px_rgba(59,130,246,0.15)] md:border md:border-blue-500/50' : 'text-neutral-400 hover:text-white md:hover:bg-white/5 border border-transparent'}"
          onclick={() => activeTab = 'integrations'}
        >
          <Link size={16} class="hidden md:block" /> {i18n.currentLang === 'de' ? 'Verbundene Konten' : 'Connected Accounts'}
        </button>
        {/if}
      </div>

      <!-- Content Area -->
      <div class="w-full md:w-3/4 space-y-8 overflow-y-auto pr-4 pb-8 custom-scrollbar">

        {#if activeTab === 'appearance'}
          <div class="bg-black/20 border border-black/40 rounded-[24px] p-6 shadow-inner">
            <h2 class="text-lg font-bold mb-4">{i18n.t.accountSettings.language}</h2>
            <div class="grid grid-cols-2 gap-3 mb-8">
                <button
                    class="p-4 rounded-xl border text-left transition-all flex items-center gap-4 {i18n.currentLang === 'en' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800'}"
                    onclick={() => i18n.setLang('en')}
                >
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 border border-black/40 text-xs font-black text-neutral-400">EN</div>
                    <span class="font-bold text-base text-slate-200">English</span>
                </button>
                <button
                    class="p-4 rounded-xl border text-left transition-all flex items-center gap-4 {i18n.currentLang === 'de' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800'}"
                    onclick={() => i18n.setLang('de')}
                >
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 border border-black/40 text-xs font-black text-neutral-400">DE</div>
                    <span class="font-bold text-base text-slate-200">Deutsch</span>
                </button>
            </div>

            <h2 class="text-lg font-bold mb-4">{i18n.t.dashboardSettings.theme}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {#each THEMES as theme}
                    <button
                        class="p-4 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[90px] gap-2 {globalTheme === theme.id ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800'}"
                        onclick={() => globalTheme = theme.id}
                    >
                        <div class="font-bold text-sm text-slate-200 break-words leading-tight">{theme.name}</div>
                        <div class="flex gap-1.5 mt-2 bg-black/20 p-2 rounded-lg w-fit border border-black/20">
                            {#each theme.colors as c}
                                <div class="w-4 h-4 rounded-full border border-black/40 shadow-sm" style="background-color: {c}"></div>
                            {/each}
                        </div>
                    </button>
                {/each}
            </div>
          </div>

        {:else if activeTab === 'integrations'}
          <div class="bg-black/20 border border-black/40 rounded-[24px] p-6 shadow-inner">
            <h2 class="text-lg font-bold mb-4">{i18n.currentLang === 'de' ? 'Verbundene Konten' : 'Connected Accounts'}</h2>

            <div class="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-4 w-full sm:w-auto">
                <div class="w-12 h-12 bg-white/5 flex items-center justify-center rounded-lg shadow-inner shrink-0 border border-white/10">
                  <svg width="24" height="24" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-white">{i18n.t.integrations.microsoftServices}</h3>
                  {#if data.msConnected}
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-green-400 mt-0.5">
                      <Check size={12} strokeWidth={3} /> {i18n.t.integrations.connectedActive}
                    </div>
                  {:else}
                    <div class="text-xs text-neutral-400 mt-0.5">{i18n.t.integrations.notConnected}</div>
                  {/if}
                </div>
              </div>

              {#if data.msConnected}
                <div class="flex items-center gap-2 w-full sm:w-auto">
                  <button onclick={unlinkMicrosoft} disabled={unlinkLoading} class="flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-bold text-xs transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50">
                    {unlinkLoading ? i18n.t.integrations.unlinking : i18n.t.integrations.unlink}
                  </button>
                  <a href="/auth/microsoft/login" data-sveltekit-reload class="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-lg font-bold text-xs transition-colors bg-neutral-700 hover:bg-neutral-600 text-white">
                    {i18n.t.integrations.reauthorize}
                  </a>
                </div>
              {:else}
                <a href="/auth/microsoft/login" data-sveltekit-reload class="w-full sm:w-auto text-center px-6 py-2.5 rounded-lg font-bold text-xs transition-colors bg-white text-black hover:bg-neutral-200 shadow-md">
                  {i18n.t.integrations.loginWithMicrosoft}
                </a>
              {/if}
            </div>
          </div>

        {:else if activeTab === 'data'}
          <div class="bg-black/20 border border-black/40 rounded-[24px] p-6 shadow-inner">
            <h2 class="text-lg font-bold mb-1">{i18n.t.dashboardSettings.dataBackup}</h2>
            <p class="text-xs text-neutral-500 mb-6">Exporitiere dein Dashboard als Backup oder importiere ein bestehendes Backup (überschreibt aktuelles Dashboard).</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label class="flex flex-col items-center justify-center p-6 rounded-xl border border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-500 cursor-pointer transition-colors text-center group">
                    <Download size={28} class="mb-3 text-neutral-400 group-hover:text-blue-400 transition-colors" />
                    <span class="text-sm font-bold text-slate-200">{i18n.t.dashboardSettings.import}</span>
                    <span class="text-xs text-neutral-500 mt-1">{i18n.t.dashboardSettings.importDesc}</span>
                    <input type="file" accept=".json" class="hidden" onchange={importConfig} />
                </label>
                <button onclick={exportConfig} class="flex flex-col items-center justify-center p-6 rounded-xl border border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-500 cursor-pointer transition-colors text-center group">
                    <Upload size={28} class="mb-3 text-neutral-400 group-hover:text-blue-400 transition-colors" />
                    <span class="text-sm font-bold text-slate-200">{i18n.t.dashboardSettings.export}</span>
                    <span class="text-xs text-neutral-500 mt-1">{i18n.t.dashboardSettings.exportDesc}</span>
                </button>
            </div>
          </div>

        {:else if activeTab === 'account'}
          {#if data.user}
            <!-- Email Update Section -->
            <div class="bg-black/20 border border-black/40 rounded-[24px] p-6 shadow-inner">
              <h2 class="text-lg font-bold mb-1">{i18n.t.accountSettings.changeEmail}</h2>
              <p class="text-xs text-neutral-500 mb-6">{i18n.t.accountSettings.currentEmail.replace('{email}', data.user?.email || '')}</p>

            {#if form?.emailError}
              <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
                {form.emailError}
              </div>
            {/if}
            {#if form?.emailSuccess}
              <div class="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
                {form.emailSuccess}
              </div>
            {/if}

            <form method="POST" action="?/updateEmail" use:enhance={() => { emailLoading = true; return async ({ update }) => { emailLoading = false; update(); } }} class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="password_email" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.currentPassword}</label>
                  <input type="password" id="password_email" name="password" required placeholder="••••••••" class="w-full bg-black/40 border border-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
                </div>
                <div>
                  <label for="email" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.newEmail}</label>
                  <input type="email" id="email" name="email" required placeholder="new@example.com" class="w-full bg-black/40 border border-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
                </div>
              </div>
              <button type="submit" disabled={emailLoading} class="bg-neutral-800 hover:bg-neutral-700 border border-black/40 text-white font-bold text-sm py-2 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">
                {emailLoading ? '...' : i18n.t.accountSettings.updateEmailBtn}
              </button>
            </form>
          </div>

          <!-- Password Update Section -->
          <div class="bg-black/20 border border-black/40 rounded-[24px] p-6 shadow-inner mt-8">
            <h2 class="text-lg font-bold mb-1">{i18n.t.accountSettings.changePassword}</h2>
            <p class="text-xs text-neutral-500 mb-6">{i18n.t.accountSettings.passwordDesc}</p>

            {#if form?.passwordError}
              <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
                {form.passwordError}
              </div>
            {/if}
            {#if form?.passwordSuccess}
              <div class="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
                {form.passwordSuccess}
              </div>
            {/if}

            <form method="POST" action="?/updatePassword" use:enhance={() => { passwordLoading = true; return async ({ update }) => { passwordLoading = false; update(); } }} class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="oldPassword" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.currentPassword}</label>
                  <input type="password" id="oldPassword" name="oldPassword" required placeholder="••••••••" class="w-full bg-black/40 border border-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
                </div>
                <div>
                  <label for="newPassword" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.newPassword}</label>
                  <input type="password" id="newPassword" name="newPassword" required placeholder="••••••••" class="w-full bg-black/40 border border-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
                </div>
              </div>

              <button type="submit" disabled={passwordLoading} class="bg-neutral-800 hover:bg-neutral-700 border border-black/40 text-white font-bold text-sm py-2 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">
                {passwordLoading ? '...' : i18n.t.accountSettings.updatePasswordBtn}
              </button>
            </form>
          </div>

          <!-- Delete Account Section -->
          <div class="bg-red-950/20 border border-red-900/30 rounded-[24px] p-6 shadow-inner mt-8">
            <h2 class="text-lg font-bold mb-1 text-red-400 flex items-center gap-2">
              <AlertTriangle size={18} /> {i18n.t.accountSettings.deleteAccount}
            </h2>
            <p class="text-xs text-red-400/70 mb-6">{i18n.t.accountSettings.deleteAccountDesc}</p>

            {#if form?.deleteError}
              <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
                {form.deleteError}
              </div>
            {/if}

            <form method="POST" action="?/deleteAccount" use:enhance={() => { deleteLoading = true; return async ({ update }) => { deleteLoading = false; update(); } }} class="space-y-4">
              <div>
                <label for="delete_password" class="block text-[10px] font-black text-red-500/70 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.passwordToConfirm}</label>
                <input type="password" id="delete_password" name="password" required placeholder="••••••••" class="w-full bg-black/40 border border-red-900/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-red-900/50 text-red-100" />
              </div>

              <button type="submit" disabled={deleteLoading} onclick={(e) => { if(!confirm(i18n.t.accountSettings.deleteAccountConfirm)) e.preventDefault(); }} class="bg-red-900/40 hover:bg-red-600/50 border border-red-900/50 text-red-200 font-bold text-sm py-2 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">
                {deleteLoading ? '...' : i18n.t.accountSettings.deleteAccountBtn}
              </button>
            </form>
          </div>

          <!-- Sign Out Section -->
          <div class="mt-12 pt-8 border-t border-white/5 flex justify-center md:justify-start">
            <form method="POST" action="/?/logout">
              <button type="submit" class="flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent">
                <LogOut size={18} /> {i18n.t.accountSettings.signOut}
              </button>
            </form>
          </div>

          {:else}
          <!-- Not Logged In Section -->
          <div class="bg-black/20 border border-blue-900/30 rounded-[24px] p-8 shadow-inner text-center">
            <User size={48} class="mx-auto mb-4 text-neutral-500" />
            <h2 class="text-2xl font-bold mb-2 text-white">{i18n.t.dashboardSettings.localMode}</h2>
            <p class="text-sm text-neutral-400 mb-8 max-w-md mx-auto">{i18n.t.dashboardSettings.signInToSync}</p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login?signup=true" class="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-black/20">
                <UserPlus size={18} /> {i18n.t.login.signUpBtn}
              </a>
              <a href="/login" class="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-black/20 hover:bg-black/40 border border-white/5 text-neutral-300 hover:text-white font-bold rounded-xl transition-all active:scale-[0.98]">
                <LogIn size={18} /> {i18n.t.login.signInBtn}
              </a>
            </div>
          </div>
          {/if}
        {/if}

      </div>
    </div>

    <!-- Legal Links -->
    <div class="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-4 text-xs text-neutral-500 shrink-0">
        <LegalFooter />
    </div>

  </div>
</div>

<style>
  /* Custom Scrollbar for Settings */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>
