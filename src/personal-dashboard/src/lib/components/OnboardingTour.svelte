<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { Check, ChevronRight, X } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';

  let { onComplete, isEditing } = $props();

  let currentStep = $state(0);
  let targetRect = $state<DOMRect | null>(null);
  let isVisible = $state(false);

  const steps = $derived([
    {
      title: i18n.currentLang === 'de' ? 'Willkommen!' : 'Welcome!',
      content: i18n.currentLang === 'de' 
        ? 'Dies ist dein neues, persönliches Dashboard. Lass uns eine kurze Tour machen, um die wichtigsten Funktionen kennenzulernen!' 
        : 'This is your new personal dashboard. Let\'s take a quick tour to learn the most important features!',
      target: 'center',
    },
    {
      title: i18n.currentLang === 'de' ? 'Das smarte Suchfeld' : 'Smart Search',
      content: i18n.currentLang === 'de' 
        ? 'Das ist nicht nur eine Google-Suche! Du kannst hier auch direkt rechnen (z.B. "5 * 12") oder Einheiten konvertieren (z.B. "10 kg in lbs"). Probier es später mal aus!'
        : 'This is not just a Google search! You can also calculate (e.g. "5 * 12") or convert units (e.g. "10 kg in lbs"). Try it later!',
      target: '[data-widget-type="searchbar"]',
    },
    {
      title: i18n.currentLang === 'de' ? 'Widgets & Layout' : 'Widgets & Layout',
      content: i18n.currentLang === 'de' 
        ? 'Um das Dashboard anzupassen, gibt es den Bearbeitungsmodus. Klicke jetzt auf den Stift, um ihn zu aktivieren!'
        : 'To customize the dashboard, use the edit mode. Click the pencil icon now to activate it!',
      target: '#edit-mode-btn',
      waitForAction: 'edit_mode'
    },
    {
      title: i18n.currentLang === 'de' ? 'Widgets hinzufügen' : 'Add Widgets',
      content: i18n.currentLang === 'de' 
        ? 'Über dieses "+"-Icon kannst du neue Widgets zu deinem Dashboard hinzufügen. Probiere es später aus!'
        : 'Use this "+"-icon to add new widgets to your dashboard. Try it out later!',
      target: '#add-widget-btn',
    },
    {
      title: i18n.currentLang === 'de' ? 'Widget konfigurieren' : 'Configure Widget',
      content: i18n.currentLang === 'de' 
        ? 'Viele Widgets lassen sich anpassen. Klicke beim Wetter-Widget auf das Zahnrad, um deine Stadt einzustellen!'
        : 'Many widgets can be customized. Click the gear icon on the Weather Widget to set your city!',
      target: '[data-widget-type="clockWeatherDate"] .widget-settings-btn',
    },
    {
      title: i18n.currentLang === 'de' ? 'Einstellungen & Cloud' : 'Settings & Cloud',
      content: i18n.currentLang === 'de' 
        ? 'Hier findest du Themes und kannst dich anmelden, um dein Dashboard in der Cloud zu speichern. Viel Spaß!'
        : 'Here you can find themes and log in to save your dashboard to the cloud. Have fun!',
      target: '#settings-btn',
    }
  ]);

  $effect(() => {
    if (steps[currentStep].waitForAction === 'edit_mode' && isEditing) {
      setTimeout(() => {
        nextStep();
      }, 300); // small delay to allow transition
    }
  });

  function updateRect() {
    const step = steps[currentStep];
    if (step.target === 'center') {
      targetRect = null;
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      targetRect = el.getBoundingClientRect();
    } else {
      targetRect = null; // Element not found, fallback to center
    }
  }

  function getDialogStyle(rect: DOMRect | null) {
    if (!rect) {
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }
    
    // Dialog width is 350px
    const dialogWidth = 350;
    
    // Calculate ideal left center
    let left = rect.left + (rect.width / 2);
    // Clamp to screen edges with 20px padding
    if (left - (dialogWidth / 2) < 20) {
      left = 20 + (dialogWidth / 2);
    } else if (left + (dialogWidth / 2) > window.innerWidth - 20) {
      left = window.innerWidth - 20 - (dialogWidth / 2);
    }

    if (rect.top > window.innerHeight / 2) {
      // Show above
      return `top: ${rect.top - 20}px; left: ${left}px; transform: translate(-50%, -100%);`;
    } else {
      // Show below
      return `top: ${rect.bottom + 20}px; left: ${left}px; transform: translate(-50%, 0);`;
    }
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
      updateRect();
    } else {
      finish();
    }
  }

  function finish() {
    isVisible = false;
    onComplete();
  }

  onMount(() => {
    // Small delay to let the DOM render (especially dynamic widgets)
    setTimeout(() => {
      isVisible = true;
      updateRect();
    }, 500);

    window.addEventListener('resize', updateRect);
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateRect);
  });
</script>

{#if isVisible}
  <!-- Overlay -->
  <div class="fixed inset-0 z-[9999] pointer-events-none transition-all duration-500 overflow-hidden" transition:fade>
    <!-- Cutout overlay -->
    <div 
      class="absolute bg-transparent transition-all duration-500 ease-in-out"
      style="
        top: {targetRect ? targetRect.top - 10 : 0}px;
        left: {targetRect ? targetRect.left - 10 : 0}px;
        width: {targetRect ? targetRect.width + 20 : 0}px;
        height: {targetRect ? targetRect.height + 20 : 0}px;
        border-radius: {targetRect ? '1rem' : '0'};
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.75);
        {targetRect ? '' : 'top: 0; left: 0; width: 100%; height: 100%; box-shadow: none;'}
      "
    ></div>

    <!-- Centered Fallback Overlay if no target -->
    {#if !targetRect}
      <div class="absolute inset-0 bg-black/75"></div>
    {/if}

    <!-- Dialog Box -->
    <div 
      class="absolute bg-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl p-6 w-[350px] pointer-events-auto transition-all duration-500 ease-in-out z-[10000]"
      style={getDialogStyle(targetRect)}
    >
      <button onclick={finish} class="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
        <X size={18} />
      </button>

      <div class="flex items-center gap-2 mb-4">
        <span class="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-md">
          {currentStep + 1} / {steps.length}
        </span>
        <h3 class="font-bold text-lg text-white m-0">{steps[currentStep].title}</h3>
      </div>
      
      <p class="text-sm text-neutral-300 mb-6 leading-relaxed">
        {steps[currentStep].content}
      </p>

      {#if currentStep === 0}
        <div class="flex gap-2 mb-6">
          <button
            class="flex-1 py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all {i18n.currentLang === 'en' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700'}"
            onclick={() => i18n.setLang('en')}
          >
            🇬🇧 English
          </button>
          <button
            class="flex-1 py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all {i18n.currentLang === 'de' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700'}"
            onclick={() => i18n.setLang('de')}
          >
            🇩🇪 Deutsch
          </button>
        </div>
      {/if}

      <div class="flex justify-between items-center mt-2">
        <button onclick={finish} class="text-xs text-neutral-500 hover:text-white transition-colors">
          {i18n.currentLang === 'de' ? 'Überspringen' : 'Skip'}
        </button>
        {#if !steps[currentStep].waitForAction}
          <button 
            onclick={nextStep}
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            {#if currentStep === steps.length - 1}
              <Check size={16} /> {i18n.currentLang === 'de' ? 'Fertig' : 'Finish'}
            {:else}
              {i18n.currentLang === 'de' ? 'Weiter' : 'Next'} <ChevronRight size={16} />
            {/if}
          </button>
        {:else}
          <div class="text-xs font-bold text-blue-400 animate-pulse">{i18n.currentLang === 'de' ? 'Warte auf Aktion...' : 'Waiting for action...'}</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
