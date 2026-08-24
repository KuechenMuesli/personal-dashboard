<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount, getContext, untrack } from 'svelte';
  import { page } from '$app/stores';
  import WidgetCard from '$lib/components/WidgetCard.svelte';
  import WidgetTabs from '$lib/components/WidgetTabs.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import { CircleDot, GitPullRequest, MessageSquare, Milestone, RefreshCw } from 'lucide-svelte';

  let {
    id,
    height = 5,
    isEditing,
    showSettings = $bindable(false)
  } = $props<{
    id: string;
    height?: number;
    isEditing?: boolean;
    showSettings?: boolean;
  }>();

  const getSecrets = getContext<() => Record<string, any>>('secrets');
  const getSecretsLoaded = getContext<() => boolean>('secretsLoaded');

  const PROXY_URL = '/api/proxy';
  const SEARCH_ENDPOINT = 'https://api.github.com/search/issues';
  const USER_ENDPOINT = 'https://api.github.com/user';
  const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
  /** Bremse fuer die Verknuepfungs-Abfrage: eine Anfrage, begrenzte Query-Groesse. */
  const LINKED_PR_LOOKUP_MAX = 25;
  const COOLDOWN_MS = 2 * 60 * 1000;
  const REFRESH_MS = 10 * 60 * 1000;
  const PER_PAGE = 30;

  type Scope = 'mine' | 'repos' | 'query';
  type Involvement = 'assignee' | 'author' | 'mentions';
  type SortKey = 'updated' | 'created' | 'comments' | 'discussion';

  interface Label {
    name: string;
    color: string;
  }

  interface LinkedPr {
    number: number;
    url: string;
    title: string;
    state: 'OPEN' | 'CLOSED' | 'MERGED';
    comments: number;
    lastCommentAt: string | null;
  }

  interface Issue {
    key: string;
    number: number;
    title: string;
    url: string;
    repo: string;
    labels: Label[];
    comments: number;
    reactions: number;
    createdAt: string;
    updatedAt: string;
    author: string;
    authorAvatar: string;
    assignees: { login: string; avatar: string }[];
    milestone: string | null;
    isPr: boolean;
    isDraft: boolean;
    linkedPrs: LinkedPr[];
    lastCommentAt: string | null;
  }

  let token = $state('');
  let scope = $state<Scope>('mine');
  let reposInput = $state('');
  let customQuery = $state('is:open is:issue assignee:@me');
  let involvement = $state<Involvement>('assignee');
  let includePrs = $state(false);
  let sortKey = $state<SortKey>('updated');

  let issues = $state<Issue[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let lastSync = $state(0);

  let settingsLoaded = $state(false);
  let tokenLoaded = $state(false);
  let login = $state('');

  // Bewusst nicht reaktiv: reine Sperren fuer den Lade-Effekt. Als $state
  // gelesen wuerde jeder Abruf den Effekt erneut ausloesen -- genau daraus
  // entstand eine Endlosschleife, als eine fehlgeschlagene Anfrage den
  // Merker fuer die zuletzt geladene Suche nicht gesetzt hat.
  let inFlight = false;
  let attemptedQuery = '';
  let attemptedAt = 0;
  let blockedQuery: string | null = null;
  let loginAttemptedFor: string | null = null;

  const repoList = $derived(
    reposInput
      .split(/[\s,]+/)
      .map((r) => r.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, ''))
      .filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r))
  );

  const baseQuery = $derived.by(() => {
    if (scope === 'query') return customQuery.trim();

    // `state:open` und `archived:false` sind die Form, die GitHubs eigene
    // Oberflaeche erzeugt. `is:open` beantwortet nur die alte Suche, die es
    // seit der Umstellung auf advanced_search nicht mehr ueberall gibt.
    const parts = ['state:open', 'archived:false'];
    // Mehrere `repo:`-Qualifier verknuepft GitHub mit ODER, mehrere andere mit UND.
    if (scope === 'repos') {
      parts.push(...repoList.map((r) => `repo:${r}`));
    } else {
      // `@me` beantwortet GitHub ohne gueltige Authentifizierung nicht mit 401,
      // sondern mit 422 "listed users cannot be searched". Der aufgeloeste
      // Login macht aus dem Sonderfall eine gewoehnliche Anfrage.
      if (!login) return '';
      parts.push(`${involvement}:${login}`);
    }
    return parts.join(' ');
  });

  const TYPE_QUALIFIER = /\bis:(issue|pull-request|pr)\b/;

  /** Die Advanced Search lehnt jede Anfrage ohne `is:issue` oder
      `is:pull-request` mit 422 ab -- beides zugleich gibt es nicht, deshalb
      sind Issues und PRs zwei Anfragen, die hier wieder zusammenlaufen. */
  const queries = $derived.by(() => {
    const base = baseQuery;
    if (!base) return [];
    if (scope === 'query') return TYPE_QUALIFIER.test(base) ? [base] : [`${base} is:issue`];
    return includePrs
      ? [`${base} is:issue`, `${base} is:pull-request`]
      : [`${base} is:issue`];
  });

  const searchQuery = $derived(queries.join(' || '));

  // Bewusst ohne searchQuery: die haengt bei "Meine Issues" am erst geladenen
  // Login, sonst zeigt die Karte kurz wieder den Konfigurieren-Knopf.
  const isConfigured = $derived(
    !!token &&
      (scope !== 'repos' || repoList.length > 0) &&
      (scope !== 'query' || !!customQuery.trim())
  );
  const isCompact = $derived(height <= 2);

  // Rastereinheiten sagen nichts ueber die tatsaechliche Breite: dieselben zwei
  // Spalten sind auf dem Handy 150px und auf dem Desktop 400px breit. Unter
  // ~300px draengen die Filter-Tabs den Kartentitel auf null.
  let pixelWidth = $state(0);
  const showHeaderTabs = $derived(scope === 'mine' && pixelWidth >= 300);

  $effect(() => {
    const secrets = getSecrets();
    const secretsLoaded = getSecretsLoaded ? getSecretsLoaded() : true;
    if (!secretsLoaded || tokenLoaded) return;

    const stored = secrets[id];
    if (stored) token = stored.token || stored;
    else if (typeof localStorage !== 'undefined') {
      // Ohne Konto gibt es keinen Cloud-Speicher; sonst waere das Widget
      // nach jedem Reload wieder unkonfiguriert.
      token = localStorage.getItem(`github-token-${id}`) || '';
    }
    tokenLoaded = true;
  });

  $effect(() => {
    const currentToken = token;
    if (!tokenLoaded || !currentToken || scope !== 'mine') return;
    untrack(() => resolveLogin(currentToken));
  });

  $effect(() => {
    const query = searchQuery;
    const ready = tokenLoaded && settingsLoaded && isConfigured;
    // untrack, damit der Effekt nur an der Suche haengt und nicht an dem,
    // was das Laden selbst schreibt (isLoading, issues, errorMessage).
    untrack(() => {
      if (ready) maybeFetch(query);
    });
  });

  function maybeFetch(query: string) {
    if (!query || inFlight || query === blockedQuery) return;
    if (query === attemptedQuery && Date.now() - attemptedAt < COOLDOWN_MS) return;
    fetchIssues(query);
  }

  async function resolveLogin(currentToken: string) {
    if (login || loginAttemptedFor === currentToken) return;
    loginAttemptedFor = currentToken;

    try {
      const res = await request(USER_ENDPOINT, currentToken);
      if (!res.ok) {
        errorMessage = await describeError(res);
        return;
      }
      const data = await res.json();
      if (data?.login) {
        login = data.login;
        errorMessage = null;
      }
    } catch (e) {
      console.error('GitHub user lookup failed', e);
      errorMessage = i18n.t.w.github.errorGeneric;
    }
  }

  onMount(() => {
    loadSettings();
    settingsLoaded = true;

    const timer = setInterval(() => {
      if (isConfigured && searchQuery !== blockedQuery) fetchIssues(searchQuery, true);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  });

  function loadSettings() {
    if (typeof localStorage === 'undefined') return;

    const saved = localStorage.getItem(`github-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.scope) scope = parsed.scope;
        if (typeof parsed.repos === 'string') reposInput = parsed.repos;
        if (typeof parsed.customQuery === 'string') customQuery = parsed.customQuery;
        if (parsed.involvement) involvement = parsed.involvement;
        if (typeof parsed.includePrs === 'boolean') includePrs = parsed.includePrs;
        if (parsed.sortKey) sortKey = parsed.sortKey;
      } catch (e) {
        console.error(e);
      }
    }

    const cached = localStorage.getItem(`github-cache-${id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Aelterer Cache kennt `linkedPrs` nicht -- ohne Vorgabe stolpert das Template.
        issues = (parsed.issues || []).map((issue: Issue) => ({
          ...issue,
          linkedPrs: issue.linkedPrs || [],
          lastCommentAt: issue.lastCommentAt ?? null
        }));
        lastSync = parsed.timestamp || 0;
        attemptedQuery = parsed.query || '';
        attemptedAt = parsed.timestamp || 0;
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function saveSettings() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        `github-settings-${id}`,
        JSON.stringify({ scope, repos: reposInput, customQuery, involvement, includePrs, sortKey })
      );
    }

    if ($page.data.session) {
      try {
        await fetch('/api/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: id, key: { token } })
        });
        localStorage.removeItem(`github-token-${id}`);
      } catch (e) {
        console.error('Failed to save secret', e);
      }
    } else if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(`github-token-${id}`, token);
      else localStorage.removeItem(`github-token-${id}`);
    }

    showSettings = false;
    blockedQuery = null;
    attemptedAt = 0;
    if (loginAttemptedFor !== token) {
      login = '';
      loginAttemptedFor = null;
    }
    if (isConfigured) fetchIssues(searchQuery, true);
  }

  function hexColor(raw: string | undefined): string {
    return /^[0-9a-f]{6}$/i.test(raw || '') ? `#${raw}` : '#6e7681';
  }

  function safeAvatar(url: string | undefined): string {
    return url && url.startsWith('https://') ? url : '';
  }

  function mapIssue(item: any): Issue {
    const repo = String(item.repository_url || '').split('/repos/')[1] || '';
    return {
      key: `${item.id}`,
      number: item.number,
      title: item.title,
      url: item.html_url,
      repo,
      labels: (item.labels || []).map((l: any) => ({ name: l.name, color: hexColor(l.color) })),
      comments: item.comments ?? 0,
      reactions: item.reactions?.total_count ?? 0,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      author: item.user?.login || '',
      authorAvatar: safeAvatar(item.user?.avatar_url),
      assignees: (item.assignees || [])
        .map((a: any) => ({ login: a.login, avatar: safeAvatar(a.avatar_url) }))
        .slice(0, 3),
      milestone: item.milestone?.title || null,
      isPr: !!item.pull_request,
      isDraft: !!item.draft,
      linkedPrs: [],
      lastCommentAt: null
    };
  }

  function request(target: string, currentToken: string, force = false) {
    return fetch(`${PROXY_URL}?target=${encodeURIComponent(target)}${force ? '&force=true' : ''}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        Accept: 'application/vnd.github+json'
      },
      cache: 'no-store'
    });
  }

  /** GitHubs eigene Meldung ist praeziser als jeder Ersatztext -- 422 nennt genau
      den Teil der Suche, den es nicht verarbeiten konnte. */
  async function describeError(res: Response): Promise<string> {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.errors?.[0]?.message || body?.message || '';
    } catch {}

    let headline = i18n.t.w.github.errorGeneric;
    if (res.status === 401) headline = i18n.t.w.github.errorAuth;
    else if (res.status === 403 || res.status === 429) headline = i18n.t.w.github.errorRate;
    else if (res.status === 422) headline = i18n.t.w.github.errorQuery;

    return detail ? `${headline} (${detail})` : headline;
  }

  /** Juengster Kommentar am Issue selbst oder an einem verknuepften PR. Ohne
      jeden Kommentar bleibt die letzte Aenderung als Ersatzwert. */
  function lastDiscussionAt(issue: Issue): number {
    const stamps = [issue.lastCommentAt, ...issue.linkedPrs.map((pr) => pr.lastCommentAt)]
      .filter((stamp): stamp is string => !!stamp)
      .map((stamp) => new Date(stamp).getTime())
      .filter((value) => !isNaN(value));

    return stamps.length ? Math.max(...stamps) : new Date(issue.updatedAt).getTime();
  }

  function sortValue(issue: Issue): number {
    if (sortKey === 'comments') return issue.comments;
    if (sortKey === 'discussion') return lastDiscussionAt(issue);
    return new Date(sortKey === 'created' ? issue.createdAt : issue.updatedAt).getTime();
  }

  // Die Reihenfolge steht erst nach der GraphQL-Abfrage fest -- als $derived
  // sortiert sie sich neu, sobald die Kommentardaten nachtroepfeln.
  const sortedIssues = $derived([...issues].sort((a, b) => sortValue(b) - sortValue(a)));

  async function fetchIssues(query = searchQuery, force = false) {
    const parts = query === searchQuery ? queries : [query];
    if (!token || !parts.length || inFlight) return;

    inFlight = true;
    attemptedQuery = query;
    attemptedAt = Date.now();
    isLoading = true;
    errorMessage = null;

    try {
      // Seriell, nicht parallel: GitHub bittet ausdruecklich darum, Anfragen
      // eines Nutzers nacheinander zu stellen -- zwei gleichzeitige Suchen
      // laufen in das Secondary Rate Limit und kommen als 403 zurueck.
      const payloads: any[] = [];
      let firstFailure: Response | null = null;

      for (const part of parts) {
        const res = await request(
          `${SEARCH_ENDPOINT}?q=${encodeURIComponent(part)}` +
            // Die Suche kann nicht nach Kommentarzeitpunkt sortieren; die
            // Feinsortierung passiert nach der GraphQL-Abfrage im Client.
            `&sort=${sortKey === 'discussion' ? 'updated' : sortKey}` +
            `&order=desc&per_page=${PER_PAGE}&advanced_search=true`,
          token,
          force
        );

        if (!res.ok) {
          firstFailure ??= res;
          continue;
        }

        const data = await res.json();
        if (Array.isArray(data?.items)) payloads.push(data);
        else firstFailure ??= res;
      }

      if (!payloads.length) {
        errorMessage = firstFailure
          ? await describeError(firstFailure)
          : i18n.t.w.github.errorGeneric;
        // Falsches Token oder unbrauchbare Suche aendert sich von allein nicht.
        // Ohne diese Sperre laeuft der Abruf gegen dieselbe Antwort weiter.
        if (firstFailure && [401, 403, 422].includes(firstFailure.status)) {
          blockedQuery = query;
        }
        return;
      }

      // Scheitert nur eine der beiden Suchen, ist das kein Grund, die Treffer
      // der anderen wegzuwerfen -- Meldung daneben, Liste bleibt stehen.
      errorMessage = firstFailure ? await describeError(firstFailure) : null;

      // Map statt Array: taucht dieselbe Nummer in beiden Antworten auf, wirft
      // der keyed each-Block sonst `each_key_duplicate` und die Karte bleibt leer.
      const merged = new Map<string, Issue>();
      for (const data of payloads) {
        for (const item of data.items) {
          const issue = mapIssue(item);
          if (!merged.has(issue.key)) merged.set(issue.key, issue);
        }
      }

      issues = [...merged.values()]
        .sort((a, b) => sortValue(b) - sortValue(a))
        .slice(0, PER_PAGE);
      blockedQuery = null;
      lastSync = Date.now();

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `github-cache-${id}`,
          JSON.stringify({ issues, timestamp: lastSync, query })
        );
      }

      loadLinkedPrs(issues, token);
    } catch (e) {
      console.error('GitHub fetch failed', e);
      errorMessage = i18n.t.w.github.errorGeneric;
    } finally {
      isLoading = false;
      inFlight = false;
    }
  }

  /** Verknuepfte PRs stehen in keiner REST-Antwort -- die Verbindung
      Issue<->PR gibt es nur als Timeline-Ereignis in der GraphQL-API.
      Eine Anfrage fuer alle Issues, per Alias gebuendelt. */
  async function loadLinkedPrs(list: Issue[], currentToken: string) {
    const targets = list.filter((issue) => !issue.isPr && issue.repo.includes('/'));
    if (!targets.length) return;

    // `comments(last: 1)` liefert beides in einem Rutsch: die Gesamtzahl und den
    // Zeitpunkt des juengsten Kommentars -- ohne die Kommentare selbst zu laden.
    const commentFields = 'comments(last: 1) { totalCount nodes { createdAt } }';
    const fields = `number url title state ${commentFields}`;
    const selection = targets.slice(0, LINKED_PR_LOOKUP_MAX).map((issue, index) => {
      const [owner, name] = issue.repo.split('/');
      return (
        `i${index}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) ` +
        `{ issue(number: ${issue.number}) { ${commentFields} timelineItems(first: 8, ` +
        `itemTypes: [CONNECTED_EVENT, CROSS_REFERENCED_EVENT]) { nodes { ` +
        `... on ConnectedEvent { subject { ... on PullRequest { ${fields} } } } ` +
        `... on CrossReferencedEvent { source { ... on PullRequest { ${fields} } } } ` +
        `} } } }`
      );
    });

    try {
      const res = await fetch(`${PROXY_URL}?target=${encodeURIComponent(GRAPHQL_ENDPOINT)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: `{ ${selection.join(' ')} }` })
      });
      if (!res.ok) return;

      const body = await res.json();
      if (!body?.data) return;

      const withLinks = list.map((issue) => ({ ...issue }));
      targets.slice(0, LINKED_PR_LOOKUP_MAX).forEach((issue, index) => {
        const payload = body.data[`i${index}`]?.issue;
        const nodes = payload?.timelineItems?.nodes || [];
        const found = new Map<string, LinkedPr>();

        for (const node of nodes) {
          const pr = node?.subject ?? node?.source;
          if (!pr?.url || typeof pr.number !== 'number') continue;
          if (!found.has(pr.url)) {
            found.set(pr.url, {
              number: pr.number,
              url: pr.url,
              title: pr.title || '',
              state: pr.state || 'OPEN',
              comments: pr.comments?.totalCount ?? 0,
              lastCommentAt: pr.comments?.nodes?.[0]?.createdAt ?? null
            });
          }
        }

        const slot = withLinks.find((candidate) => candidate.key === issue.key);
        if (slot) {
          slot.linkedPrs = [...found.values()].sort((a, b) => a.number - b.number);
          slot.lastCommentAt = payload?.comments?.nodes?.[0]?.createdAt ?? null;
        }
      });

      issues = withLinks;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `github-cache-${id}`,
          JSON.stringify({ issues, timestamp: lastSync, query: attemptedQuery })
        );
      }
    } catch (e) {
      // Nur eine Zusatzinformation: ein Fehler hier darf die Liste nicht stoeren.
      console.error('GitHub linked PR lookup failed', e);
    }
  }

  function refreshNow() {
    blockedQuery = null;
    attemptedAt = 0;
    if (scope === 'mine' && !login) {
      loginAttemptedFor = null;
      resolveLogin(token);
      return;
    }
    fetchIssues(searchQuery, true);
  }

  const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];

  function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';

    const seconds = Math.round((then - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat(i18n.dateLocale, { numeric: 'auto' });

    for (const [unit, secondsPerUnit] of RELATIVE_UNITS) {
      if (Math.abs(seconds) >= secondsPerUnit) {
        return formatter.format(Math.round(seconds / secondsPerUnit), unit);
      }
    }
    return formatter.format(Math.round(seconds / 60), 'minute');
  }

  const PR_STATE_CLASS: Record<string, string> = {
    OPEN: 'text-success',
    MERGED: 'text-accent',
    CLOSED: 'text-danger'
  };

  const involvementOptions = $derived([
    { value: 'assignee', label: i18n.t.w.github.filterAssigned },
    { value: 'author', label: i18n.t.w.github.filterCreated },
    { value: 'mentions', label: i18n.t.w.github.filterMentioned }
  ]);
</script>

{#snippet headerButtons()}
  {#if showHeaderTabs}
    <WidgetTabs options={involvementOptions} bind:selected={involvement} />
  {/if}
  <button
    class="ds-icon-btn h-5 w-5"
    onclick={refreshNow}
    disabled={isLoading}
    title={i18n.t.w.common.refresh}
  >
    <RefreshCw size={11} class={isLoading ? 'animate-spin' : ''} />
  </button>
{/snippet}

<div class="h-full w-full" bind:clientWidth={pixelWidth}>
<WidgetCard
  title={isLoading && !issues.length ? i18n.t.w.common.syncing : `${i18n.t.w.github.title}${issues.length ? ` (${issues.length})` : ''}`}
  bind:showSettings
  {isConfigured}
  headerActions={headerButtons}
>
  {#if errorMessage}
    <div class="ds-alert ds-alert-error mb-2">{errorMessage}</div>
  {/if}

  {#if !issues.length}
    <div class="flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-muted">
      <CircleDot size={22} />
      <p class="ds-caption">
        {isLoading ? i18n.t.w.common.loading : i18n.t.w.github.noIssues}
      </p>
      {#if !isLoading && !isCompact}
        <!-- Eine leere Antwort ist von "Token sieht dieses Repo nicht" sonst
             nicht zu unterscheiden. Die Suche im Klartext macht das pruefbar. -->
        <p class="ds-caption max-w-full break-words text-[10px] opacity-70">
          <span class="font-mono select-text">{queries.join('  ·  ') || '—'}</span>
          {#if login}
            <br />{i18n.t.w.github.asUser.replace('{user}', login)}
          {/if}
        </p>
        <p class="ds-caption max-w-[38ch] text-[10px] opacity-60">{i18n.t.w.github.noIssuesHint}</p>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col gap-1.5">
      {#each sortedIssues as issue (issue.key)}
        <div
          class="relative flex flex-col gap-1 rounded-lg border border-transparent bg-fill p-2 transition-colors hover:border-line hover:bg-fill-strong"
        >
          <div class="flex items-start gap-2">
            <span class="mt-[2px] shrink-0 {issue.isPr ? 'text-accent' : 'text-success'}">
              {#if issue.isPr}
                <GitPullRequest size={12} />
              {:else}
                <CircleDot size={12} />
              {/if}
            </span>
            <a
              href={issue.url}
              class="ds-focus min-w-0 flex-1 text-[12px] leading-snug font-semibold text-primary
                     before:absolute before:inset-0 before:rounded-lg before:content-['']"
            >
              {issue.title}
            </a>
            <span class="ds-numeric shrink-0 text-[10px] text-muted">#{issue.number}</span>
          </div>

          <div class="ds-caption flex items-center gap-1.5 truncate pl-[18px] text-[10px]">
            <span class="truncate">{issue.repo}</span>
            <span aria-hidden="true">·</span>
            <span class="shrink-0">{relativeTime(issue.updatedAt)}</span>
          </div>

          {#if !isCompact && issue.labels.length}
            <div class="flex flex-wrap gap-1 pl-[18px]">
              {#each issue.labels.slice(0, 4) as label (label.name)}
                <span
                  class="rounded px-1.5 py-[1px] text-[9px] leading-4 font-semibold text-primary"
                  style="background-color: color-mix(in srgb, {label.color} 20%, transparent);
                         border: 1px solid color-mix(in srgb, {label.color} 45%, transparent);"
                >{label.name}</span>
              {/each}
              {#if issue.labels.length > 4}
                <span class="text-[9px] leading-4 text-muted">+{issue.labels.length - 4}</span>
              {/if}
            </div>
          {/if}

          {#if !isCompact}
            <div class="flex items-center gap-2 pl-[18px] text-[10px] text-muted">
              {#if issue.comments}
                <span class="flex items-center gap-0.5" title={i18n.t.w.github.comments}>
                  <MessageSquare size={10} />
                  <span class="ds-numeric">{issue.comments}</span>
                </span>
              {/if}
              {#if issue.milestone}
                <span class="flex min-w-0 items-center gap-0.5" title={i18n.t.w.github.milestone}>
                  <Milestone size={10} />
                  <span class="truncate">{issue.milestone}</span>
                </span>
              {/if}
              <span class="truncate">
                {i18n.t.w.github.openedBy.replace('{user}', issue.author)}
                {relativeTime(issue.createdAt)}
              </span>
              {#if issue.assignees.length}
                <span class="ml-auto flex shrink-0 -space-x-1">
                  {#each issue.assignees as assignee (assignee.login)}
                    {#if assignee.avatar}
                      <img
                        src={assignee.avatar}
                        alt={assignee.login}
                        title={assignee.login}
                        loading="lazy"
                        class="h-4 w-4 rounded-full border border-line"
                      />
                    {/if}
                  {/each}
                </span>
              {/if}
            </div>
          {/if}

          {#if issue.linkedPrs.length}
            <div class="relative z-10 flex flex-wrap gap-1 pl-[18px]">
              {#each issue.linkedPrs as pr (pr.url)}
                <a
                  href={pr.url}
                  title="{i18n.t.w.github.linkedPr} #{pr.number}{pr.title ? ` — ${pr.title}` : ''}"
                  class="ds-focus inline-flex items-center gap-1 rounded border border-line px-1.5 py-[1px]
                         text-[9px] leading-4 font-semibold transition-colors hover:border-accent hover:text-accent
                         {PR_STATE_CLASS[pr.state] ?? 'text-secondary'}"
                >
                  <GitPullRequest size={9} />
                  <span class="ds-numeric">#{pr.number}</span>
                  {#if pr.comments}
                    <span class="flex items-center gap-0.5 text-muted" title={i18n.t.w.github.prComments}>
                      <MessageSquare size={9} />
                      <span class="ds-numeric">{pr.comments}</span>
                    </span>
                  {/if}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</WidgetCard>
</div>

<SettingsDialog
  title={i18n.t.w.github.settings}
  bind:show={showSettings}
  data={[token, scope, reposInput, customQuery, involvement, includePrs, sortKey]}
  onRevert={(r: any) => {
    token = r[0];
    scope = r[1];
    reposInput = r[2];
    customQuery = r[3];
    involvement = r[4];
    includePrs = r[5];
    sortKey = r[6];
  }}
  onSave={saveSettings}
>
  <div class="space-y-4">
    <div class="space-y-2">
      <label for="gh-token-{id}" class="ds-label block">{i18n.t.w.github.token}</label>
      <input
        id="gh-token-{id}"
        type="password"
        bind:value={token}
        placeholder="github_pat_..."
        class="ds-input"
        onkeydown={(e) => e.stopPropagation()}
      />
      <p class="ds-caption">
        {i18n.t.w.github.tokenHelp}
        <a
          href="https://github.com/settings/personal-access-tokens"
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent hover:underline">settings/personal-access-tokens</a>
      </p>
      <p class="ds-caption">
        {i18n.t.w.github.tokenHelpClassic}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent hover:underline">settings/tokens</a>
      </p>
      <p class="ds-caption opacity-70">{i18n.t.w.github.tokenHelpSso}</p>
    </div>

    <div class="space-y-2">
      <span class="ds-label block">{i18n.t.w.github.scope}</span>
      <div class="ds-segment w-full">
        <WidgetTabs
          fullWidth
          options={[
            { value: 'mine', label: i18n.t.w.github.scopeMine },
            { value: 'repos', label: i18n.t.w.github.scopeRepos },
            { value: 'query', label: i18n.t.w.github.scopeQuery }
          ]}
          bind:selected={scope}
        />
      </div>
    </div>

    {#if scope === 'mine'}
      <div class="space-y-2">
        <span class="ds-label block">{i18n.t.w.github.filter}</span>
        <div class="ds-segment w-full">
          <WidgetTabs fullWidth options={involvementOptions} bind:selected={involvement} />
        </div>
      </div>
    {:else if scope === 'repos'}
      <div class="space-y-2">
        <label for="gh-repos-{id}" class="ds-label block">{i18n.t.w.github.repos}</label>
        <textarea
          id="gh-repos-{id}"
          bind:value={reposInput}
          rows="3"
          placeholder={i18n.t.w.github.reposPlaceholder}
          class="ds-input resize-y"
          onkeydown={(e) => e.stopPropagation()}
        ></textarea>
      </div>
    {:else}
      <div class="space-y-2">
        <label for="gh-query-{id}" class="ds-label block">{i18n.t.w.github.query}</label>
        <input
          id="gh-query-{id}"
          bind:value={customQuery}
          placeholder="is:open is:issue org:sveltejs label:bug"
          class="ds-input"
          onkeydown={(e) => e.stopPropagation()}
        />
        <p class="ds-caption">{i18n.t.w.github.queryHelp}</p>
      </div>
    {/if}

    <div class="space-y-2">
      <label for="gh-sort-{id}" class="ds-label block">{i18n.t.w.github.sort}</label>
      <select id="gh-sort-{id}" bind:value={sortKey} class="ds-input cursor-pointer appearance-none">
        <option value="updated">{i18n.t.w.github.sortUpdated}</option>
        <option value="created">{i18n.t.w.github.sortCreated}</option>
        <option value="comments">{i18n.t.w.github.sortComments}</option>
        <option value="discussion">{i18n.t.w.github.sortDiscussion}</option>
      </select>
    </div>

    {#if scope !== 'query'}
      <label class="flex cursor-pointer items-center gap-2 text-sm text-secondary">
        <input type="checkbox" bind:checked={includePrs} class="accent-accent" />
        {i18n.t.w.github.includePrs}
      </label>
    {/if}
  </div>
</SettingsDialog>
