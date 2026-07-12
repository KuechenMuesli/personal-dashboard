export const UNIT_CATEGORIES: Record<string, { factors: Record<string, number> }> = {
  length: {
    factors: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 }
  },
  weight: {
    factors: { g: 1, kg: 1000, mg: 0.001, oz: 28.349523, lb: 453.59237, lbs: 453.59237 }
  },
  volume: {
    factors: { l: 1, ml: 0.001, gal: 3.78541, floz: 0.0295735 }
  },
  time: {
    factors: { ms: 0.001, s: 1, sec: 1, min: 60, h: 3600, hr: 3600, d: 86400, day: 86400, w: 604800, wk: 604800, mo: 2592000, month: 2592000, y: 31536000, yr: 31536000, year: 31536000 }
  }
};

export const TEMPERATURE: Record<string, Record<string, (v: number) => number>> = {
  c: { c: v=>v, f: v=>(v*9/5)+32, k: v=>v+273.15 },
  f: { c: v=>(v-32)*5/9, f: v=>v, k: v=>(v-32)*5/9+273.15 },
  k: { c: v=>v-273.15, f: v=>(v-273.15)*9/5+32, k: v=>v }
};

export function getUnitInfo(unit: string) {
  if (TEMPERATURE[unit]) return { category: 'temperature' };
  for (const [category, data] of Object.entries(UNIT_CATEGORIES)) {
    if (data.factors[unit]) return { category, factor: data.factors[unit] };
  }
  return null;
}

export function getAllCategoryUnits(unit: string): string[] {
  const info = getUnitInfo(unit);
  if (!info) return [];
  if (info.category === 'temperature') {
    return Object.keys(TEMPERATURE[unit]).filter(u => u !== unit);
  }
  return Object.keys(UNIT_CATEGORIES[info.category].factors).filter(u => u !== unit);
}

export const PREDICTIONS: Record<string, string[]> = {
  kg: ['lb', 'g'], g: ['oz', 'kg'], mg: ['g'], oz: ['g'], lb: ['kg'], lbs: ['kg'],
  m: ['ft', 'cm'], cm: ['in', 'm'], mm: ['in', 'cm'], in: ['cm'], ft: ['m'], yd: ['m'], mi: ['km'], km: ['mi'],
  c: ['f'], f: ['c'],
  l: ['gal', 'ml'], ml: ['l', 'floz'], gal: ['l'],
  ms: ['s'], s: ['min', 'ms'], sec: ['min'], min: ['s', 'h'], h: ['min', 'd'], hr: ['min'], d: ['h', 'w'], day: ['h'], w: ['d', 'mo'], mo: ['w', 'y'], y: ['mo']
};

export function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return Number(num.toPrecision(7)).toString().replace('.', ',');
}

export function evaluateMath(input: string): string | null {
  let s = input.toLowerCase().replace(/,/g, '.').trim();
  const mathKeywords = ['sqrt', 'sin', 'cos', 'tan', 'log', 'abs', 'pi'];

  const hasOperator = /[\+\-\*\/\^\%]/.test(s);
  const hasKeyword = mathKeywords.some(kw => s.includes(kw));

  if (!hasOperator && !hasKeyword) return null;

  s = s.replace(/\^/g, '**');
  mathKeywords.forEach(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'g');
    s = s.replace(regex, kw === 'pi' ? 'Math.PI' : `Math.${kw}`);
  });

  const securityCheck = s.replace(/Math\.(sqrt|sin|cos|tan|log|abs|PI)/g, '');
  if (!/^[\d\+\-\*\/\(\)\.\s\%]+$/.test(securityCheck)) return null;

  try {
    const res = new Function(`return ${s}`)();
    if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
      return formatNumber(res);
    }
  } catch { return null; }
  return null;
}

export function calculateConversion(val: number, fromUnit: string, toUnit: string): string | null {
  const fromInfo = getUnitInfo(fromUnit);
  const toInfo = getUnitInfo(toUnit);

  if (!fromInfo || !toInfo || fromInfo.category !== toInfo.category) return null;

  let res: number;
  if (fromInfo.category === 'temperature') {
    res = TEMPERATURE[fromUnit][toUnit](val);
  } else {
    const valueInBase = val * fromInfo.factor!;
    res = valueInBase / toInfo.factor!;
  }

  return formatNumber(res);
}

export function evaluateConversion(input: string): { val: string, unit: string }[] {
  const results: { val: string, unit: string }[] = [];
  const trimmed = input.trim();

  const explicitMatch = trimmed.match(/^([\d\.\,]+)\s*([a-zA-Z]+)\s+(in|to)\s*([a-zA-Z]*)$/i);
  if (explicitMatch) {
    const val = parseFloat(explicitMatch[1].replace(',', '.'));
    const fromUnit = explicitMatch[2].toLowerCase();
    const targetPrefix = explicitMatch[4].toLowerCase();

    if (!isNaN(val)) {
      const allUnits = getAllCategoryUnits(fromUnit);

      let targetUnits = targetPrefix
        ? allUnits.filter(u => u.startsWith(targetPrefix))
        : allUnits;

      targetUnits.sort((a, b) => a.length - b.length);

      const seenValues = new Set<string>();

      for (const toUnit of targetUnits) {
        const res = calculateConversion(val, fromUnit, toUnit);
        if (res !== null && !seenValues.has(res)) {
          seenValues.add(res);
          results.push({ val: res, unit: toUnit });
        }
      }
    }
    return results;
  }

  const implicitMatch = trimmed.match(/^([\d\.\,]+)\s*([a-zA-Z]+)$/i);
  if (implicitMatch) {
    const val = parseFloat(implicitMatch[1].replace(',', '.'));
    const fromUnit = implicitMatch[2].toLowerCase();

    if (!isNaN(val) && PREDICTIONS[fromUnit]) {
      const seenValues = new Set<string>();

      for (const toUnit of PREDICTIONS[fromUnit]) {
        const res = calculateConversion(val, fromUnit, toUnit);
        if (res !== null && !seenValues.has(res)) {
          seenValues.add(res);
          results.push({ val: res, unit: toUnit });
        }
      }
    }
  }

  return results;
}

export function getStoredEventsAndReminders() {
  const calsStr = localStorage.getItem('global-calendar-events');
  const remStr = localStorage.getItem('global-reminders');

  let events: any[] = [];
  if (calsStr) {
    try {
      const cals = JSON.parse(calsStr);
      cals.forEach((c: any) => {
         c.events.forEach((e: any) => {
            const fullDesc = [e.location, e.description].filter(Boolean).join('\n\n');
            events.push({ type: 'CALENDAR', title: e.title, desc: fullDesc, date: new Date(e.start), list: c.name, tags: [] });
         });
      });
    } catch(e){}
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (key.startsWith('todo-apple-cache-') || key.startsWith('todo-ms-cache-')) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (parsed.data && Array.isArray(parsed.data)) {
          parsed.data.forEach((r: any) => {
            if (r.completed) return;
            events.push({ type: 'REMINDER', title: r.title, desc: r.notes, date: r.dueDate ? new Date(r.dueDate) : null, list: r.list, tags: r.tags || [] });
          });
        }
      } catch(e){}
    } else if (key.startsWith('todo-settings-')) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed)) {
          parsed.forEach((r: any) => {
            if (r.completed) return;
            events.push({ type: 'REMINDER', title: r.title, desc: r.notes, date: r.dueDate ? new Date(r.dueDate) : null, list: 'Lokal', tags: r.tags || [] });
          });
        }
      } catch(e){}
    }
  }

  return events;
}

export function parseNaturalDateRange(query: string): { start: Date, end: Date } | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
  const getNextDayOfWeek = (dayOfWeek: number) => {
     const d = new Date(today);
     const diff = dayOfWeek - d.getDay();
     const daysToAdd = diff <= 0 ? diff + 7 : diff;
     return addDays(d, daysToAdd);
  };

  let start = today;
  let end = today;

  if (['heute', 'today'].includes(q)) return { start, end };
  if (['morgen', 'tomorrow'].includes(q)) { start = addDays(today, 1); return { start, end: start }; }
  if (['übermorgen', 'day after tomorrow'].includes(q)) { start = addDays(today, 2); return { start, end: start }; }

  if (['wochenende', 'dieses wochenende', 'this weekend', 'weekend'].includes(q)) {
      const sat = getNextDayOfWeek(6);
      return { start: sat, end: addDays(sat, 1) };
  }
  if (['nächstes wochenende', 'next weekend'].includes(q)) {
      const nextSat = addDays(getNextDayOfWeek(6), 7);
      return { start: nextSat, end: addDays(nextSat, 1) };
  }

  if (['diese woche', 'this week'].includes(q)) {
      const sun = getNextDayOfWeek(0);
      return { start: today, end: sun };
  }
  if (['nächste woche', 'next week', 'kommende woche'].includes(q)) {
      const nextMon = getNextDayOfWeek(1);
      return { start: nextMon, end: addDays(nextMon, 6) };
  }

  if (['diesen monat', 'this month'].includes(q)) {
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: today, end: lastDay };
  }
  if (['nächster monat', 'nächsten monat', 'next month'].includes(q)) {
      const firstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return { start: firstDay, end: lastDay };
  }

  const weekdays: Record<string, number> = {
      'sonntag': 0, 'sunday': 0, 'so': 0, 'sun': 0,
      'montag': 1, 'monday': 1, 'mo': 1, 'mon': 1,
      'dienstag': 2, 'tuesday': 2, 'di': 2, 'tue': 2,
      'mittwoch': 3, 'wednesday': 3, 'mi': 3, 'wed': 3,
      'donnerstag': 4, 'thursday': 4, 'do': 4, 'thu': 4,
      'freitag': 5, 'friday': 5, 'fr': 5, 'fri': 5,
      'samstag': 6, 'saturday': 6, 'sa': 6, 'sat': 6
  };

  if (weekdays[q] !== undefined) {
      start = getNextDayOfWeek(weekdays[q]);
      return { start, end: start };
  }

  const parts = q.split(' ');
  if (parts.length === 2 && ['nächster', 'nächsten', 'next', 'kommender', 'kommenden'].includes(parts[0])) {
      const day = weekdays[parts[1]];
      if (day !== undefined) {
          start = addDays(getNextDayOfWeek(day), 7);
          return { start, end: start };
      }
  }

  return null;
}
