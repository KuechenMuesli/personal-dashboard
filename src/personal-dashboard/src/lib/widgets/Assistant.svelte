<script lang="ts">
  import { getContext } from 'svelte';
  import { Bot, Send, User } from "lucide-svelte";
  import { marked } from 'marked';
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import { i18n } from "$lib/i18n/i18n.svelte";

  let { id, width, height, showSettings = $bindable(false) } = $props();

  let apiKey = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-api-key-${id}`) || '') : '');
  let authMode = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-auth-mode-${id}`) || 'aistudio') : 'aistudio');
  let serviceAccountJson = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-sa-${id}`) || '') : '');
  let vertexLocation = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-loc-${id}`) || 'us-central1') : 'us-central1');

  let messages = $state<{role: 'user' | 'assistant' | 'system', content?: string, parts?: any[]}[]>([]);
  let aiLoadingStatus = $state('');
  let input = $state('');
  let isLoading = $state(false);
  let chatContainer: HTMLElement;
  let showTutorialVertex = $state(false);

  let isLoaded = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout>;

  const getSecrets = getContext<() => Record<string, any>>('secrets');
  const getSecretsLoaded = getContext<() => boolean>('secretsLoaded');

  function saveToCloud() {
    fetch('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: id, key: { apiKey, authMode, serviceAccountJson, vertexLocation } })
    }).catch(console.error);
  }

  $effect(() => {
    const secrets = getSecrets();
    const secretsLoaded = getSecretsLoaded ? getSecretsLoaded() : true;
    
    if (secretsLoaded && !isLoaded) {
      if (secrets[id] && Object.keys(secrets[id]).length > 0) {
         if (secrets[id].apiKey !== undefined) apiKey = secrets[id].apiKey;
         if (secrets[id].authMode !== undefined) authMode = secrets[id].authMode;
         if (secrets[id].serviceAccountJson !== undefined) serviceAccountJson = secrets[id].serviceAccountJson;
         if (secrets[id].vertexLocation !== undefined) vertexLocation = secrets[id].vertexLocation;
      }
      isLoaded = true;
    }
  });

  $effect(() => {
    if (!isLoaded) return;
    
    const currentApiKey = apiKey;
    const currentAuthMode = authMode;
    const currentSa = serviceAccountJson;
    const currentLoc = vertexLocation;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`assistant-api-key-${id}`, currentApiKey);
        localStorage.setItem(`assistant-auth-mode-${id}`, currentAuthMode);
        localStorage.setItem(`assistant-sa-${id}`, currentSa);
        localStorage.setItem(`assistant-loc-${id}`, currentLoc);
        saveToCloud();
      }
    }, 500);
  });

  function attachCopyButtons(node: HTMLElement, content: string) {
    const attach = () => {
      const preElements = node.querySelectorAll('pre');
      preElements.forEach(pre => {
        if (pre.parentElement?.classList.contains('code-block-wrapper')) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper relative group mt-2 mb-2';
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        
        pre.style.marginTop = '0';
        pre.style.marginBottom = '0';

        const btn = document.createElement('button');
        btn.className = 'absolute top-2 right-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center justify-center';
        btn.title = i18n.t.w.note.copy || 'Copy'; // fallback if not exists
        const copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        
        btn.innerHTML = copyIcon;
        btn.onclick = () => {
          const code = pre.querySelector('code')?.innerText || pre.innerText;
          navigator.clipboard.writeText(code);
          btn.innerHTML = checkIcon;
          setTimeout(() => { btn.innerHTML = copyIcon; }, 2000);
        };
        wrapper.appendChild(btn);
      });
    };

    attach();
    return { update: attach };
  }

  async function sendMessage(isFunctionReply = false) {
    if (!isFunctionReply) {
        if (!input.trim() || (authMode === 'aistudio' && !apiKey) || (authMode === 'vertex' && !serviceAccountJson)) return;
        const userMessage = input;
        input = '';
        
        if (messages.length === 0) {
          messages.push({
            role: 'system', 
            parts: [{ text: `You are a highly capable, proactive personal assistant embedded in a dashboard. 
The current date and time is: ${new Date().toISOString()}.

# Your Role and Capabilities:
1. You DO NOT have immediate context of the user's dashboard data. Instead, you MUST use your provided tools (get_agenda, get_notes) to query their data when needed.
2. IMPORTANT: Do NOT ask the user for permission to use tools or fetch their data. If you need information to answer a question or fulfill a request, use the tools IMMEDIATELY and automatically.
3. Actively reason about the user's schedule, combining Calendar events and Todos. When planning a day or advising on wake-up times, you MUST call get_agenda to get a complete picture.
4. If the user asks for advice on their schedule (e.g., "when should I wake up?"), fetch their agenda for the day, estimate preparation and travel time logically, and give a concrete, thoughtful recommendation based on BOTH events and tasks.
5. If the user asks you to read, summarize, modify, or empty a note or list (e.g., "Einkaufsliste"), you MUST first call the 'get_notes' tool to find the ID and current content of the notes before taking action.
6. Be open, conversational, and act as a true intelligent assistant, rather than just a robotic interface.
7. You can create notes, update notes, and add todos using your tools. 
8. When creating or updating notes, you CAN and SHOULD use Markdown formatting to make them look good.
9. If the user asks to set a reminder or alarm for a specific time, DO NOT say you cannot do it. Instead, simply use the 'add_todo' tool and set the 'dueDate' parameter appropriately.` }]
          });
        }
        messages.push({ role: 'user', content: userMessage, parts: [{ text: userMessage }] });
    }

    isLoading = true;
    setTimeout(() => chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }), 50);

    try {
       let targetUrl = '';
       let accessToken = '';

       if (authMode === 'aistudio') {
           targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
       } else {
           const tokenRes = await fetch('/api/gcp-token', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ serviceAccount: JSON.parse(serviceAccountJson) })
           });
           const tokenData = await tokenRes.json();
           if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to get GCP Token');
           accessToken = tokenData.access_token;
           
           const sa = JSON.parse(serviceAccountJson);
           targetUrl = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${vertexLocation}/publishers/google/models/gemini-2.5-flash:streamGenerateContent?alt=sse`;
       }

       const headers: any = { 'Content-Type': 'application/json' };
       if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

       const res = await fetch(`/api/proxy?target=${encodeURIComponent(targetUrl)}`, {
         method: 'POST',
         headers,
         body: JSON.stringify({
           contents: messages.filter(m => m.role !== 'system').map(m => ({
             role: m.role === 'assistant' ? 'model' : 'user',
             parts: m.parts
           })),
           systemInstruction: { parts: messages.find(m => m.role === 'system')?.parts || [{ text: 'You are a helpful assistant.' }] },
           tools: [{
             functionDeclarations: [
               {
                 name: "create_note",
                 description: "Creates a new Note widget on the dashboard.",
                 parameters: {
                   type: "OBJECT",
                   properties: { content: { type: "STRING" } },
                   required: ["content"]
                 }
               },
               {
                 name: "update_note",
                 description: "Updates an existing Note widget.",
                 parameters: {
                   type: "OBJECT",
                   properties: { id: { type: "STRING" }, content: { type: "STRING" } },
                   required: ["id", "content"]
                 }
               },
               {
                 name: "add_todo",
                 description: "Adds a new task to the global to-do list.",
                 parameters: {
                   type: "OBJECT",
                   properties: { 
                     title: { type: "STRING" },
                     dueDate: { type: "STRING", description: "Optional. ISO 8601 string for due date/time (e.g. YYYY-MM-DDTHH:mm)." }
                   },
                   required: ["title"]
                 }
               },
               {
                 name: "get_agenda",
                 description: "Retrieves the user's agenda, including BOTH calendar events and the complete to-do list. Use this whenever the user asks about their schedule, appointments, plans, tasks, chores, or what they need to do.",
                 parameters: {
                   type: "OBJECT",
                   properties: { 
                     startDate: { type: "STRING", description: "Optional. ISO 8601 start date/time for calendar events" },
                     endDate: { type: "STRING", description: "Optional. ISO 8601 end date/time for calendar events" },
                     includeCompletedTodos: { type: "BOOLEAN", description: "Whether to include completed tasks. Defaults to false." }
                   }
                 }
               },
               {
                 name: "get_notes",
                 description: "Retrieves the user's notes. Use this when the user asks to summarize their notes, find information in notes, or asks what notes they have.",
                 parameters: {
                   type: "OBJECT",
                   properties: {}
                 }
               }
             ]
           }]
         })
       });
       
       if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(`${res.status}: ${errData?.error?.message || res.statusText || 'API Error'}`);
       }

       const reader = res.body?.getReader();
       if (!reader) throw new Error('No response stream');
       
       const decoder = new TextDecoder();
       let buffer = '';
       let currentText = '';
       const functionCalls: any[] = [];
       
       messages.push({ role: 'assistant', parts: [{ text: '' }] });
       const assistantMessageIndex = messages.length - 1;

       while (true) {
           const { done, value } = await reader.read();
           if (done) break;
           
           buffer += decoder.decode(value, { stream: true });
           const lines = buffer.split('\n');
           buffer = lines.pop() || '';
           
           for (const line of lines) {
               if (line.startsWith('data: ')) {
                   const dataStr = line.slice(6).trim();
                   if (dataStr === '[DONE]') continue;
                   if (!dataStr) continue;
                   
                   try {
                       const data = JSON.parse(dataStr);
                       const parts = data.candidates?.[0]?.content?.parts || [];
                       for (const part of parts) {
                           if (part.text) {
                               currentText += part.text;
                               messages[assistantMessageIndex] = {
                                   role: 'assistant',
                                   parts: [{ text: currentText }]
                               };
                               setTimeout(() => chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'auto' }), 10);
                           } else if (part.functionCall) {
                               functionCalls.push(part.functionCall);
                           }
                       }
                   } catch (e) {
                       console.error('SSE parse error', e);
                   }
               }
           }
       }
       
       const finalParts = [];
       if (currentText) finalParts.push({ text: currentText });
       functionCalls.forEach(fc => finalParts.push({ functionCall: fc }));
       
       if (finalParts.length > 0) {
           messages[assistantMessageIndex] = { role: 'assistant', parts: finalParts };
       } else {
           messages.pop();
       }

       if (functionCalls.length > 0) {
           const responseParts = [];
           for (const functionCall of functionCalls) {
               let funcResponse = {};
               try {
                   if (functionCall.name === 'create_note') {
                       const newId = crypto.randomUUID();
                       window.dispatchEvent(new CustomEvent('dashboard-add-widget', { detail: { id: newId, type: 'note', content: functionCall.args.content } }));
                       localStorage.setItem(`note-mode-${newId}`, 'true'); // Force Markdown mode
                       funcResponse = { success: true, message: `Created note ${newId}.` };
                   } else if (functionCall.name === 'update_note') {
                       localStorage.setItem(`note-settings-${functionCall.args.id}`, functionCall.args.content);
                       window.dispatchEvent(new CustomEvent('note-updated', { detail: { id: functionCall.args.id, content: functionCall.args.content } }));
                       funcResponse = { success: true, message: "Note updated." };
                   } else if (functionCall.name === 'add_todo') {
                       const todosRaw = localStorage.getItem('todo-settings-global');
                       const todos = todosRaw ? JSON.parse(todosRaw) : [];
                       todos.push({ 
                           id: crypto.randomUUID(), 
                           title: functionCall.args.title, 
                           dueDate: functionCall.args.dueDate || null,
                           completed: false, 
                           isEditing: false,
                           priority: null,
                           notes: '',
                           tags: []
                       });
                       localStorage.setItem('todo-settings-global', JSON.stringify(todos));
                       window.dispatchEvent(new Event('todo-updated')); // Notify Todo widgets
                       funcResponse = { success: true };
                   } else if (functionCall.name === 'get_agenda') {
                       const calRaw = localStorage.getItem('global-calendar-events');
                       let events = calRaw ? JSON.parse(calRaw) : [];
                       
                       let startStr = functionCall.args.startDate;
                       if (startStr && startStr.length === 10) startStr += "T00:00:00Z";
                       const start = startStr ? new Date(startStr) : null;
                       
                       let endStr = functionCall.args.endDate;
                       if (endStr && endStr.length === 10) endStr += "T23:59:59Z";
                       const end = endStr ? new Date(endStr) : null;
                       
                       let filteredEvents: any[] = [];
                       for (const c of events) {
                           for (const e of c.events) {
                               const evStart = new Date(e.start);
                               const evEnd = e.end ? new Date(e.end) : evStart;
                               if (start && evEnd < start) continue;
                               if (end && evStart > end) continue;
                               filteredEvents.push({ 
                                   calendar: c.name, 
                                   title: e.title, 
                                   start: evStart.toLocaleString(i18n.locale, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), 
                                   end: e.end ? evEnd.toLocaleString(i18n.locale, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null, 
                                   desc: e.desc, 
                                   location: e.location 
                               });
                           }
                       }
                       filteredEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
                       
                       const todosRaw = localStorage.getItem('todo-settings-global');
                       let todos = todosRaw ? JSON.parse(todosRaw) : [];
                       
                       const appleRaw = localStorage.getItem('todo-apple-cache-global');
                       if (appleRaw) {
                           try {
                               const parsed = JSON.parse(appleRaw);
                               if (parsed.data) todos = todos.concat(parsed.data);
                           } catch (e) {}
                       }
                       
                       const msRaw = localStorage.getItem('todo-ms-cache-global');
                       if (msRaw) {
                           try {
                               const parsed = JSON.parse(msRaw);
                               if (parsed.data) todos = todos.concat(parsed.data);
                           } catch (e) {}
                       }

                       const includeCompleted = functionCall.args.includeCompletedTodos === true;
                       const filteredTodos = todos.filter((t: any) => includeCompleted || !t.completed).map((t: any) => ({
                           title: t.title,
                           completed: t.completed,
                           dueDate: t.dueDate ? new Date(t.dueDate).toLocaleString(i18n.locale, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
                           source: t.source || 'local'
                       }));

                       funcResponse = { calendar_events: filteredEvents.slice(0, 50), todos: filteredTodos };
                   } else if (functionCall.name === 'get_notes') {
                       const notes: Record<string, string> = {};
                       for (let i = 0; i < localStorage.length; i++) {
                           const key = localStorage.key(i);
                           if (key && key.startsWith('note-settings-')) {
                               notes[key.replace('note-settings-', '')] = localStorage.getItem(key) || '';
                           }
                       }
                       funcResponse = { notes };
                   }
               } catch (e: any) {
                   funcResponse = { error: String(e) };
               }
               console.log(`[Assistant] Result of tool ${functionCall.name}:`, JSON.parse(JSON.stringify(funcResponse)));
               responseParts.push({
                   functionResponse: {
                       name: functionCall.name,
                       response: { name: functionCall.name, content: funcResponse }
                   }
               });
           }
           
           messages.push({
               role: 'user',
               parts: responseParts
           });
           
           await sendMessage(true);
           return;
       }
       
    } catch (e: any) {
       messages.push({ role: 'assistant', content: `Error: ${e.message}`, parts: [{text: `Error: ${e.message}`}] });
    } finally {
       isLoading = false;
       setTimeout(() => chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }), 50);
    }
  }
</script>

<WidgetCard bind:showSettings={showSettings} isConfigured={!!apiKey || !!serviceAccountJson}>
  <div class="flex flex-col h-full rounded-lg overflow-hidden" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.1)); border: 1px solid var(--theme-card-border, rgba(255,255,255,0.05));">
    <div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {#if messages.filter(m => m.role !== 'system').length === 0}
         <div class="m-auto text-center flex flex-col items-center gap-2" style="color: var(--theme-text-secondary, #a3a3a3);">
           <Bot size={32} opacity={0.5} />
           <p class="text-sm">{i18n.t.w.assistant.helpToday}</p>
         </div>
      {/if}
      {#each messages.filter(m => m.role !== 'system' && m.parts && !m.parts.some(p => p.functionResponse)) as msg}
        <div class="flex gap-2 {msg.role === 'user' ? 'flex-row-reverse' : ''}">
          <div class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.3)); color: var(--theme-text-primary, #fff);">
            {#if msg.role === 'user'} <User size={12} /> {:else} <Bot size={12} /> {/if}
          </div>
          <div class="max-w-[85%] flex flex-col gap-2">
            {#if msg.parts}
               {#each msg.parts as part}
                  {#if part.text}
                     <div 
                        use:attachCopyButtons={part.text}
                        class="rounded-lg p-2.5 text-sm {msg.role === 'user' ? 'whitespace-pre-wrap' : 'prose prose-invert prose-sm prose-p:my-1 prose-pre:my-1 prose-headings:my-2 max-w-none break-words'}" style="{msg.role === 'user' ? 'background-color: var(--theme-card-bg, rgba(255,255,255,0.1)); border: 1px solid var(--theme-card-border, rgba(255,255,255,0.05)); color: var(--theme-text-primary, #fff);' : 'background-color: var(--theme-card-bg, rgba(0,0,0,0.3)); color: var(--theme-text-primary, #fff);'}">
                        {#if msg.role === 'user'}
                           {part.text}
                        {:else}
                           {@html marked.parse(part.text)}
                        {/if}
                     </div>
                  {/if}
                  {#if part.functionCall}
                     <div class="rounded-lg border p-3 text-sm flex flex-col gap-1.5 shadow-sm" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.2)); border-color: var(--theme-card-border, rgba(255,255,255,0.05)); color: var(--theme-text-primary, #fff);">
                       {#if part.functionCall.name === 'add_todo'}
                          <div class="flex items-center gap-2 font-medium text-xs uppercase tracking-wider" style="color: var(--theme-text-secondary, #a3a3a3);">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                            {i18n.t.w.assistant.taskCreated}
                          </div>
                          <div class="flex items-start gap-2 mt-1">
                            <div class="w-4 h-4 rounded-full border shrink-0 mt-0.5" style="border-color: var(--theme-text-secondary, #a3a3a3);"></div>
                            <div>
                               <span style="color: var(--theme-text-primary, #fff);">{part.functionCall.args.title}</span>
                               {#if part.functionCall.args.dueDate}
                                  <div class="text-xs mt-0.5 opacity-80" style="color: var(--theme-accent, #3b82f6);">{part.functionCall.args.dueDate.replace('T', ' ')}</div>
                               {/if}
                            </div>
                          </div>
                       {:else if part.functionCall.name === 'create_note' || part.functionCall.name === 'update_note'}
                          <div class="flex items-center gap-2 font-medium text-xs uppercase tracking-wider" style="color: var(--theme-text-secondary, #a3a3a3);">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            {part.functionCall.name === 'create_note' ? i18n.t.w.assistant.noteCreated : i18n.t.w.assistant.noteUpdated}
                          </div>
                          <div class="rounded p-2 text-xs mt-1 max-h-24 overflow-hidden relative" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.2)); color: var(--theme-text-secondary, #a3a3a3);">
                             {part.functionCall.args.content}
                             <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t to-transparent" style="--tw-gradient-from: var(--theme-card-bg, rgba(0,0,0,0.2));"></div>
                          </div>
                       {:else if part.functionCall.name === 'get_agenda' || part.functionCall.name === 'get_notes'}
                          <div class="flex items-center gap-2 font-medium text-xs uppercase tracking-wider" style="color: var(--theme-text-secondary, #a3a3a3);">
                            {#if part.functionCall.name === 'get_agenda'}
                              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              {i18n.t.w.assistant.fetchingAgenda}
                            {:else}
                              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              {i18n.t.w.assistant.fetchingNotes}
                            {/if}
                          </div>
                       {/if}
                     </div>
                  {/if}
               {/each}
            {/if}
          </div>
        </div>
      {/each}
      {#if isLoading}
        <div class="flex gap-2">
          <div class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.3));"><Bot size={12} color="var(--theme-text-primary, #fff)" /></div>
          <div class="rounded-lg p-2.5 text-sm" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.3)); color: var(--theme-text-secondary, #a3a3a3);">{i18n.t.w.assistant.typing}</div>
        </div>
      {/if}
    </div>
    <div class="p-2 border-t shrink-0" style="border-color: var(--theme-card-border, rgba(255,255,255,0.05));">
      <form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-2 relative">
        <input type="text" bind:value={input} placeholder={i18n.t.w.assistant.askPlaceholder} class="w-full rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none" style="background-color: var(--theme-card-bg, rgba(0,0,0,0.2)); border: 1px solid var(--theme-card-border, rgba(255,255,255,0.05)); color: var(--theme-text-primary, #fff);" />
        <button type="submit" disabled={isLoading || !input.trim()} class="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-black/40 hover:text-white active:bg-black/60 transition-colors disabled:opacity-50 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-400">
          <Send size={14} />
        </button>
      </form>
    </div>
  </div>
</WidgetCard>

<SettingsDialog title={i18n.t.w.assistant.title} bind:show={showSettings}>
  <div class="space-y-4">
    <div class="space-y-3">
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <span class="text-sm font-semibold text-white">{i18n.t.w.assistant.authMode}</span>
        <CustomDropdown
          bind:value={authMode}
          options={[
            { value: 'aistudio', label: i18n.t.w.assistant.modeAiStudio },
            { value: 'vertex', label: i18n.t.w.assistant.modeVertex }
          ]}
        />
      </div>

      {#if authMode === 'aistudio'}
        <div class="space-y-1">
          <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">{i18n.t.w.assistant.apiKeyTitle}</label>
          <input type="password" bind:value={apiKey} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" placeholder={i18n.t.w.assistant.apiKeyPlaceholder} />
          <p class="text-xs text-neutral-500 mt-2">{i18n.t.w.assistant.apiKeyHelp}<a href="https://aistudio.google.com/" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a>.</p>
        </div>
      {:else}
        <div class="space-y-3">
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">{i18n.t.w.assistant.saTitle}</label>
              <button class="text-[10px] text-blue-400 hover:text-blue-300 underline" onclick={() => showTutorialVertex = !showTutorialVertex}>
                 {showTutorialVertex ? i18n.t.w.assistant.hideInstructions : i18n.t.w.assistant.howToGetThis}
              </button>
            </div>
            {#if showTutorialVertex}
              <div class="bg-black/30 border border-white/5 rounded-lg p-3 text-xs text-neutral-300 space-y-2 mb-3">
                <p class="font-medium text-white mb-1">{i18n.t.w.assistant.instructionTitle}</p>
                <ol class="list-decimal list-inside space-y-1.5 ml-1">
                  <li><a href="https://console.cloud.google.com/" target="_blank" class="text-blue-400 hover:underline">{i18n.t.w.assistant.instructionProject}</a></li>
                  <li><a href="https://console.cloud.google.com/apis/library/aiplatform.googleapis.com" target="_blank" class="text-blue-400 hover:underline">{i18n.t.w.assistant.instructionApi}</a></li>
                  <li>{i18n.t.w.assistant.instructionIam}</li>
                  <li>{i18n.t.w.assistant.instructionRole}</li>
                  <li>{i18n.t.w.assistant.instructionKey}</li>
                  <li>{i18n.t.w.assistant.instructionCopy}</li>
                </ol>
              </div>
            {/if}
            <textarea bind:value={serviceAccountJson} rows="4" class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-xs font-mono text-neutral-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none" placeholder={i18n.t.w.assistant.saPlaceholder}></textarea>
            <p class="text-[10px] text-neutral-500 mt-1">{i18n.t.w.assistant.saHelp}</p>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">{i18n.t.w.assistant.locationTitle}</label>
            <input type="text" bind:value={vertexLocation} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" placeholder={i18n.t.w.assistant.locationPlaceholder} />
          </div>
        </div>
      {/if}
    </div>
  </div>
</SettingsDialog>
