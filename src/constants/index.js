export const HABITS = [
  { id: "sleep", label: "8 hours of sleep", shortLabel: "Sleep", emoji: "🌙", color: "#a78bfa", pts: 20, science: "Sleep consolidates memory and clears metabolic waste from the brain via the glymphatic system." },
  { id: "exercise", label: "30 min of movement", shortLabel: "Exercise", emoji: "💪", color: "#f472b6", pts: 20, science: "Exercise boosts BDNF, a protein that supports neuron growth and cognitive function." },
  { id: "hydration", label: "2L of water", shortLabel: "Hydration", emoji: "💧", color: "#60a5fa", pts: 15, science: "Even mild dehydration (1–2%) impairs attention, memory, and mood." },
  { id: "meditation", label: "10 min mindfulness", shortLabel: "Mindfulness", emoji: "🧘", color: "#34d399", pts: 15, science: "Just 10 minutes daily strengthens prefrontal cortex activity linked to focus." },
  { id: "nutrition", label: "Whole foods meal", shortLabel: "Nutrition", emoji: "🥗", color: "#fb923c", pts: 15, science: "Omega-3s, leafy greens, and berries measurably support cognitive performance." },
  { id: "breathwork", label: "Stress reset (breathwork)", shortLabel: "Breathwork", emoji: "🌬️", color: "#22d3ee", pts: 10, science: "Slow breathing activates the vagus nerve, downregulating cortisol in minutes." },
  { id: "screens", label: "No screens 1hr before bed", shortLabel: "Screen limit", emoji: "📵", color: "#facc15", pts: 5, science: "Blue light suppresses melatonin by up to 50%, delaying sleep onset." },
];

export const COLORS = {
  bg: "#0a0a0f", surface: "#111118", surfaceAlt: "#1a1a24",
  border: "rgba(255,255,255,0.08)", text: "#ffffff",
  textMuted: "rgba(255,255,255,0.5)", textFaint: "rgba(255,255,255,0.25)",
  purple: "#a78bfa", purpleDark: "#6c5ce7", pink: "#f472b6", flame: "#ff8c42",
};

export const MILESTONES = [3, 7, 14, 30, 50, 100];
export const todayKey = () => new Date().toISOString().split("T")[0];

export const calcScore = (checkedIds) => {
  const total = HABITS.reduce((s, h) => s + h.pts, 0);
  const done = HABITS.filter((h) => checkedIds.includes(h.id)).reduce((s, h) => s + h.pts, 0);
  return Math.round((done / total) * 100);
};

export const calcStreak = (history) => {
  let s = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split("T")[0];
    if ((history[key] || []).length >= Math.ceil(HABITS.length / 2)) { s++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return s;
};

export const missedDays = (history) => {
  let missed = 0;
  const d = new Date();
  while (missed < 10) {
    const key = d.toISOString().split("T")[0];
    if ((history[key] || []).length >= Math.ceil(HABITS.length / 2)) break;
    missed++;
    d.setDate(d.getDate() - 1);
  }
  return missed;
};

export const logoMood = (missed) => {
  if (missed === 0) return { emoji: "✨", label: "Active", color: "#a78bfa" };
  if (missed === 1) return { emoji: "😕", label: "Missing you", color: "#facc15" };
  if (missed === 2) return { emoji: "😢", label: "Please come back", color: "#fb923c" };
  if (missed === 3) return { emoji: "😭", label: "Crying for you", color: "#f472b6" };
  return { emoji: "💔", label: "Broken", color: "#555" };
};

export const API_URL = 'https://clarity-app-production-e136.up.railway.app';
export const LIGHT_COLORS = {
  bg: '#f8f8f2',
  surface: '#ffffff',
  surfaceAlt: '#f0f0f0',
  border: 'rgba(0,0,0,0.08)',
  text: '#000000',
  textMuted: 'rgba(0,0,0,0.5)',
  textFaint: 'rgba(0,0,0,0.25)',
  purple: '#6c5ce7',
  purpleDark: '#5a4bd1',
  pink: '#e84393',
  flame: '#ff6b2b',
}
export const ACCENT_COLORS = {
  purple_dark: {
    name: 'Violet', emoji: '💜', isDark: true,
    primary: '#6c5ce7', light: '#a78bfa',
    gradient: ['#6c5ce7', '#f472b6'],
    glow: 'rgba(108,92,231,0.15)',
    bg: '#0a0a0f', surface: '#111118', surfaceAlt: '#1a1a24',
  },
  purple_light: {
    name: 'Violet', emoji: '💜', isDark: false,
    primary: '#6c5ce7', light: '#a78bfa',
    gradient: ['#6c5ce7', '#f472b6'],
    glow: 'rgba(108,92,231,0.1)',
    bg: '#f5f3ff', surface: '#ffffff', surfaceAlt: '#ede9fe',
  },
  green_dark: {
    name: 'Forest', emoji: '🌿', isDark: true,
    primary: '#10b981', light: '#34d399',
    gradient: ['#10b981', '#06b6d4'],
    glow: 'rgba(16,185,129,0.15)',
    bg: '#050f0a', surface: '#0a1f14', surfaceAlt: '#0f2e1e',
  },
  green_light: {
    name: 'Fresh', emoji: '🌿', isDark: false,
    primary: '#10b981', light: '#34d399',
    gradient: ['#10b981', '#06b6d4'],
    glow: 'rgba(16,185,129,0.1)',
    bg: '#f0fdf9', surface: '#ffffff', surfaceAlt: '#dcfce7',
  },
  blue_dark: {
    name: 'Ocean', emoji: '💙', isDark: true,
    primary: '#3b82f6', light: '#60a5fa',
    gradient: ['#3b82f6', '#8b5cf6'],
    glow: 'rgba(59,130,246,0.15)',
    bg: '#05080f', surface: '#0a1020', surfaceAlt: '#0f1830',
  },
  blue_light: {
    name: 'Ocean', emoji: '💙', isDark: false,
    primary: '#3b82f6', light: '#60a5fa',
    gradient: ['#3b82f6', '#8b5cf6'],
    glow: 'rgba(59,130,246,0.1)',
    bg: '#eff6ff', surface: '#ffffff', surfaceAlt: '#dbeafe',
  },
  gold_dark: {
    name: 'Gold', emoji: '✨', isDark: true,
    primary: '#f59e0b', light: '#fbbf24',
    gradient: ['#f59e0b', '#ef4444'],
    glow: 'rgba(245,158,11,0.15)',
    bg: '#0f0c05', surface: '#1a1505', surfaceAlt: '#241e08',
  },
  gold_light: {
    name: 'Gold', emoji: '✨', isDark: false,
    primary: '#f59e0b', light: '#fbbf24',
    gradient: ['#f59e0b', '#ef4444'],
    glow: 'rgba(245,158,11,0.1)',
    bg: '#fffbeb', surface: '#ffffff', surfaceAlt: '#fef3c7',
  },
}