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
    Link,
    Trash2
  } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount } from 'svelte';
  import LegalFooter from "$lib/components/LegalFooter.svelte";
  import ThemeEditor from "$lib/components/ThemeEditor.svelte";

  let { data, form } = $props();
  let emailLoading = $state(false);
  let passwordLoading = $state(false);
  let deleteLoading = $state(false);

  let activeTab = $state('account'); // 'appearance', 'data', 'account', 'integrations'
  let globalTheme = $state('theme-default');

  let customThemes = $state<any[]>([]);
  let showThemeEditor = $state(false);
  let editingTheme = $state<any>(null);

  let ALL_THEMES = $derived([
    { id: 'theme-default', name: i18n.t.themes.default, colors: ['#0e0e10', '#1c1c1f', '#3b82f6'] },
    { id: 'theme-oled', name: i18n.t.themes.oled, colors: ['#000000', '#131316', '#38bdf8'] },
    { id: 'theme-midnight', name: i18n.t.themes.midnight, colors: ['#020617', '#161e33', '#818cf8'] },
    { id: 'theme-forest', name: i18n.t.themes.hacker, colors: ['#041f14', '#0a3d2b', '#10b981'] },
    { id: 'theme-sunset', name: i18n.t.themes.sunset, colors: ['#2a111a', '#3f1b28', '#f43f5e'] },
    { id: 'theme-light', name: i18n.t.themes.light, colors: ['#f4f4f5', '#ffffff', '#2563eb'] },
    { id: 'theme-paper', name: i18n.t.themes.paper, colors: ['#fdf6e3', '#fffbf0', '#268bd2'] },
    { id: 'theme-princess', name: i18n.t.themes.princess, colors: ['#ffe4e8', '#fff5f8', '#ff1493'] },
    ...customThemes.map(t => ({
      id: `custom_${t.id}`,
      name: t.name,
      colors: extractColorsFromCSS(t.css_variables.raw),
      isCustom: true,
      raw: t
    }))
  ]);

  function extractColorsFromCSS(css: string) {
    const bgMatch = css.match(/--theme-body-bg:\s*([^;]+);/);
    const cardMatch = css.match(/--color-neutral-800:\s*([^;]+);/);
    const accentMatch = css.match(/--color-blue-500:\s*([^;]+);/);
    return [
      bgMatch ? bgMatch[1] : '#000000',
      cardMatch ? cardMatch[1] : '#111111',
      accentMatch ? accentMatch[1] : '#555555'
    ];
  }

  onMount(async () => {
    const savedTheme = localStorage.getItem('dashboard-theme');
    if (savedTheme) globalTheme = savedTheme;

    const localCustomThemes = localStorage.getItem('dashboard-custom-themes');
    if (localCustomThemes) customThemes = JSON.parse(localCustomThemes);

    if (data.user) {
      const { data: themes } = await data.supabase.from('custom_themes').select('*');
      if (themes) {
        customThemes = themes;
        localStorage.setItem('dashboard-custom-themes', JSON.stringify(themes));
      }
    }
  });

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.body.className = globalTheme;
      localStorage.setItem('dashboard-theme', globalTheme);

      let styleTag = document.getElementById('custom-theme-style');
      if (globalTheme.startsWith('custom_')) {
        const themeId = globalTheme.replace('custom_', '');
        const theme = customThemes.find(t => t.id === themeId);
        if (theme) {
          if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-theme-style';
            document.head.appendChild(styleTag);
          }
          styleTag.innerHTML = `.${globalTheme} {\n${theme.css_variables.raw}\n}`;
        }
      } else {
        if (styleTag) styleTag.remove();
      }
    }
  });

  async function handleSaveTheme(themeData: any) {
    if (!data.user) {
      alert("You must be logged in to save custom themes.");
      return;
    }
    
    if (themeData.id) {
      const { error } = await data.supabase.from('custom_themes').update({
        name: themeData.name,
        css_variables: { raw: themeData.css_variables }
      }).eq('id', themeData.id);
      if (error) alert(error.message);
    } else {
      const { error, data: inserted } = await data.supabase.from('custom_themes').insert({
        user_id: data.user.id,
        name: themeData.name,
        css_variables: { raw: themeData.css_variables }
      }).select().single();
      if (error) alert(error.message);
      if (inserted) {
        globalTheme = `custom_${inserted.id}`;
      }
    }
    
    const { data: themes } = await data.supabase.from('custom_themes').select('*');
    if (themes) {
      customThemes = themes;
      localStorage.setItem('dashboard-custom-themes', JSON.stringify(themes));
    }
    showThemeEditor = false;
  }

  async function handleDeleteTheme(id: string) {
    if (confirm("Are you sure you want to delete this theme?")) {
      const { error } = await data.supabase.from('custom_themes').delete().eq('id', id);
      if (error) alert(error.message);
      
      const { data: themes } = await data.supabase.from('custom_themes').select('*');
      if (themes) {
        customThemes = themes;
        localStorage.setItem('dashboard-custom-themes', JSON.stringify(themes));
      }
      if (globalTheme === `custom_${id}`) globalTheme = 'theme-default';
      showThemeEditor = false;
    }
  }

  async function handleThemeChange(themeId: string) {
    globalTheme = themeId;
    const activeLayoutId = localStorage.getItem('dashboard-layout-id');
    if (activeLayoutId && data.supabase) {
      const { data: layoutData } = await data.supabase.from('layouts').select('theme').eq('id', activeLayoutId).single();
      if (layoutData) {
        const currentThemeObj = layoutData.theme || {};
        const newThemeObj = { ...currentThemeObj, theme: themeId };
        await data.supabase.from('layouts').update({ theme: newThemeObj }).eq('id', activeLayoutId);
      }
    }
  }

  async function handleLogout() {
    const lang = localStorage.getItem('dashboard-lang');
    const theme = localStorage.getItem('dashboard-theme');
    localStorage.clear();
    if (lang) localStorage.setItem('dashboard-lang', lang);
    if (theme) localStorage.setItem('dashboard-theme', theme);
    if (data.supabase) await data.supabase.auth.signOut();
    window.location.href = '/';
  }

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

<div class="relative flex h-screen items-center justify-center overflow-hidden bg-app p-4 text-primary">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, var(--ds-border-strong) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="ds-panel relative z-10 flex h-[90vh] w-full max-w-[1000px] flex-col p-6 md:p-8">

    <div class="mb-8 shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div>
        <a href="/" class="ds-label mb-6 inline-flex items-center transition-colors hover:text-primary">
          <ArrowLeft size={14} class="mr-2" /> {i18n.t.accountSettings.backToDash}
        </a>
        <h1 class="text-3xl font-semibold tracking-tight">{i18n.currentLang === 'de' ? 'Einstellungen' : 'Settings'}</h1>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-4 md:gap-8 flex-1 min-h-0">

      <!-- Sidebar / Vertical Tabs (Desktop) & Segmented Control (Mobile) -->
      <div class="flex w-full shrink-0 flex-row gap-1 overflow-visible rounded-xl bg-fill p-1 md:w-1/4 md:flex-col md:gap-2 md:rounded-none md:bg-transparent md:p-0">
        <button
          class="ds-nav-item flex-1 justify-center md:flex-none md:justify-start"
          aria-pressed={activeTab === 'account'}
          onclick={() => activeTab = 'account'}
        >
          <User size={16} class="hidden md:block" /> {i18n.t.accountSettings.tabAccount}
        </button>
        <button
          class="ds-nav-item flex-1 justify-center md:flex-none md:justify-start"
          aria-pressed={activeTab === 'appearance'}
          onclick={() => activeTab = 'appearance'}
        >
          <Palette size={16} class="hidden md:block" /> {i18n.t.accountSettings.tabAppearance}
        </button>
        <button
          class="ds-nav-item flex-1 justify-center md:flex-none md:justify-start"
          aria-pressed={activeTab === 'data'}
          onclick={() => activeTab = 'data'}
        >
          <Database size={16} class="hidden md:block" /> {i18n.t.accountSettings.tabData}
        </button>
        {#if data.user}
        <button
          class="ds-nav-item flex-1 justify-center md:flex-none md:justify-start"
          aria-pressed={activeTab === 'integrations'}
          onclick={() => activeTab = 'integrations'}
        >
          <Link size={16} class="hidden md:block" /> {i18n.currentLang === 'de' ? 'Verbundene Konten' : 'Connected Accounts'}
        </button>
        {/if}
      </div>

      <!-- Content Area -->
      <div class="ds-scroll w-full space-y-8 overflow-y-auto pr-4 pb-8 md:w-3/4">

        {#if activeTab === 'appearance'}
          <div class="ds-section">
            <h2 class="text-lg font-semibold mb-4">{i18n.t.accountSettings.language}</h2>
            <div class="grid grid-cols-2 gap-3 mb-8">
                <button
                    class="ds-tile flex items-center gap-4 p-4 text-left"
                    aria-pressed={i18n.currentLang === 'en'}
                    onclick={() => i18n.setLang('en')}
                >
                    <div class="ds-well flex h-8 w-8 items-center justify-center text-xs font-semibold text-secondary">EN</div>
                    <span class="text-base font-semibold text-primary">English</span>
                </button>
                <button
                    class="ds-tile flex items-center gap-4 p-4 text-left"
                    aria-pressed={i18n.currentLang === 'de'}
                    onclick={() => i18n.setLang('de')}
                >
                    <div class="ds-well flex h-8 w-8 items-center justify-center text-xs font-semibold text-secondary">DE</div>
                    <span class="text-base font-semibold text-primary">Deutsch</span>
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div>
                <h2 class="text-sm font-semibold mb-3">{i18n.t.accountSettings.dateFormat}</h2>
                <select 
                  class="ds-field cursor-pointer"
                  value={i18n.dateFormat}
                  onchange={(e) => i18n.setDateFormat(e.currentTarget.value as any)}
                >
                  <option value="auto">{i18n.t.accountSettings.formatAuto}</option>
                  <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                </select>
              </div>
              <div>
                <h2 class="text-sm font-semibold mb-3">{i18n.t.accountSettings.timeFormat}</h2>
                <select 
                  class="ds-field cursor-pointer"
                  value={i18n.timeFormat}
                  onchange={(e) => i18n.setTimeFormat(e.currentTarget.value as any)}
                >
                  <option value="auto">{i18n.t.accountSettings.formatAuto}</option>
                  <option value="24h">24h (13:00)</option>
                  <option value="12h">12h (1:00 PM)</option>
                </select>
              </div>
            </div>

            <div class="flex items-center justify-between mb-4 mt-8">
              <h2 class="text-lg font-semibold">{i18n.t.dashboardSettings.theme}</h2>
              {#if data.user}
                <button 
                  onclick={() => { editingTheme = null; showThemeEditor = true; }}
                  class="ds-btn ds-btn-secondary px-3 py-1.5 text-xs"
                >
                  Create Custom Theme
                </button>
              {/if}
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {#each ALL_THEMES as theme}
                    <div class="relative">
                        <button
                            class="ds-tile flex h-full min-h-[90px] w-full flex-col justify-between gap-2 p-4 text-left"
                            aria-pressed={globalTheme === theme.id}
                            onclick={() => handleThemeChange(theme.id)}
                        >
                            <div class="pr-6 text-sm leading-tight font-semibold break-words text-primary">{theme.name}</div>
                            <div class="ds-well mt-2 flex w-fit gap-1.5 p-2">
                                {#each theme.colors as c}
                                    <div class="h-4 w-4 rounded-full border border-line-strong" style="background-color: {c}"></div>
                                {/each}
                            </div>
                        </button>

                        {#if theme.isCustom}
                          <button 
                            class="ds-icon-btn absolute top-3 right-3 bg-fill-strong p-1.5"
                            onclick={() => { editingTheme = theme.raw; showThemeEditor = true; }}
                            title="Edit Custom Theme"
                          >
                            <Palette size={14} />
                          </button>
                          
                          <button 
                            class="ds-icon-btn absolute top-3 right-11 bg-fill-strong p-1.5 hover:bg-danger hover:text-on-accent"
                            onclick={() => { handleDeleteTheme(theme.id.replace('custom_', '')); }}
                            title="Delete Custom Theme"
                          >
                            <Trash2 size={14} />
                          </button>
                        {/if}
                    </div>
                {/each}
            </div>
          </div>

          {#if showThemeEditor}
            <ThemeEditor 
              theme={editingTheme} 
              onSave={handleSaveTheme} 
              onCancel={() => showThemeEditor = false} 
              onDelete={handleDeleteTheme} 
            />
          {/if}

        {:else if activeTab === 'integrations'}
          <div class="ds-section">
            <h2 class="text-lg font-semibold mb-4">{i18n.currentLang === 'de' ? 'Verbundene Konten' : 'Connected Accounts'}</h2>

            <div class="ds-well flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
              <div class="flex items-center gap-4 w-full sm:w-auto">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-fill">
                  <svg width="24" height="24" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-primary">{i18n.t.integrations.microsoftServices}</h3>
                  {#if data.msConnected}
                    <div class="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-success">
                      <Check size={12} strokeWidth={3} /> {i18n.t.integrations.connectedActive}
                    </div>
                  {:else}
                    <div class="ds-caption mt-0.5">{i18n.t.integrations.notConnected}</div>
                  {/if}
                </div>
              </div>

              {#if data.msConnected}
                <div class="flex items-center gap-2 w-full sm:w-auto">
                  <button onclick={unlinkMicrosoft} disabled={unlinkLoading} class="ds-btn ds-btn-danger flex-1 text-xs sm:flex-none">
                    {unlinkLoading ? i18n.t.integrations.unlinking : i18n.t.integrations.unlink}
                  </button>
                  <a href="/auth/microsoft/login" data-sveltekit-reload class="ds-btn ds-btn-secondary flex-1 text-xs sm:flex-none">
                    {i18n.t.integrations.reauthorize}
                  </a>
                </div>
              {:else}
                <a href="/auth/microsoft/login" data-sveltekit-reload class="ds-btn ds-btn-primary w-full px-6 text-xs sm:w-auto">
                  {i18n.t.integrations.loginWithMicrosoft}
                </a>
              {/if}
            </div>
          </div>

        {:else if activeTab === 'data'}
          <div class="ds-section">
            <h2 class="text-lg font-semibold mb-1">{i18n.t.dashboardSettings.dataBackup}</h2>
            <p class="ds-caption mb-6">Exporitiere dein Dashboard als Backup oder importiere ein bestehendes Backup (überschreibt aktuelles Dashboard).</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label class="ds-tile group flex flex-col items-center justify-center p-6 text-center">
                    <Download size={28} class="mb-3 text-secondary transition-colors group-hover:text-accent" />
                    <span class="text-sm font-semibold text-primary">{i18n.t.dashboardSettings.import}</span>
                    <span class="ds-caption mt-1">{i18n.t.dashboardSettings.importDesc}</span>
                    <input type="file" accept=".json" class="hidden" onchange={importConfig} />
                </label>
                <button onclick={exportConfig} class="ds-tile group flex flex-col items-center justify-center p-6 text-center">
                    <Upload size={28} class="mb-3 text-secondary transition-colors group-hover:text-accent" />
                    <span class="text-sm font-semibold text-primary">{i18n.t.dashboardSettings.export}</span>
                    <span class="ds-caption mt-1">{i18n.t.dashboardSettings.exportDesc}</span>
                </button>
            </div>
          </div>

        {:else if activeTab === 'account'}
          {#if data.user}
            <!-- Email Update Section -->
            <div class="ds-section">
              <h2 class="text-lg font-semibold mb-1">{i18n.t.accountSettings.changeEmail}</h2>
              <p class="ds-caption mb-6">{i18n.t.accountSettings.currentEmail.replace('{email}', data.user?.email || '')}</p>

            {#if form?.emailError}
              <div class="ds-alert ds-alert-error mb-6" in:fade>
                {form.emailError}
              </div>
            {/if}
            {#if form?.emailSuccess}
              <div class="ds-alert ds-alert-success mb-6" in:fade>
                {form.emailSuccess}
              </div>
            {/if}

            <form method="POST" action="?/updateEmail" use:enhance={() => { emailLoading = true; return async ({ update }) => { emailLoading = false; update(); } }} class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="password_email" class="ds-label mb-1.5 ml-1 block">{i18n.t.accountSettings.currentPassword}</label>
                  <input type="password" id="password_email" name="password" required placeholder="••••••••" class="ds-input" />
                </div>
                <div>
                  <label for="email" class="ds-label mb-1.5 ml-1 block">{i18n.t.accountSettings.newEmail}</label>
                  <input type="email" id="email" name="email" required placeholder="new@example.com" class="ds-input" />
                </div>
              </div>
              <button type="submit" disabled={emailLoading} class="ds-btn ds-btn-primary px-6 active:scale-[0.98]">
                {emailLoading ? '...' : i18n.t.accountSettings.updateEmailBtn}
              </button>
            </form>
          </div>

          <!-- Password Update Section -->
          <div class="ds-section mt-8">
            <h2 class="text-lg font-semibold mb-1">{i18n.t.accountSettings.changePassword}</h2>
            <p class="ds-caption mb-6">{i18n.t.accountSettings.passwordDesc}</p>

            {#if form?.passwordError}
              <div class="ds-alert ds-alert-error mb-6" in:fade>
                {form.passwordError}
              </div>
            {/if}
            {#if form?.passwordSuccess}
              <div class="ds-alert ds-alert-success mb-6" in:fade>
                {form.passwordSuccess}
              </div>
            {/if}

            <form method="POST" action="?/updatePassword" use:enhance={() => { passwordLoading = true; return async ({ update }) => { passwordLoading = false; update(); } }} class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="oldPassword" class="ds-label mb-1.5 ml-1 block">{i18n.t.accountSettings.currentPassword}</label>
                  <input type="password" id="oldPassword" name="oldPassword" required placeholder="••••••••" class="ds-input" />
                </div>
                <div>
                  <label for="newPassword" class="ds-label mb-1.5 ml-1 block">{i18n.t.accountSettings.newPassword}</label>
                  <input type="password" id="newPassword" name="newPassword" required placeholder="••••••••" class="ds-input" />
                </div>
              </div>

              <button type="submit" disabled={passwordLoading} class="ds-btn ds-btn-primary px-6 active:scale-[0.98]">
                {passwordLoading ? '...' : i18n.t.accountSettings.updatePasswordBtn}
              </button>
            </form>
          </div>

          <!-- Delete Account Section -->
          <div class="ds-section-danger mt-8">
            <h2 class="mb-1 flex items-center gap-2 text-lg font-semibold text-danger">
              <AlertTriangle size={18} /> {i18n.t.accountSettings.deleteAccount}
            </h2>
            <p class="mb-6 text-xs text-danger/70">{i18n.t.accountSettings.deleteAccountDesc}</p>

            {#if form?.deleteError}
              <div class="ds-alert ds-alert-error mb-6" in:fade>
                {form.deleteError}
              </div>
            {/if}

            <form method="POST" action="?/deleteAccount" use:enhance={() => { deleteLoading = true; return async ({ update }) => { deleteLoading = false; update(); } }} class="space-y-4">
              <div>
                <label for="delete_password" class="ds-label mb-1.5 ml-1 block text-danger">{i18n.t.accountSettings.passwordToConfirm}</label>
                <input type="password" id="delete_password" name="password" required placeholder="••••••••" class="ds-input border-danger/30 text-danger" />
              </div>

              <button type="submit" disabled={deleteLoading} onclick={(e) => { if(!confirm(i18n.t.accountSettings.deleteAccountConfirm)) e.preventDefault(); }} class="ds-btn ds-btn-danger px-6 active:scale-[0.98]">
                {deleteLoading ? '...' : i18n.t.accountSettings.deleteAccountBtn}
              </button>
            </form>
          </div>

          <!-- Sign Out Section -->
          <div class="mt-12 flex justify-center border-t border-line pt-8 md:justify-start">
              <button onclick={handleLogout} type="button" class="ds-btn ds-btn-ghost px-6 py-3">
                <LogOut size={18} /> {i18n.t.accountSettings.signOut}
              </button>
          </div>

          {:else}
          <!-- Not Logged In Section -->
          <div class="ds-section p-8 text-center">
            <User size={48} class="mx-auto mb-4 text-muted" />
            <h2 class="mb-2 text-2xl font-semibold tracking-tight text-primary">{i18n.t.dashboardSettings.localMode}</h2>
            <p class="mx-auto mb-8 max-w-md text-sm text-secondary">{i18n.t.dashboardSettings.signInToSync}</p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login?signup=true" class="ds-btn ds-btn-primary w-full px-8 py-3 sm:w-auto">
                <UserPlus size={18} /> {i18n.t.login.signUpBtn}
              </a>
              <a href="/login" class="ds-btn ds-btn-secondary w-full px-8 py-3 sm:w-auto">
                <LogIn size={18} /> {i18n.t.login.signInBtn}
              </a>
            </div>
          </div>
          {/if}
        {/if}

      </div>
    </div>

    <!-- Legal Links -->
    <div class="mt-6 flex shrink-0 items-center justify-center gap-4 border-t border-line pt-6 text-xs text-muted">
        <LegalFooter />
    </div>

  </div>
</div>

