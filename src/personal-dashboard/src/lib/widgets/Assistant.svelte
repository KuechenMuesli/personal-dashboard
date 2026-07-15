<script lang="ts">
  import { Bot, Send, User } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";

  let { id, width, height, showSettings = $bindable(false) } = $props();

  let apiKey = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-api-key-${id}`) || '') : '');
  let authMode = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-auth-mode-${id}`) || 'aistudio') : 'aistudio');
  let serviceAccountJson = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-sa-${id}`) || '') : '');
  let vertexLocation = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem(`assistant-loc-${id}`) || 'us-central1') : 'us-central1');

  let messages = $state<{role: 'user' | 'assistant' | 'system', content?: string, parts?: any[]}[]>([]);
  let input = $state('');
  let isLoading = $state(false);
  let chatContainer: HTMLElement;
  let showTutorialVertex = $state(false);

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`assistant-api-key-${id}`, apiKey);
      localStorage.setItem(`assistant-auth-mode-${id}`, authMode);
      localStorage.setItem(`assistant-sa-${id}`, serviceAccountJson);
      localStorage.setItem(`assistant-loc-${id}`, vertexLocation);
    }
  });

  async function sendMessage(isFunctionReply = false) {
    if (!isFunctionReply) {
        if (!input.trim() || (authMode === 'aistudio' && !apiKey) || (authMode === 'vertex' && !serviceAccountJson)) return;
        const userMessage = input;
        input = '';
        
        if (messages.length === 0) {
          // Collect full context from dashboard
          const contextData: any = {
              notes: {},
              todos: [],
              calendarEvents: [],
              favorites: {},
              layout: []
          };
          if (typeof localStorage !== 'undefined') {
            const layoutRaw = localStorage.getItem('dashboard-layout');
            if (layoutRaw) contextData.layout = JSON.parse(layoutRaw);
            const todosRaw = localStorage.getItem('todo-settings-global');
            if (todosRaw) contextData.todos = JSON.parse(todosRaw);
            const calRaw = localStorage.getItem('global-calendar-events');
            if (calRaw) contextData.calendarEvents = JSON.parse(calRaw);
            
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('note-settings-')) {
                contextData.notes[key.replace('note-settings-', '')] = localStorage.getItem(key);
              }
              if (key && key.startsWith('favorites-settings-')) {
                contextData.favorites[key] = localStorage.getItem(key);
              }
            }
          }
          
          let ctxString = JSON.stringify(contextData, null, 2);
          if (ctxString.length > 20000) ctxString = ctxString.substring(0, 20000) + '...';
          
          messages.push({
            role: 'system', 
            parts: [{ text: `You are a helpful assistant embedded in a personal dashboard. 
The current date and time is: ${new Date().toISOString()}.
Here is some context about the user's dashboard data:
${ctxString}
Use this information if the user asks about their tasks, notes, or dashboard.
You can create notes, update notes, and add todos using your tools.
When creating or updating notes, you CAN and SHOULD use Markdown formatting to make them look good.
If the user asks to set a reminder or alarm for a specific time, DO NOT say you cannot do it. Instead, simply use the 'add_todo' tool and set the 'dueDate' parameter appropriately.
` }]
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
           targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
           targetUrl = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${vertexLocation}/publishers/google/models/gemini-2.5-flash:generateContent`;
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
               }
             ]
           }]
         })
       });
       
       if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(`${res.status}: ${errData?.error?.message || res.statusText || 'API Error'}`);
       }
       const data = await res.json();
       const parts = data.candidates?.[0]?.content?.parts;
       if (!parts) throw new Error('No response parts');
       
       const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
       const text = parts.find((p: any) => p.text)?.text;
       
       if (functionCalls.length > 0 || text) {
           messages.push({ 
               role: 'assistant', 
               parts 
           });
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
                       window.dispatchEvent(new Event('storage')); // Notify other tabs/widgets
                       funcResponse = { success: true };
                   }
               } catch (e: any) {
                   funcResponse = { error: String(e) };
               }
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

<WidgetCard bind:showSettings={showSettings} isConfigured={!!apiKey}>
  <div class="flex flex-col h-full bg-black/10 rounded-lg overflow-hidden">
    <div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {#if messages.filter(m => m.role !== 'system').length === 0}
         <div class="m-auto text-center text-neutral-500 flex flex-col items-center gap-2">
           <Bot size={32} opacity={0.5} />
           <p class="text-sm">How can I help you today?</p>
         </div>
      {/if}
      {#each messages.filter(m => m.role !== 'system' && m.parts && !m.parts.some(p => p.functionResponse)) as msg}
        <div class="flex gap-2 {msg.role === 'user' ? 'flex-row-reverse' : ''}">
          <div class="shrink-0 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center">
            {#if msg.role === 'user'} <User size={12} /> {:else} <Bot size={12} /> {/if}
          </div>
          <div class="max-w-[85%] flex flex-col gap-2">
            {#if msg.parts}
               {#each msg.parts as part}
                  {#if part.text}
                     <div class="rounded-lg p-2.5 text-sm whitespace-pre-wrap {msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-black/30 text-neutral-200'}">
                        {part.text}
                     </div>
                  {/if}
                  {#if part.functionCall}
                     <div class="rounded-lg border border-black/20 bg-black/20 p-3 text-sm text-neutral-200 flex flex-col gap-1.5 shadow-sm">
                       {#if part.functionCall.name === 'add_todo'}
                          <div class="flex items-center gap-2 font-medium text-xs text-neutral-400 uppercase tracking-wider">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                            Task Created
                          </div>
                          <div class="flex items-start gap-2 mt-1">
                            <div class="w-4 h-4 rounded-full border border-neutral-500 shrink-0 mt-0.5"></div>
                            <div>
                               <span class="text-white">{part.functionCall.args.title}</span>
                               {#if part.functionCall.args.dueDate}
                                  <div class="text-xs text-blue-400 mt-0.5 opacity-80">{part.functionCall.args.dueDate.replace('T', ' ')}</div>
                               {/if}
                            </div>
                          </div>
                       {:else if part.functionCall.name === 'create_note' || part.functionCall.name === 'update_note'}
                          <div class="flex items-center gap-2 font-medium text-xs text-neutral-400 uppercase tracking-wider">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            {part.functionCall.name === 'create_note' ? 'Note Created' : 'Note Updated'}
                          </div>
                          <div class="bg-black/20 rounded p-2 text-xs text-neutral-300 mt-1 max-h-24 overflow-hidden relative">
                             {part.functionCall.args.content}
                             <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent"></div>
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
          <div class="shrink-0 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center"><Bot size={12} /></div>
          <div class="bg-black/30 rounded-lg p-2.5 text-sm text-neutral-400">Typing...</div>
        </div>
      {/if}
    </div>
    <div class="p-2 border-t border-black/20 shrink-0">
      <form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-2 relative">
        <input type="text" bind:value={input} placeholder="Ask about your dashboard..." class="w-full bg-black/30 border border-black/20 rounded-full pl-4 pr-10 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <button type="submit" disabled={isLoading || !input.trim()} class="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50">
          <Send size={14} />
        </button>
      </form>
    </div>
  </div>
</WidgetCard>

<SettingsDialog title="Assistant Settings" bind:show={showSettings}>
  <div class="space-y-4">
    <div class="space-y-3">
      <div class="flex items-center gap-4 border-b border-white/10 pb-4">
        <label class="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
          <input type="radio" bind:group={authMode} value="aistudio" class="accent-blue-500" />
          AI Studio (API Key)
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
          <input type="radio" bind:group={authMode} value="vertex" class="accent-blue-500" />
          Google Cloud (Vertex AI)
        </label>
      </div>

      {#if authMode === 'aistudio'}
        <div class="space-y-1">
          <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Gemini API Key</label>
          <input type="password" bind:value={apiKey} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" placeholder="AIzaSy..." />
          <p class="text-xs text-neutral-500 mt-2">Get your free key from <a href="https://aistudio.google.com/" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a>.</p>
        </div>
      {:else}
        <div class="space-y-3">
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Service Account JSON</label>
              <button class="text-[10px] text-blue-400 hover:text-blue-300 underline" onclick={() => showTutorialVertex = !showTutorialVertex}>
                 {showTutorialVertex ? 'Hide instructions' : 'How to get this?'}
              </button>
            </div>
            {#if showTutorialVertex}
              <div class="bg-black/30 border border-white/5 rounded-lg p-3 text-xs text-neutral-300 space-y-2 mb-3">
                <p class="font-medium text-white mb-1">How to generate a Service Account JSON:</p>
                <ol class="list-decimal list-inside space-y-1.5 ml-1">
                  <li>Go to <a href="https://console.cloud.google.com/" target="_blank" class="text-blue-400 hover:underline">Google Cloud Console</a> and create a project.</li>
                  <li>Go to <a href="https://console.cloud.google.com/apis/library/aiplatform.googleapis.com" target="_blank" class="text-blue-400 hover:underline">Vertex AI API</a> and click <strong>Enable</strong>.</li>
                  <li>Go to <strong>IAM & Admin > Service Accounts</strong>.</li>
                  <li>Create a new service account and grant it the <strong>Vertex AI User</strong> role.</li>
                  <li>Click on the new service account, go to <strong>Keys > Add Key > Create new key</strong> (JSON).</li>
                  <li>Open the downloaded file, copy all of its text, and paste it below.</li>
                </ol>
              </div>
            {/if}
            <textarea bind:value={serviceAccountJson} rows="4" class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-xs font-mono text-neutral-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none" placeholder="Paste JSON here..."></textarea>
            <p class="text-[10px] text-neutral-500 mt-1">Paste your Google Cloud Service Account JSON file here. It must have Vertex AI User permissions.</p>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">GCP Location</label>
            <input type="text" bind:value={vertexLocation} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" placeholder="us-central1" />
          </div>
        </div>
      {/if}
    </div>
  </div>
</SettingsDialog>
