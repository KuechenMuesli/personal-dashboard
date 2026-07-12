<script lang="ts">
  import { onMount, setContext } from "svelte";
  import { scale } from 'svelte/transition';
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import OnboardingTour from "$lib/components/OnboardingTour.svelte";
  import type { StoredWidget } from '../types/stored-widget';
  import {Check, Download, GripHorizontal, Pencil, Plus, Settings, Upload, X, Palette, LogIn, LogOut, Search} from "lucide-svelte";
  import { i18n } from '$lib/i18n/i18n.svelte';

  let { data } = $props();
  let session = $derived(data.session);
  let supabase = $derived(data.supabase);

  // Global secrets state accessible by widgets
  let globalSecrets = $state<Record<string, any>>({});
  setContext('secrets', () => globalSecrets);

  let widgets = $derived({
    searchbar:        { name: i18n.t.widgets.searchbar, load: () => import("$lib/widgets/Searchbar.svelte"), defaultSize: { width: 2, height: 2 }, hasSettings: true },
    favorites:        { name: i18n.t.widgets.favorites, load: () => import("$lib/widgets/Favorites.svelte"), defaultSize: { width: 2, height: 2 }, hasSettings: true },
    note:             { name: i18n.t.widgets.note, load: () => import("$lib/widgets/Note.svelte"), defaultSize: { width: 2, height: 5 }, hasSettings: false },
    parcel:           { name: i18n.t.widgets.parcel, load: () => import("$lib/widgets/Parcel.svelte"), defaultSize: { width: 1, height: 5 }, hasSettings: true },
    trmnl:            { name: i18n.t.widgets.trmnl, load: () => import("$lib/widgets/Trmnl.svelte"), defaultSize: { width: 2, height: 5 }, hasSettings: true },
    clockWeatherDate: { name: i18n.t.widgets.clockWeatherDate, load: () => import("$lib/widgets/ClockWeatherDate.svelte"), defaultSize: { width: 2, height: 1 }, hasSettings: true },
    embed:            { name: i18n.t.widgets.embed, load: () => import("$lib/widgets/Embed.svelte"), defaultSize: { width: 3, height: 5 }, hasSettings: true },
    TimerStopwatch:   { name: i18n.t.widgets.timerStopwatch, load: () => import("$lib/widgets/TimerStopwatch.svelte"), defaultSize: { width: 1, height: 3 }, hasSettings: false },
    sketch:           { name: i18n.t.widgets.sketch, load: () => import("$lib/widgets/Sketch.svelte"), defaultSize: { width: 3, height: 5 }, hasSettings: false },
    colorPicker:      { name: i18n.t.widgets.colorPicker, load: () => import("$lib/widgets/ColorPicker.svelte"), defaultSize: { width: 1, height: 3 }, hasSettings: false },
    newtorkMetrics:   { name: i18n.t.widgets.networkMetrics, load: () => import("$lib/widgets/NetworkMetrics.svelte"), defaultSize: { width: 1, height: 3 }, hasSettings: false },
    calendar:         { name: i18n.t.widgets.calendar, load: () => import("$lib/widgets/Calendar.svelte"), defaultSize: { width: 2, height: 4 }, hasSettings: true },
    stockTicker:      { name: i18n.t.widgets.stockTicker, load: () => import("$lib/widgets/StockTicker.svelte"), defaultSize: { width: 2, height: 4 }, hasSettings: true },
    todo:             { name: i18n.t.widgets.todo, load: () => import("$lib/widgets/Todo.svelte"), defaultSize: { width: 2, height: 4 }, hasSettings: true },
    loginPrompt:      { name: 'Login', load: () => import("$lib/widgets/LoginPrompt.svelte"), defaultSize: { width: 2, height: 1 }, hasSettings: false, systemOnly: true },
  });

  const STORAGE_KEY = "dashboard-layout";

  let dashboardLayout = $state<(StoredWidget & { showSettings: boolean })[]>([]);
  let currentLayoutId = $state<string | null>(null);
  let draggingId = $state<string | null>(null);
  let resizingId = $state<string | null>(null);
  let isEditing = $state(false);
  let showPickerDialog = $state(false);
  let widgetSearchQuery = $state('');
  let selectedWidgetIndex = $state(0);
  let widgetStates = $state<Record<string, { hidden: boolean }>>({});

  let filteredWidgets = $derived(
    Object.entries(widgets).filter(([_, config]) => !(config as any).systemOnly && config.name.toLowerCase().includes(widgetSearchQuery.toLowerCase()))
  );

  $effect(() => {
    widgetSearchQuery;
    selectedWidgetIndex = 0;
  });

  $effect(() => {
    if (!showPickerDialog) {
      widgetSearchQuery = '';
      selectedWidgetIndex = 0;
    }
  });

  let widgetGridContainer: HTMLElement;

  function handleWidgetSearchKeydown(e: KeyboardEvent) {
    if (filteredWidgets.length === 0) return;

    let columns = 1;
    if (widgetGridContainer && widgetGridContainer.children.length > 1) {
      const firstY = (widgetGridContainer.children[0] as HTMLElement).offsetTop;
      for (let i = 1; i < widgetGridContainer.children.length; i++) {
        if ((widgetGridContainer.children[i] as HTMLElement).offsetTop > firstY) {
          columns = i;
          break;
        }
      }
      if (columns === 1 && (widgetGridContainer.children[widgetGridContainer.children.length - 1] as HTMLElement).offsetTop === firstY) {
        columns = widgetGridContainer.children.length;
      }
    }

    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      selectedWidgetIndex = (selectedWidgetIndex + 1) % filteredWidgets.length;
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      selectedWidgetIndex = (selectedWidgetIndex - 1 + filteredWidgets.length) % filteredWidgets.length;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedWidgetIndex = Math.min(selectedWidgetIndex + columns, filteredWidgets.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedWidgetIndex = Math.max(selectedWidgetIndex - columns, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      addWidget(filteredWidgets[selectedWidgetIndex][0]);
    }
  }

  let showOnboarding = $state(false);

  let THEMES = $derived([
    { id: 'theme-default', name: i18n.t.themes.default, colors: ['#121212', '#262626', '#3b82f6'] },
    { id: 'theme-oled', name: i18n.t.themes.oled, colors: ['#000000', '#0a0a0a', '#38bdf8'] },
    { id: 'theme-midnight', name: i18n.t.themes.midnight, colors: ['#020617', '#0f172a', '#818cf8'] },
    { id: 'theme-hacker', name: i18n.t.themes.hacker, colors: ['#050505', '#022c22', '#10b981'] },
    { id: 'theme-sunset', name: i18n.t.themes.sunset, colors: ['#2a111a', '#3a1623', '#f43f5e'] },
    { id: 'theme-light', name: i18n.t.themes.light, colors: ['#f4f4f5', '#ffffff', '#2563eb'] },
    { id: 'theme-paper', name: i18n.t.themes.paper, colors: ['#fdf6e3', '#eee8d5', '#268bd2'] }
  ]);
  let globalTheme = $state('theme-default');

  onMount(async () => {
    // 1. Load local state into memory immediately (Optimistic UI)
    const hasLocal = !!localStorage.getItem(STORAGE_KEY);
    const isDefault = localStorage.getItem('dashboard-is-default') === 'true';

    if (hasLocal) {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        dashboardLayout = parsed.map((w: any) => ({ ...w, showSettings: false }));

        // Auto-remove login prompt if user is logged in
        if (session) {
           dashboardLayout = dashboardLayout.filter((w: any) => w.type !== 'loginPrompt');
        }
      } catch (e) { console.error(e); }
    }

    const savedTheme = localStorage.getItem('dashboard-theme');
    if (savedTheme) globalTheme = savedTheme;

    // 2. Background Sync
    if (session && supabase) {
      const [layoutsRes, secretsRes] = await Promise.all([
        supabase
          .from('layouts')
          .select(`
            id, theme, updated_at,
            widgets ( id, type, x, y, w, h )
          `)
          .eq('user_id', session.user.id)
          .order('is_active', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_secrets')
          .select('secrets')
          .eq('user_id', session.user.id)
          .maybeSingle()
      ]);

      const dbData = layoutsRes.data;
      if (secretsRes.data?.secrets) {
         globalSecrets = secretsRes.data.secrets;
      }

      if (dbData) {
        currentLayoutId = dbData.id;
        const remoteThemeObj = dbData.theme as any || {};
        const remoteTimestamp = new Date(dbData.updated_at).getTime();
        const localTimestamp = Number(localStorage.getItem('dashboard-timestamp')) || 0;

        // If cloud is newer, OR local is missing, OR local is just the untouched default
        if (remoteTimestamp > localTimestamp || !hasLocal || isDefault) {
          if (dbData.widgets) {
            const layout = dbData.widgets.map((w: any) => {
              const c = w.custom_data || {};
              if (c.calendarViewmode) localStorage.setItem(`calendar-viewmode-${w.id}`, c.calendarViewmode);
              if (c.generalSettings) localStorage.setItem(`general-settings-${w.id}`, c.generalSettings);
              if (c.colorpicker) localStorage.setItem(`colorpicker-${w.id}`, c.colorpicker);
              if (c.webviewSettings) localStorage.setItem(`webview-settings-${w.id}`, c.webviewSettings);
              if (c.favoritesSettings) localStorage.setItem(`favorites-settings-${w.id}`, c.favoritesSettings);
              if (c.noteSettings) localStorage.setItem(`note-settings-${w.id}`, c.noteSettings);
              if (c.noteMode) localStorage.setItem(`note-mode-${w.id}`, c.noteMode);
              if (c.parcelSettings) localStorage.setItem(`parcel-settings-${w.id}`, c.parcelSettings);
              if (c.searchHistory) localStorage.setItem(`search-history-${w.id}`, c.searchHistory);
              if (c.searchSettings) localStorage.setItem(`search-settings-${w.id}`, c.searchSettings);
              if (c.stockSettings) localStorage.setItem(`stock-settings-${w.id}`, c.stockSettings);
              if (c.timerSettings) localStorage.setItem(`timer-settings-${w.id}`, c.timerSettings);

              return { id: w.id, type: w.type, x: w.x, y: w.y, width: w.w, height: w.h, showSettings: false };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
            dashboardLayout = layout;
          }
          if (remoteThemeObj.theme) {
            localStorage.setItem('dashboard-theme', remoteThemeObj.theme);
            globalTheme = remoteThemeObj.theme;
          }
          localStorage.setItem('dashboard-timestamp', remoteTimestamp.toString());
          localStorage.setItem('dashboard-layout-id', currentLayoutId as string);
          localStorage.removeItem('dashboard-is-default');
          return;
        } else if (localTimestamp > remoteTimestamp) {
          syncUp();
        }
      } else {
        if (!hasLocal) {
          generateWelcomeLayout();
        } else {
          syncUp();
        }
      }
    } else {
      // User is offline or login failed
      // Clear local state if it's not the default layout to prevent data leaks
      if (hasLocal && !isDefault) {
          localStorage.clear();
          window.location.reload();
          return;
      }
      if (!hasLocal) {
        generateWelcomeLayout();
        showOnboarding = true;
      }
    }
  });

  function generateWelcomeLayout() {
      const loginId = crypto.randomUUID();
      const searchId = crypto.randomUUID();
      const clockId = crypto.randomUUID();

      const COLUMNS = 9;
      dashboardLayout = [
        { id: loginId, type: 'loginPrompt', x: COLUMNS - 2, y: 0, width: 2, height: 1, showSettings: false },
        { id: searchId, type: 'searchbar', x: Math.floor((COLUMNS - 3) / 2), y: 1, width: 3, height: 2, showSettings: false },
        { id: clockId, type: 'clockWeatherDate', x: Math.floor((COLUMNS - 3) / 2), y: 0, width: 3, height: 1, showSettings: false }
      ];

      save();
      // Mark as default layout so it gets overwritten when the user logs in and pulls from the cloud
      localStorage.setItem('dashboard-is-default', 'true');
  }

  async function syncUp() {
    if (!session || !supabase) return;
    const timestamp = Date.now();
    localStorage.setItem('dashboard-timestamp', timestamp.toString());

    if (!currentLayoutId) {
       currentLayoutId = localStorage.getItem('dashboard-layout-id');
    }

    const themeObj = { theme: globalTheme };

    if (!currentLayoutId) {
      const { data } = await supabase.from('layouts').insert({
        user_id: session.user.id,
        name: 'Main Layout',
        is_active: true,
        theme: themeObj,
        updated_at: new Date().toISOString()
      }).select('id').single();

      if (data) {
        currentLayoutId = data.id;
        localStorage.setItem('dashboard-layout-id', currentLayoutId as string);
      }
    } else {
      const { error: updateError } = await supabase.from('layouts').update({
        theme: themeObj,
        is_active: true,
        updated_at: new Date().toISOString()
      }).eq('id', currentLayoutId);

      if (updateError) {
        console.error("Failed to update layout:", updateError);
        alert("Cloud Sync Fehler (Layout): " + updateError.message);
      }
    }

    if (currentLayoutId) {
      const widgetsToUpsert = dashboardLayout.map(w => {
        const custom_data: any = {};

        const calendarViewmode = localStorage.getItem(`calendar-viewmode-${w.id}`);
        if (calendarViewmode) custom_data.calendarViewmode = calendarViewmode;

        const generalSettings = localStorage.getItem(`general-settings-${w.id}`);
        if (generalSettings) custom_data.generalSettings = generalSettings;

        const colorpicker = localStorage.getItem(`colorpicker-${w.id}`);
        if (colorpicker) custom_data.colorpicker = colorpicker;

        const webviewSettings = localStorage.getItem(`webview-settings-${w.id}`);
        if (webviewSettings) custom_data.webviewSettings = webviewSettings;

        const favoritesSettings = localStorage.getItem(`favorites-settings-${w.id}`);
        if (favoritesSettings) custom_data.favoritesSettings = favoritesSettings;

        const noteSettings = localStorage.getItem(`note-settings-${w.id}`);
        if (noteSettings) custom_data.noteSettings = noteSettings;

        const noteMode = localStorage.getItem(`note-mode-${w.id}`);
        if (noteMode) custom_data.noteMode = noteMode;

        const parcelSettings = localStorage.getItem(`parcel-settings-${w.id}`);
        if (parcelSettings) custom_data.parcelSettings = parcelSettings;

        const searchHistory = localStorage.getItem(`search-history-${w.id}`);
        if (searchHistory) custom_data.searchHistory = searchHistory;

        const searchSettings = localStorage.getItem(`search-settings-${w.id}`);
        if (searchSettings) custom_data.searchSettings = searchSettings;

        const stockSettings = localStorage.getItem(`stock-settings-${w.id}`);
        if (stockSettings) custom_data.stockSettings = stockSettings;

        const timerSettings = localStorage.getItem(`timer-settings-${w.id}`);
        if (timerSettings) custom_data.timerSettings = timerSettings;

        return {
          id: w.id,
          layout_id: currentLayoutId,
          type: w.type,
          x: w.x,
          y: w.y,
          w: w.width,
          h: w.height,
          custom_data
        };
      });

      // Upsert widgets
      if (widgetsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('widgets').upsert(widgetsToUpsert);
        if (upsertError) {
          console.error("Failed to upsert widgets:", upsertError);
          alert("Cloud Sync Fehler (Widgets): " + upsertError.message);
        }
      }

      // Delete widgets that are no longer in the layout
      const currentIds = widgetsToUpsert.map(w => w.id);

      const { data: existingWidgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('layout_id', currentLayoutId);

      if (existingWidgets) {
        const idsToDelete = existingWidgets
          .map(w => w.id)
          .filter(id => !currentIds.includes(id));

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('widgets')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error("Failed to delete old widgets:", deleteError);
          }
        }
      }
    }
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.body.className = globalTheme;
      localStorage.setItem('dashboard-theme', globalTheme);
    }
  });

  let containerWidth = $state(0);
  let columns = $derived(containerWidth < 640 ? 2 : containerWidth < 1024 ? 3 : 9);
  let colPixelWidth = $derived(containerWidth / columns);
  const ROW_HEIGHT = 50;
  const PREVIEW_UNIT_W = 16;
  const PREVIEW_UNIT_H = 4;

  let grabOffset = { x: 0, y: 0 };
  let initialPos = { x: 0, y: 0, w: 0, h: 0 };
  let lastProcessedTime = 0;


  let activeLayout = $derived.by(() => {
    if (columns >= 9) return dashboardLayout;

    let packedLayout: (typeof dashboardLayout[0])[] = [];

    const sorted = [...dashboardLayout].sort((a, b) => {
      const pA = a.type === 'searchbar' ? 0 : a.type === 'favorites' ? 1 : 2;
      const pB = b.type === 'searchbar' ? 0 : b.type === 'favorites' ? 1 : 2;

      if (pA !== pB) return pA - pB;

      return a.y - b.y || a.x - b.x;
    });

    for (const w of sorted) {
      const mobileWidget = { ...w, width: Math.min(w.width, columns) };

      let y = 0;
      let placed = false;

      while (!placed) {
        for (let x = 0; x <= columns - mobileWidget.width; x++) {
          const potential = { ...mobileWidget, x, y };
          const hasCollision = packedLayout.some(existing => isOverlapping(potential, existing));

          if (!hasCollision) {
            mobileWidget.x = x;
            mobileWidget.y = y;
            packedLayout.push(mobileWidget);
            placed = true;
            break;
          }
        }
        if (!placed) y++;
      }
    }

    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const w of packedLayout) {
        if (w.x + w.width < columns) {
          const potentialRect = { x: w.x + w.width, y: w.y, width: 1, height: w.height };
          const hasCollision = packedLayout.some(existing => existing !== w && isOverlapping(potentialRect, existing));
          if (!hasCollision) {
            w.width += 1;
            expanded = true;
          }
        }
      }
    }

    return packedLayout;
  });

  // Remove the effect that forces isEditing = false on mobile

  async function handleLogout() {
    localStorage.clear();
    if (supabase) await supabase.auth.signOut();
    window.location.reload();
  }

  function save() {
    const toSave = dashboardLayout.map(({ showSettings, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    localStorage.setItem('dashboard-timestamp', Date.now().toString());
    localStorage.removeItem('dashboard-is-default');
    if (session) syncUp();
  }

  function isOverlapping(w1: any, w2: any) {
    return (w1.x < w2.x + w2.width && w1.x + w1.width > w2.x && w1.y < w2.y + w2.height && w1.y + w1.height > w2.y);
  }

  function findFirstAvailableSpace(width: number, height: number): { x: number, y: number } {
    let y = 0;
    while (true) {
      for (let x = 0; x <= columns - width; x++) {
        const potential = { x, y, width, height };
        const hasCollision = dashboardLayout.some(existing => isOverlapping(potential, existing));
        if (!hasCollision) return { x, y };
      }
      y++;
      if (y > 1000) return { x: 0, y: 0 };
    }
  }

  function addWidget(type: string) {
    const config = widgets[type as keyof typeof widgets];
    const { width, height } = config.defaultSize;
    const { x, y } = findFirstAvailableSpace(width, height);

    const newWidget = {
      id: crypto.randomUUID() as any,
      type, x, y, width, height,
      showSettings: false
    };

    dashboardLayout.push(newWidget);
    save();
    showPickerDialog = false;
  }

  function deleteWidget(id: string) {
    dashboardLayout = dashboardLayout.filter(w => w.id !== id);

    if (widgetStates[id]) delete widgetStates[id];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(id)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    save();
  }

  function startInteraction(e: MouseEvent | TouchEvent, id: string, mode: 'drag' | 'resize') {
    if (e.cancelable) e.preventDefault();
    if (containerWidth < 640) return;

    const widget = dashboardLayout.find(w => w.id === id);
    if (!widget) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    initialPos = { x: widget.x, y: widget.y, w: widget.width, h: widget.height };

    if (mode === 'drag') {
      const rect = (e.target as HTMLElement).closest('.widget-wrapper')?.getBoundingClientRect();
      if (!rect) return;
      draggingId = id;
      grabOffset.x = clientX - rect.left;
      grabOffset.y = clientY - rect.top;
    } else {
      resizingId = id;
      grabOffset.x = clientX;
      grabOffset.y = clientY;
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopInteraction);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stopInteraction);
  }


  function handleMove(e: MouseEvent | TouchEvent) {
    if (draggingId || resizingId) {
      if (e.cancelable) e.preventDefault();
    }
    const container = document.getElementById('grid-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const index = dashboardLayout.findIndex(w => w.id === (draggingId || resizingId));
    if (index === -1) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (draggingId) {
      let targetX = (clientX - rect.left - grabOffset.x) / colPixelWidth;
      let targetY = (clientY - rect.top - grabOffset.y) / ROW_HEIGHT;
      dashboardLayout[index].x = Math.max(0, Math.min(targetX, columns - dashboardLayout[index].width));
      dashboardLayout[index].y = Math.max(0, targetY);
    } else if (resizingId) {
      const deltaX = (clientX - grabOffset.x) / colPixelWidth;
      const deltaY = (clientY - grabOffset.y) / ROW_HEIGHT;
      dashboardLayout[index].width = Math.max(1, Math.min(initialPos.w + deltaX, columns - dashboardLayout[index].x));
      dashboardLayout[index].height = Math.max(1, initialPos.h + deltaY);
    }
  }

  function stopInteraction() {
    const id = draggingId || resizingId;
    if (id) {
      const index = dashboardLayout.findIndex(w => w.id === id);
      const widget = dashboardLayout[index];

      const snapped = {
        ...widget,
        x: Math.round(widget.x),
        y: Math.round(widget.y),
        width: Math.round(widget.width),
        height: Math.round(widget.height)
      };

      const hasCollision = dashboardLayout.some(w => w.id !== id && isOverlapping(snapped, w));

      if (hasCollision) {
        dashboardLayout[index].x = initialPos.x;
        dashboardLayout[index].y = initialPos.y;
        dashboardLayout[index].width = initialPos.w;
        dashboardLayout[index].height = initialPos.h;
      } else {
        dashboardLayout[index].x = snapped.x;
        dashboardLayout[index].y = snapped.y;
        dashboardLayout[index].width = snapped.width;
        dashboardLayout[index].height = snapped.height;
        save();
      }
    }
    if (draggingId) {
      dashboardLayout = dashboardLayout.map(w => ({...w, tempX: undefined, tempY: undefined}));
    }
    draggingId = null;
    resizingId = null;
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', stopInteraction);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', stopInteraction);
  }

  function handleInternalDrag(e: MouseEvent | TouchEvent, id: string) {
    startInteraction(e, id, 'drag');
  }

  function handleInternalResize(e: MouseEvent | TouchEvent, id: string) {
    startInteraction(e, id, 'resize');
  }

  function debounceAction(fn: () => void) {
    const now = Date.now();
    if (now - lastProcessedTime < 300) return;
    lastProcessedTime = now;
    fn();
  }

  function toggleSettings(id: string) {
    const index = dashboardLayout.findIndex(w => w.id === id);
    if (index !== -1) {
      dashboardLayout[index].showSettings = !dashboardLayout[index].showSettings;
    }
  }

  function exportConfig() {
    const config: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Skip Supabase auth tokens so we don't accidentally export credentials
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

        if (!config[STORAGE_KEY]) {
          alert("Invalid configuration file.");
          return;
        }

        if (confirm("This will overwrite your current layout and settings. Continue?")) {
          // Backup auth tokens to avoid logging out the user
          const authTokens: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
              authTokens[key] = localStorage.getItem(key)!;
            }
          }

          localStorage.clear();

          // Restore auth tokens
          Object.entries(authTokens).forEach(([k, v]) => localStorage.setItem(k, v));

          // Import config
          Object.entries(config).forEach(([key, value]) => {
            if (key !== 'dashboard-timestamp') {
              localStorage.setItem(key, value as string);
            }
          });

          // Force a new timestamp so the imported config is newer than the cloud config
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
</script>

<div
		id="grid-container"
		class="relative h-screen w-screen overflow-x-hidden overflow-y-auto font-sans text-slate-200"
		bind:clientWidth={containerWidth}
>
	{#if isEditing}
		<div
				class="pointer-events-none absolute inset-0 grid h-full w-full"
				style="grid-template-columns: repeat({columns}, 1fr);"
		>
			{#each Array(columns) as _}
				<div class="h-full border-r border-white/5"></div>
			{/each}
		</div>
	{/if}

	{#each activeLayout as sw (sw.id)}
		{@const widgetDef = widgets[sw.type as keyof typeof widgets]}
		{@const isHidden = widgetStates[sw.id]?.hidden && !isEditing}

		<div
				class="widget-wrapper absolute p-2 box-border will-change-[transform,width,height]
             {draggingId === sw.id || resizingId === sw.id ? 'z-[100] transition-none' : 'z-10 transition-[transform,width,height] duration-200'}
             {isHidden ? 'pointer-events-none' : ''}"
        data-widget-type={sw.type}
				style="
        width: {(sw.width / columns) * 100}%;
        height: {sw.height * ROW_HEIGHT}px;
        transform: translate3d({(sw.x / columns) * containerWidth}px, {sw.y * ROW_HEIGHT}px, 0);
        display: {isHidden ? 'none' : 'block'};
      "
		>
			<div class="relative flex h-full flex-col overflow-hidden rounded-lg {isEditing ? 'border border-dashed border-blue-500/40 bg-neutral-900/50' : ''}">
        {#if !widgetDef}
           <div class="flex h-full w-full flex-col items-center justify-center gap-2 text-red-500 text-sm p-4 text-center bg-red-900/10 border border-red-500/20 rounded-lg relative">
              <span class="font-bold">Unbekanntes Widget</span>
              <span class="text-xs text-red-400 opacity-70">Das Widget '{sw.type}' existiert nicht mehr.</span>
              {#if isEditing}
                <button
                    class="pointer-events-auto mt-2 flex h-8 px-3 items-center justify-center rounded bg-red-900/40 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                    onclick={() => debounceAction(() => deleteWidget(sw.id))}
                >
                  Löschen
                </button>
              {/if}
           </div>
        {:else}
				{#if isEditing}
					<div class="absolute top-0 left-0 right-0 z-50 flex items-center gap-1 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md px-2 py-1">
						{#if widgetDef.hasSettings}
						<button
								class="widget-settings-btn pointer-events-auto flex h-6 w-6 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-800 hover:text-white"
								onclick={() => debounceAction(() => toggleSettings(sw.id))}
						>
							<Settings size={16} strokeWidth={1} />
						</button>
						{/if}
						<GripHorizontal
								size={16}
								strokeWidth={1}
								onmousedown={(e) => startInteraction(e, sw.id, 'drag')}
								ontouchstart={(e) => startInteraction(e, sw.id, 'drag')}
								class="flex-grow cursor-grab touch-none text-center text-xs font-bold text-neutral-500 select-none active:cursor-grabbing pointer-events-auto"
						/>
						<button
								class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-red-900/40 hover:text-red-400"
								onclick={() => debounceAction(() => deleteWidget(sw.id))}
						>
							<X size={16} />
						</button>
					</div>

					<div
							class="absolute bottom-0 right-0 z-50 h-5 w-5 cursor-nwse-resize touch-none rounded-br-lg bg-gradient-to-br from-transparent from-50% to-blue-500/40 to-50%"
							onmousedown={(e) => startInteraction(e, sw.id, 'resize')}
							ontouchstart={(e) => startInteraction(e, sw.id, 'resize')}
							role="presentation"
					></div>
				{/if}

				<div class="h-full w-full overflow-hidden">
					{#await widgetDef.load() then module}
						{@const Widget = module.default}
						<!-- @ts-ignore: Dynamic widget prop injection mismatch -->
						<Widget
								id={sw.id}
								isEditing={isEditing}
								width={sw.width}
								height={sw.height}
								onDragStart={(e: any) => handleInternalDrag(e, sw.id)}
								onResizeStart={(e: any) => handleInternalResize(e, sw.id)}
								onAddNote={() => addWidget('note')}
								onDelete={() => debounceAction(() => deleteWidget(sw.id))}
								bind:showSettings={sw.showSettings}
								bind:hidden={() => widgetStates[sw.id]?.hidden ?? false, (v) => {
             if(!widgetStates[sw.id]) widgetStates[sw.id] = { hidden: false };
             widgetStates[sw.id].hidden = v;
           }}
						/>
					{:catch error}
						<div class="flex h-full w-full flex-col items-center justify-center gap-2 text-red-500 text-sm p-4 text-center bg-red-900/10">
							<span class="font-bold">Fehler</span>
							<span class="text-xs text-red-400">Widget konnte nicht geladen werden.</span>
						</div>
					{/await}
				</div>
        {/if}
			</div>
		</div>
	{/each}
</div>

	<div class="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[1000] flex flex-row md:flex-col gap-3 md:gap-4 items-center">
		<a
				href="/settings"
        id="settings-btn"
				class="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white shadow-2xl transition-transform hover:scale-105"
				title="Settings"
		>
			<Settings class="w-5 h-5 md:w-6 md:h-6" />
		</a>

		{#if isEditing}
			<button
          id="add-widget-btn"
					transition:scale={{ duration: 200, start: 0.5 }}
					class="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white shadow-2xl transition-transform hover:scale-105"
					onclick={() => debounceAction(() => showPickerDialog = true)}
			><Plus class="w-5 h-5 md:w-6 md:h-6" /></button>
		{/if}

		<button
        id="edit-mode-btn"
				class="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full text-white shadow-2xl transition-all hover:scale-105 bg-neutral-800"
				onclick={() => debounceAction(() => isEditing = !isEditing)}
		>
			{#if isEditing}
				<Check class="w-5 h-5 md:w-6 md:h-6" />
			{:else}
				<Pencil class="w-5 h-5 md:w-6 md:h-6" />
			{/if}
		</button>
	</div>

<SettingsDialog title={i18n.t.dashboardSettings.addWidget} bind:show={showPickerDialog} maxWidth="max-w-[900px]" fixedHeight={true}>
	<div class="mb-6 relative shrink-0">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
		<input 
			type="text" 
			bind:value={widgetSearchQuery} 
			onkeydown={handleWidgetSearchKeydown}
			placeholder={i18n.t.dashboardSettings.searchWidget} 
			class="w-full bg-black/40 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50" 
		/>
	</div>

	<div bind:this={widgetGridContainer} class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
		{#each filteredWidgets as [type, config], index}
			<button
					class="flex h-[140px] flex-col items-center justify-between rounded-xl border p-4 transition-all {index === selectedWidgetIndex ? 'border-blue-500 bg-neutral-800 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 'border-neutral-800 bg-neutral-800/50 hover:border-blue-500 active:bg-neutral-800'}"
					onclick={() => debounceAction(() => addWidget(type))}
			>
				<div class="pointer-events-none flex flex-1 items-center justify-center w-full">
					<div
							class="rounded-md border-2 border-blue-500/50 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
							style="width: {config.defaultSize.width * PREVIEW_UNIT_W}px; height: {config.defaultSize.height * PREVIEW_UNIT_H}px;"
					></div>
				</div>
				<span class="pointer-events-none mt-3 text-sm font-medium text-center {index === selectedWidgetIndex ? 'text-white' : 'text-neutral-300'}">{config.name}</span>
			</button>
		{/each}
	</div>
</SettingsDialog>

{#if showOnboarding}
  <OnboardingTour {isEditing} onComplete={() => { showOnboarding = false; localStorage.setItem('dashboard-onboarding-complete', 'true'); }} />
{/if}


