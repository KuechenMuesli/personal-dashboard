<script lang="ts">
  import { onMount, tick, getContext } from "svelte";
  import {Check, Plus, Search, X, Trash2, Sun, Cloud, CloudRain, Snowflake, CloudLightning, Thermometer, Moon, Copy} from "lucide-svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SuggestionList from "$lib/components/SuggestionList.svelte";
  import { evaluateMath, evaluateConversion, getStoredEventsAndReminders, parseNaturalDateRange } from "$lib/utils/searchUtils";
  import { i18n } from '$lib/i18n/i18n.svelte';

  let { id, isEditing, showSettings = $bindable(false) } = $props<{
    id: string; isEditing: boolean; showSettings: boolean;
  }>();

  interface Engine {
    key: string;
    name: string;
    url: string;
    isDefault?: boolean;
  }

  interface Favorite {
    name: string;
    url: string;
  }

  interface SuggestionItem {
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    action: () => void;
    expandable?: boolean;
    description?: string;
    icon?: any;
    url?: string;
    sourceName?: string;
    onDelete?: () => void;
    onCopy?: () => void;
  }

  const INITIAL_ENGINES: Engine[] = [
    { key: "DEFAULT", name: "Google", url: "https://www.google.com/search?q={query}", isDefault: true },
    { key: "!gi", name: "Images", url: "https://www.google.com/search?tbm=isch&q={query}" },
    { key: "!gsc", name: "Scholar", url: "https://scholar.google.com/scholar?q={query}" },
    { key: "!a", name: "Google AI", url: "https://www.google.com/search?q={query}&udm=50" },
    { key: "!r", name: "Reddit", url: "https://www.reddit.com/search/?q={query}" },
    { key: "!w", name: "Wikipedia", url: "https://de.wikipedia.org/wiki/{query}" },
    { key: "!y", name: "Youtube", url: "https://www.youtube.com/results?search_query={query}" },
  ];

  let query = $state("");
  let engines = $state<Engine[]>([]);
  let allFavorites = $state<Favorite[]>([]);
  let dialogEl = $state<HTMLDialogElement | null>(null);

  let searchInput = $state<HTMLInputElement | null>(null);
  let wrapperEl = $state<HTMLDivElement | null>(null);

  let isFocused = $state(false);
  let selectedIndex = $state(-1);
  let dropdownStyle = $state("");
  let copiedId = $state<string | null>(null);

  let webSuggestions = $state<string[]>([]);
  let searchHistory = $state<string[]>([]);
  let smartAnswer = $state<SuggestionItem | null>(null);
  let lastSmartQuery = $state("");
  let expandedItemId = $state<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function getEngineForQuery(q: string) {
    const trimmed = q.trim();
    const defaultEngine = engines.find(e => e.isDefault) || INITIAL_ENGINES[0];
    if (!trimmed) return defaultEngine;

    const shortcuts = engines
      .filter(e => !e.isDefault)
      .sort((a, b) => b.key.length - a.key.length);

    for (const engine of shortcuts) {
      if (trimmed.includes(engine.key)) return engine;
    }
    return defaultEngine;
  }

  const activeEngine = $derived(getEngineForQuery(query));




  const suggestions = $derived.by<SuggestionItem[]>(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      return searchHistory.slice(0, 6).map((h, i) => ({
        id: `hist-recent-${i}`, title: h, subtitle: i18n.t.w.search.subtitles.recentSearch, badge: 'HISTORY',
        action: () => { handleSearch(h); },
        onDelete: () => {
          searchHistory = searchHistory.filter(item => item !== h);
          localStorage.setItem(`search-history-${id}`, JSON.stringify(searchHistory));
        }
      }));
    }

    const lower = trimmed.toLowerCase();
    const results: SuggestionItem[] = [];

    const localEvents = getStoredEventsAndReminders();
    let dashboardRes: SuggestionItem[] = [];

    const dateMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?$/);
    const naturalDateRange = parseNaturalDateRange(trimmed);

    let searchDateStart: Date | null = null;
    let searchDateEnd: Date | null = null;

    if (dateMatch) {
       const d = parseInt(dateMatch[1]);
       const m = parseInt(dateMatch[2]);
       let y = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
       if (y < 100) y += 2000;

       searchDateStart = new Date(y, m - 1, d);
       searchDateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else if (naturalDateRange) {
       searchDateStart = naturalDateRange.start;
       searchDateEnd = new Date(naturalDateRange.end);
       searchDateEnd.setHours(23, 59, 59, 999);
    }

    if (searchDateStart && searchDateEnd) {
       const todayStart = new Date();
       todayStart.setHours(0, 0, 0, 0);

       if (searchDateStart < todayStart) searchDateStart = todayStart;

       const matchedEvents = localEvents.filter(e => {
          if (!e.date || isNaN(e.date.getTime())) return false;
          return e.date >= searchDateStart! && e.date <= searchDateEnd!;
       });

       matchedEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

       dashboardRes = matchedEvents.map((e, i) => {
          const uniqueId = `dash-evt-${i}`;

          let dateStr = e.date.toLocaleDateString('de-DE');
          if (e.type === 'CALENDAR' || (e.date.getHours() !== 0 || e.date.getMinutes() !== 0)) {
              dateStr += ` ${e.date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
          }

          return {
            id: uniqueId,
            title: e.title,
            description: e.desc,
            subtitle: `${dateStr} • ${e.list}`,
            badge: e.type,
            expandable: !!e.desc,
            action: () => {
               if (e.desc) expandedItemId = expandedItemId === uniqueId ? null : uniqueId;
            },
            onCopy: async () => {
               try {
                 const textToCopy = `${e.title}\n${dateStr} • ${e.list}${e.desc ? '\n\n' + e.desc : ''}`.trim();
                 await navigator.clipboard.writeText(textToCopy);
                 copiedId = uniqueId;
                 setTimeout(() => copiedId = null, 1500);
               } catch (err) {}
            }
         }
       });
    } else {
       const now = new Date();
       now.setHours(0, 0, 0, 0);

       const matchedEvents = localEvents.filter(e => {
          const matchesKeyword = e.title.toLowerCase().includes(lower) || (e.desc && e.desc.toLowerCase().includes(lower));
          if (!matchesKeyword) return false;

          // Exclude past events/reminders if they have a date before today
          if (e.date && !isNaN(e.date.getTime())) {
             const eventDate = new Date(e.date);
             eventDate.setHours(0, 0, 0, 0);
             if (eventDate < now) return false;
          }
          return true;
       });

       const groupedEvents = new Map<string, any[]>();
       for (const e of matchedEvents) {
           const key = `${e.title}|${e.list}`;
           if (!groupedEvents.has(key)) {
               groupedEvents.set(key, []);
           }
           groupedEvents.get(key)!.push(e);
       }

       const consolidatedEvents = Array.from(groupedEvents.values()).map(group => {
           group.sort((a, b) => {
               if (!a.date) return -1;
               if (!b.date) return 1;
               return a.date.getTime() - b.date.getTime();
           });

           const nextEvent = group[0];
           const futureEvents = group.slice(1);

           let description = nextEvent.desc || '';
           if (futureEvents.length > 0) {
               const futureDates = futureEvents.slice(0, 5).map(e => {
                   let dStr = e.date.toLocaleDateString('de-DE');
                   if (e.type === 'CALENDAR' || (e.date.getHours() !== 0 || e.date.getMinutes() !== 0)) {
                       dStr += ` ${e.date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
                   }
                   return `• ${dStr}`;
               });

               const moreText = futureEvents.length > 5 ? `\n...und ${futureEvents.length - 5} weitere Termine` : '';
               const recurrenceInfo = `\n\nWeitere Termine:\n${futureDates.join('\n')}${moreText}`;
               description = description ? description + recurrenceInfo : recurrenceInfo.trim();
           }

           return {
               ...nextEvent,
               desc: description
           };
       });

       consolidatedEvents.sort((a, b) => {
           if (!a.date) return 1;
           if (!b.date) return -1;
           return a.date.getTime() - b.date.getTime();
       });

       dashboardRes = consolidatedEvents.slice(0, 5).map((e, i) => {
          const uniqueId = `dash-evt-kw-${i}`;

          let dateStr = '';
          if (e.date && !isNaN(e.date.getTime())) {
              dateStr = e.date.toLocaleDateString('de-DE');
              if (e.type === 'CALENDAR' || (e.date.getHours() !== 0 || e.date.getMinutes() !== 0)) {
                  dateStr += ` ${e.date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
              }
              dateStr += ' • ';
          }

          return {
            id: uniqueId,
            title: e.title,
            description: e.desc,
            subtitle: `${dateStr}${e.list}`,
            badge: e.type,
            expandable: !!e.desc,
            action: () => {
               if (e.desc) expandedItemId = expandedItemId === uniqueId ? null : uniqueId;
            },
            onCopy: async () => {
               try {
                 const textToCopy = `${e.title}\n${dateStr}${e.list}${e.desc ? '\n\n' + e.desc : ''}`.trim();
                 await navigator.clipboard.writeText(textToCopy);
                 copiedId = uniqueId;
                 setTimeout(() => copiedId = null, 1500);
               } catch (err) {}
            }
         }
       });
    }

    results.push(...dashboardRes);

    if (smartAnswer) {
      results.push(smartAnswer);
    }

    const mathRes = evaluateMath(trimmed);
    if (mathRes !== null) {
      results.push({
        id: 'math', title: `= ${mathRes}`, subtitle: i18n.t.w.search.subtitles.copyToClipboard, badge: 'CALC',
        action: async () => {
          await navigator.clipboard.writeText(mathRes);
          copiedId = 'math';
          setTimeout(() => copiedId = null, 1500);
        }
      });
    }

    const convResults = evaluateConversion(trimmed);
    for (const conv of convResults) {
      const uniqueId = `conv-${conv.unit}`;
      results.push({
        id: uniqueId, title: `= ${conv.val} ${conv.unit}`, subtitle: i18n.t.w.search.subtitles.copyToClipboard, badge: 'CONV',
        action: async () => {
          await navigator.clipboard.writeText(conv.val);
          copiedId = uniqueId;
          setTimeout(() => copiedId = null, 1500);
        }
      });
    }

    const histRes = searchHistory
      .filter(h => h.toLowerCase().includes(lower) && h !== trimmed)
      .slice(0, 3)
      .map((h, i) => ({
        id: `hist-match-${i}`, title: h, subtitle: i18n.t.w.search.subtitles.searchHistory, badge: 'HISTORY',
        action: () => { handleSearch(h); },
        onDelete: () => {
          searchHistory = searchHistory.filter(item => item !== h);
          localStorage.setItem(`search-history-${id}`, JSON.stringify(searchHistory));
        }
      }));
    results.push(...histRes);

    const favs = allFavorites
      .filter(f => f.name.toLowerCase().includes(lower) || f.url.toLowerCase().includes(lower))
      .slice(0, 3)
      .map((f, i) => ({
        id: `fav-${i}`, title: f.name, subtitle: f.url, badge: 'FAV',
        action: () => { window.location.href = f.url; }
      }));

    const webRes = webSuggestions
      .filter(w => w.toLowerCase() !== lower && !searchHistory.some(h => h.toLowerCase() === w.toLowerCase()))
      .slice(0, 4)
      .map((w, i) => ({
        id: `web-${i}`, title: w, subtitle: i18n.t.w.search.subtitles.suggestion, badge: 'WEB',
        action: () => { handleSearch(w); }
      }));

    return [...favs, ...results, ...webRes].slice(0, 8);
  });

  $effect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.startsWith('!')) {
      webSuggestions = [];
      smartAnswer = null;
      lastSmartQuery = "";
      expandedItemId = null;
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // 1. Google Web Suggestions
      const callbackName = 'googleSuggestCb_' + Math.round(Math.random() * 1000000);
      (window as any)[callbackName] = (data: any) => {
         if (data && data[1]) {
            webSuggestions = data[1].map((i: any) => typeof i === 'string' ? i : i[0] || i).slice(0, 5);
         }
         delete (window as any)[callbackName];
         const script = document.getElementById(callbackName);
         if (script) script.remove();
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&jsonp=${callbackName}`;
      document.body.appendChild(script);
    }, 200);

    clearTimeout((window as any).smartDebounceTimer);
    (window as any).smartDebounceTimer = setTimeout(() => {
      // 2. Smart Answers (Weather / Time / DuckDuckGo / Translate)
      const weatherMatch = trimmed.match(/^(?:(?:wetter|weather)\s+(?:in\s+)?(.+))|(?:(.+)\s+(?:wetter|weather))$/i);
      const timeMatch = trimmed.match(/^(?:(?:uhrzeit|time|wie sp[aä]t|how late)\s+(?:ist es\s+)?(?:in\s+)?(.+))|(?:(.+)\s+(?:uhrzeit|time))$/i);

      let translationCandidate: {text: string, targetCode: string, langName: string} | null = null;
      const trimmedLower = trimmed.toLowerCase();
      const translatePrefixMatch = trimmedLower.match(/^(?:translate|übersetze|übersetzen)\s+(.+)$/);
      const translateSuffixMatch = trimmedLower.match(/^(.+?)\s+(?:übersetzung|translate)$/);

      let explicitTargetCode: string | null = null;
      let explicitLangName: string | null = null;
      let textToTranslate = "";

      const words = trimmed.split(/\s+/);
      if (words.length >= 2) {
         const lastWord = words[words.length - 1].toLowerCase();
         const codes = ['en','es','fr','de','it','pt','nl','ru','zh','ja','ko','ar','hi','tr','pl','sv','fi','da','no','el','cs','hu','ro','th','vi','id','uk','bg','hr','sk','sl','sr','et','lv','lt','he','fa'];
         const customAliases: Record<string, string> = { 'gb': 'en', 'us': 'en', 'uk': 'en', 'jp': 'ja', 'cn': 'zh', 'kr': 'ko', 'sp': 'es', 'gr': 'el' };
         const lookupWord = customAliases[lastWord] || lastWord;

         try {
            const displayNamesLocal = new Intl.DisplayNames([navigator.language], { type: 'language' });
            const displayNamesEn = new Intl.DisplayNames(['en'], { type: 'language' });
            for (const code of codes) {
               const nameLocal = displayNamesLocal.of(code)?.toLowerCase();
               const nameEn = displayNamesEn.of(code)?.toLowerCase();
               if (nameLocal === lookupWord || nameEn === lookupWord || code === lookupWord) {
                  explicitTargetCode = code;
                  explicitLangName = lastWord;
                  break;
               }
            }
         } catch(e) {}

         if (explicitTargetCode) {
            const prep = words[words.length - 2].toLowerCase();
            if (['auf', 'in', 'to', 'into', 'nach'].includes(prep)) {
               textToTranslate = words.slice(0, words.length - 2).join(' ');
            } else {
               textToTranslate = words.slice(0, words.length - 1).join(' ');
            }
            textToTranslate = textToTranslate.replace(/^(?:translate|übersetze|übersetzen)\s+/i, '').trim();
         }
      }

      if (explicitTargetCode && textToTranslate) {
         translationCandidate = { text: textToTranslate, targetCode: explicitTargetCode, langName: explicitLangName! };
      } else if (translatePrefixMatch || translateSuffixMatch) {
         const text = translatePrefixMatch ? translatePrefixMatch[1] : translateSuffixMatch![1];
         const nativeCode = navigator.language.split('-')[0];
         let nativeLangName = nativeCode;
         try { nativeLangName = new Intl.DisplayNames([navigator.language], { type: 'language' }).of(nativeCode) || nativeCode; } catch(e) {}
         translationCandidate = { text, targetCode: nativeCode, langName: nativeLangName };
      }

      const weatherLoc = weatherMatch ? (weatherMatch[1] || weatherMatch[2]) : null;
      const timeLoc = timeMatch ? (timeMatch[1] || timeMatch[2]) : null;

      if (weatherLoc && weatherLoc !== lastSmartQuery) {
        lastSmartQuery = weatherLoc;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherLoc)}&count=1&language=de`)
          .then(res => res.json())
          .then(geoData => {
             const geo = geoData.results?.[0];
             if (geo) {
               return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code,is_day&timezone=${encodeURIComponent(geo.timezone || 'auto')}`)
                 .then(res => res.json())
                 .then(data => {
                    if (data.current) {
                      const c = data.current;
                      const getWmoIcon = (code: number, isDay: number) => {
                         if (code === 0) return isDay ? Sun : Moon;
                         if (code === 1 || code === 2) return isDay ? Cloud : Cloud; // or maybe SunCloud
                         if (code === 3) return Cloud;
                         if ([45, 48].includes(code)) return Cloud; // mist
                         if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain;
                         if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
                         if ([95, 96, 99].includes(code)) return CloudLightning;
                         return Thermometer;
                      };
                      const icon = getWmoIcon(c.weather_code, c.is_day);
                      const temp = Math.round(c.temperature_2m);
                      const sign = temp > 0 ? '+' : '';
                      const answer = `${geo.name}: ${sign}${temp}°C`;
                      smartAnswer = {
                        id: 'smart-weather', title: answer, subtitle: i18n.t.w.search.subtitles.copyToClipboard, badge: 'WEATHER', icon: icon,
                        action: async () => {
                          await navigator.clipboard.writeText(answer);
                          copiedId = 'smart-weather';
                          setTimeout(() => copiedId = null, 1500);
                        }
                      };
                    } else smartAnswer = null;
                 });
             } else smartAnswer = null;
          }).catch(() => smartAnswer = null);
      } else if (timeLoc && timeLoc !== lastSmartQuery) {
        lastSmartQuery = timeLoc;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(timeLoc)}&count=1&language=de`)
          .then(res => res.json())
          .then(geoData => {
             const geo = geoData.results?.[0];
             if (geo && geo.timezone) {
               try {
                 const timeStr = new Date().toLocaleTimeString("de-DE", { timeZone: geo.timezone, timeStyle: "short" });
                 const answer = `${geo.name}: ${timeStr} Uhr`;
                 smartAnswer = {
                   id: 'smart-time', title: answer, subtitle: i18n.t.w.search.subtitles.copyToClipboard, badge: 'TIME',
                   action: async () => {
                     await navigator.clipboard.writeText(answer);
                     copiedId = 'smart-time';
                     setTimeout(() => copiedId = null, 1500);
                   }
                 };
               } catch(e) { smartAnswer = null; }
             } else smartAnswer = null;
          }).catch(() => smartAnswer = null);
      } else if (translationCandidate && `translate:${translationCandidate.targetCode}:${translationCandidate.text}` !== lastSmartQuery) {
         lastSmartQuery = `translate:${translationCandidate.targetCode}:${translationCandidate.text}`;
         const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${translationCandidate.targetCode}&dt=t&q=${encodeURIComponent(translationCandidate.text)}`;
         fetch(`/api/proxy?target=${encodeURIComponent(url)}`)
           .then(res => res.json())
           .then(data => {
              if (data && data[0] && data[0].length > 0) {
                 const translatedText = data[0].map((s: any) => s[0]).join('');
                 
                 const sourceCode = data[2] || 'auto';
                 let sourceLangName = sourceCode;
                 let targetLangName = translationCandidate!.targetCode;
                 
                 try {
                    const displayNames = new Intl.DisplayNames([navigator.language], { type: 'language' });
                    sourceLangName = displayNames.of(sourceCode) || sourceCode;
                    targetLangName = displayNames.of(translationCandidate!.targetCode) || targetLangName;
                 } catch(e) {}
                 
                 const capitalizedSource = sourceLangName.charAt(0).toUpperCase() + sourceLangName.slice(1);
                 const capitalizedTarget = targetLangName.charAt(0).toUpperCase() + targetLangName.slice(1);

                 smartAnswer = {
                   id: 'smart-translate', 
                   title: translatedText, 
                   subtitle: `${capitalizedSource} → ${capitalizedTarget}`, 
                   badge: 'TRANSLATE',
                   action: async () => {
                     await navigator.clipboard.writeText(translatedText);
                     copiedId = 'smart-translate';
                     setTimeout(() => copiedId = null, 1500);
                   }
                 };
              } else smartAnswer = null;
           }).catch(() => smartAnswer = null);
      } else if (!weatherMatch && !timeMatch && !translationCandidate && trimmed !== lastSmartQuery && trimmed.length > 3) {
         lastSmartQuery = trimmed;
         const lang = navigator.language.toLowerCase();
         const targetUrl = encodeURIComponent(`https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&kl=${lang}`);
         fetch(`/api/proxy?target=${targetUrl}`)
          .then(res => res.json())
          .then(async data => {
            let answerText = data.AbstractText;
            let sourceUrl = data.AbstractURL;
            let sourceName = data.AbstractSource || 'DuckDuckGo';

            // If it's a disambiguation page (Type 'D') or we don't have text yet, try to fetch the first real topic
            if (!answerText && data.Type === 'D' && data.RelatedTopics && data.RelatedTopics.length > 0) {
               const firstTopic = data.RelatedTopics[0];
               const match = firstTopic.FirstURL?.match(/duckduckgo\.com\/([^?]+)/);
               if (match && match[1]) {
                  const newQuery = decodeURIComponent(match[1].replace(/_/g, ' '));
                  try {
                    const tUrl = encodeURIComponent(`https://api.duckduckgo.com/?q=${encodeURIComponent(newQuery)}&format=json&kl=${lang}`);
                    const res2 = await fetch(`/api/proxy?target=${tUrl}`);
                    const data2 = await res2.json();
                    if (data2.AbstractText) {
                       answerText = data2.AbstractText;
                       sourceUrl = data2.AbstractURL || firstTopic.FirstURL;
                       sourceName = data2.AbstractSource || 'Wikipedia';
                    } else {
                       const wikiLang = lang.split('-')[0] || 'de';
                       const wikiUrl = encodeURIComponent(`https://${wikiLang}.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(newQuery)}`);
                       const wikiRes = await fetch(`/api/proxy?target=${wikiUrl}`);
                       const wikiData = await wikiRes.json();
                       const pages = wikiData.query?.pages;
                       if (pages) {
                         const pageId = Object.keys(pages)[0];
                         if (pageId && pageId !== "-1" && pages[pageId].extract) {
                            answerText = pages[pageId].extract;
                            sourceUrl = `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(newQuery)}`;
                            sourceName = 'Wikipedia';
                         } else {
                            answerText = firstTopic.Text;
                            sourceUrl = firstTopic.FirstURL;
                         }
                       } else {
                         answerText = firstTopic.Text;
                         sourceUrl = firstTopic.FirstURL;
                       }
                    }
                  } catch(e) {
                    answerText = firstTopic.Text;
                    sourceUrl = firstTopic.FirstURL;
                  }
               } else {
                  answerText = firstTopic.Text;
                  sourceUrl = firstTopic.FirstURL;
               }
            } else if (!answerText && data.RelatedTopics && data.RelatedTopics.length > 0) {
               answerText = data.RelatedTopics[0].Text;
               sourceUrl = data.RelatedTopics[0].FirstURL;
            }
            if (answerText) {
              // DuckDuckGo facts can be slightly long; we make them expandable
              smartAnswer = {
                 id: 'smart-fact', title: answerText, subtitle: `${i18n.t.w.search.subtitles.readMore} ${sourceName}`, badge: 'FACT',
                 expandable: true,
                 url: sourceUrl,
                 sourceName: sourceName,
                 action: () => {
                   expandedItemId = expandedItemId === 'smart-fact' ? null : 'smart-fact';
                 }
               };
            } else {
              smartAnswer = null;
            }
          }).catch(() => smartAnswer = null);
      }
    }, 250);
  });

  $effect(() => { query; selectedIndex = -1; });



  function updateDropdownPosition() {
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    dropdownStyle = `position: fixed; top: ${rect.bottom + 6}px; left: ${rect.left}px; width: ${rect.width}px; z-index: 99999;`;
  }

  $effect(() => {
    if (isFocused && suggestions.length > 0) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  });

  onMount(() => {
    tick().then(() => {
      const firstSearch = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
      if (firstSearch) firstSearch.focus();
    });

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || 
        isEditing || 
        document.querySelector('dialog[open]')
      ) return;

      const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';
      if (!isPaste && (e.ctrlKey || e.metaKey || e.altKey)) return;

      if (e.key.length === 1 || isPaste) searchInput?.focus();
    };

    window.addEventListener('keydown', handleGlobalKey);
    loadFavorites();
    loadHistory();
    window.addEventListener('storage', loadFavorites);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      window.removeEventListener('storage', loadFavorites);
    };
  });

  function loadFavorites() {
    const loadedFavs: Favorite[] = [];
    const secrets = getSecrets();
    
    // 1. Load from global secrets (Cloud)
    for (const [key, value] of Object.entries(secrets)) {
      if (value && value.favorites && Array.isArray(value.favorites)) {
        loadedFavs.push(...value.favorites);
      }
    }

    // 2. Load from localStorage (Local)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('favorites-settings-')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed.favorites && Array.isArray(parsed.favorites)) {
            loadedFavs.push(...parsed.favorites);
          }
        } catch (e) {}
      }
    }
    if (loadedFavs.length === 0) {
      loadedFavs.push(
        { name: "Reddit", url: "https://reddit.com" },
        { name: "GitHub", url: "https://github.com" },
        { name: "YouTube", url: "https://youtube.com" }
      );
    }
    const unique = new Map<string, Favorite>();
    for (const fav of loadedFavs) { if (fav.url) unique.set(fav.url, fav); }
    allFavorites = Array.from(unique.values());
  }

  const getSecrets = getContext<() => Record<string, any>>('secrets');
  let isLoaded = $state(false);

  $effect(() => {
    const secrets = getSecrets();
    loadFavorites(); // Re-run when secrets update

    if (!isLoaded) {
      if (secrets[id]) {
        const parsed = secrets[id];
        engines = parsed.engines || [...INITIAL_ENGINES];
        searchHistory = parsed.searchHistory || [];
      } else {
        const saved = localStorage.getItem(`search-settings-${id}`);
        engines = saved ? JSON.parse(saved) : [...INITIAL_ENGINES];
        loadHistory();
      }
      isLoaded = true;
    }
  });

  function loadHistory() {
    try {
      const hist = localStorage.getItem(`search-history-${id}`);
      if (hist) searchHistory = JSON.parse(hist);
    } catch(e) {}
  }

  function saveToCloud() {
    fetch('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: id, key: { engines, searchHistory } })
    }).catch(console.error);
  }

  function saveHistory(q: string) {
    if (!q) return;
    const filtered = searchHistory.filter(h => h !== q);
    searchHistory = [q, ...filtered].slice(0, 15);
    localStorage.setItem(`search-history-${id}`, JSON.stringify(searchHistory));
    saveToCloud();
  }

  function clearHistory() {
    searchHistory = [];
    localStorage.removeItem(`search-history-${id}`);
    saveToCloud();
  }

  $effect(() => {
    if (showSettings) dialogEl?.showModal();
    else dialogEl?.close();
  });

  function saveSettings() {
    localStorage.setItem(`search-settings-${id}`, JSON.stringify(engines));
    showSettings = false;
    saveToCloud();
  }

  function handleSearch(overrideQuery?: string | Event) {
    const q = typeof overrideQuery === 'string' ? overrideQuery : query;
    const trimmed = q.trim();
    if (!trimmed) return;

    saveHistory(trimmed);
    if (typeof overrideQuery === 'string') query = overrideQuery;

    const engine = getEngineForQuery(trimmed);
    const isUrlExpression = /^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

    if (engine.isDefault && trimmed.match(isUrlExpression)) {
      const url = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
      window.location.href = encodeURI(url);
      return;
    }

    const targetUrl = engine.isDefault
      ? engine.url.replace("{query}", encodeURIComponent(trimmed))
      : engine.url.replace("{query}", encodeURIComponent(trimmed.replace(engine.key, "").trim()));

    if (targetUrl) window.location.href = targetUrl;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        suggestions[selectedIndex].action();
      } else {
        handleSearch();
      }
    }
  }
</script>

<WidgetCard bind:showSettings={showSettings} isConfigured={true} padding={false} transparent={true}>
	<div class="flex h-full w-full items-center px-1 font-sans">
		<div bind:this={wrapperEl} class="relative w-full">
			<div class="flex h-10 w-full overflow-hidden rounded-xl border border-neutral-600 bg-neutral-900 shadow-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">

				<div class="flex items-center pl-3 pr-1 text-neutral-500 bg-black/20">
					<Search size={14} strokeWidth={2.5} />
				</div>

				<input
						bind:this={searchInput}
						type="text"
						bind:value={query}
						placeholder="Search, Calculate or Convert..."
						class="min-w-0 flex-1 border-none bg-black/20 px-2 text-[13px] text-white outline-none placeholder:text-neutral-500 focus:ring-0"
						onkeydown={handleKeydown}
						onfocus={() => isFocused = true}
						onblur={() => setTimeout(() => isFocused = false, 150)}
				/>

				<button
						onclick={handleSearch}
						class="flex h-full items-center justify-center border-l border-black/40 bg-neutral-800 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:bg-black/40 hover:text-white active:bg-black/60"
						aria-label="Search"
				>
					{activeEngine?.name || 'Search'}
				</button>
			</div>

		</div>
	</div>
</WidgetCard>

{#if isFocused && suggestions.length > 0}
  <SuggestionList
    {suggestions}
    {selectedIndex}
    {expandedItemId}
    {copiedId}
    {dropdownStyle}
  />
{/if}

<SettingsDialog
	title="Search Shortcuts"
	bind:show={showSettings}
	data={[engines]}
	onRevert={(r: any) => { engines = r[0]; }}
	onSave={saveSettings}
>
	<div class="flex flex-col gap-4">

		<div class="flex justify-between items-center">
			<button
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={clearHistory}
					disabled={searchHistory.length === 0}
					title="Clear Search History"
			>
				<Trash2 size={12} strokeWidth={2.5} /> Clear History
			</button>

			<button
					class="flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black/60 transition-colors border border-black/20"
					onclick={() => engines.push({key: '!', name: 'New', url: ''})}
			>
				<Plus size={12} strokeWidth={2.5} /> ADD ENGINE
			</button>
		</div>

		<div class="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
			{#each engines as engine, i}
				<div class="flex items-center gap-2.5 py-2 {engine.isDefault ? 'mb-2 border-b border-black/40 pb-4' : ''}">

					{#if engine.isDefault}
						<div class="flex w-20 shrink-0 items-center justify-center gap-1 text-[9px] font-black tracking-widest text-neutral-500 bg-black/20 py-1.5 rounded-md border border-black/10">
							DEFAULT
						</div>
					{:else}
						<div class="flex w-20 shrink-0 items-center gap-1.5">
							<button class="text-neutral-600 hover:text-red-500 transition-colors" onclick={() => engines.splice(i, 1)}>
								<X size={16} strokeWidth={2.5} />
							</button>
							<input
									type="text"
									bind:value={engine.key}
									placeholder="!"
									class="w-full rounded-lg border border-black/40 bg-neutral-900 py-1.5 text-center font-mono text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
							/>
						</div>
					{/if}

					<input
							type="text"
							bind:value={engine.name}
							placeholder="Name (e.g. Google)"
							class="w-28 rounded-lg border border-black/40 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					/>

					<input
							type="text"
							bind:value={engine.url}
							placeholder="Search URL..."
							class="flex-1 rounded-lg border border-black/40 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					/>
				</div>
			{/each}
		</div>

	</div>
</SettingsDialog>
