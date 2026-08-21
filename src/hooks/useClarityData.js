import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { calcStreak, missedDays, todayKey } from "../constants";
import { mergeCoachFromServer, goalsToCloudPayload, loadDailyGoals } from "../lib/aiGoalsStore";
import { pullAllFromCloud, pushAllSoon } from "../lib/cloudSync";
import { renewAsukaHabits } from "../lib/asukaHabits";
import { collectLocalExtras } from "../lib/extrasSync";
import { apiCall, fetchMe } from "../utils/api";
import { isExpoGo } from "../utils/isExpoGo";

const STORAGE_KEY = "clarity-data-v1";

export function useClarityData() {
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState({});
  const [messages, setMessages] = useState([]);
  const [weeklyInsight, setWeeklyInsight] = useState(null);
  const [seenMilestones, setSeenMilestones] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let uid = await AsyncStorage.getItem('user-id')
        if(!uid) {
          uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
          })
          await AsyncStorage.setItem('user-id', uid)
        }
        setUserId(uid)

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if(raw) {
          const data = JSON.parse(raw);
          setHistory(data.history || {});
          setMessages(data.messages || []);
          setWeeklyInsight(data.weeklyInsight || null);
          setSeenMilestones(data.seenMilestones || []);
        }
      } catch(e) {
        console.log('load error:', e)
      }
      setLoaded(true);

      // Background: push token + server sync (don't block home UI)
      try {
        if (!isExpoGo()) {
          try {
            const Notifications = await import('expo-notifications')
            const { status } = await Notifications.requestPermissionsAsync()
            if(status === 'granted') {
              const token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'c93d34f9-e72f-47e4-bef2-a4bc6467b5a9'
              })).data
              await AsyncStorage.setItem('push-token', token)
              console.log('Push token:', token)
            }
          } catch(e) {
            console.log('Push token error:', e.message)
          }
        }

        const uid = await AsyncStorage.getItem('user-id')
        const token = await AsyncStorage.getItem('auth-token')
        let serverData = null
        if (token) {
          serverData = await fetchMe()
          if (serverData) {
            await pullAllFromCloud(serverData)
            renewAsukaHabits().catch(() => {})
            const refreshed = await AsyncStorage.getItem(STORAGE_KEY)
            if (refreshed) {
              const parsed = JSON.parse(refreshed)
              if (parsed.weeklyInsight) setWeeklyInsight(parsed.weeklyInsight)
            }
          }
        }
        if (serverData?.exists || serverData?.history) {
          const localRaw = await AsyncStorage.getItem(STORAGE_KEY)
          const localData = localRaw ? JSON.parse(localRaw) : {}
          const localHistory = localData.history || {}
          const mergedHistory = { ...localHistory }
          for (const [day, habits] of Object.entries(serverData.history || {})) {
            const localDay = mergedHistory[day] || []
            mergedHistory[day] = [...new Set([...localDay, ...(habits || [])])]
          }
          const mergedMilestones = [...new Set([
            ...(localData.seenMilestones || []),
            ...(serverData.seenMilestones || []),
          ])]
          setHistory(mergedHistory)
          setSeenMilestones(mergedMilestones)
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            history: mergedHistory,
            messages: localData.messages || [],
            weeklyInsight: localData.weeklyInsight || null,
            seenMilestones: mergedMilestones,
          }))
        }
      } catch(e) {
        console.log('background sync failed:', e.message)
      }
    })();
  }, []);

  useEffect(() => {
    if(!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ history, messages, weeklyInsight, seenMilestones })
    ).catch(() => {});
  }, [history, messages, weeklyInsight, seenMilestones, loaded]);

  useEffect(() => {
    if(!loaded || !userId) return
    const syncToServer = async () => {
      try {
        const name = await AsyncStorage.getItem('user-name') || 'User'
        const pushToken = await AsyncStorage.getItem('push-token')
        const coach = goalsToCloudPayload(await loadDailyGoals())
        const syncExtras = await collectLocalExtras()
        await apiCall('/api/sync', {
          method: 'POST',
          body: JSON.stringify({
            userId, name, history, seenMilestones, pushToken,
            ...(coach || {}),
            syncExtras: { ...syncExtras, weeklyInsight: weeklyInsight || syncExtras.weeklyInsight || null },
          })
        })
        console.log('synced to server!')
      } catch(e) {
        console.log('sync failed:', e.message)
      }
    }
    syncToServer()
  }, [history, seenMilestones, weeklyInsight, loaded, userId])

  const today = todayKey();
  const todayHabits = history[today] || [];
  const streak = calcStreak(history);
  const missed = missedDays(history);

  const toggleHabit = (id) => {
    const current = history[today] || [];
    const next = current.includes(id)
      ? current.filter((h) => h !== id)
      : [...current, id];
    setHistory((prev) => ({ ...prev, [today]: next }));
    return next;
  };

  const toggleHabitOnDate = (id, dateKey) => {
    if (!dateKey || dateKey > todayKey()) return history[dateKey] || [];
    const current = history[dateKey] || [];
    const next = current.includes(id)
      ? current.filter((h) => h !== id)
      : [...current, id];
    setHistory((prev) => ({ ...prev, [dateKey]: next }));
    return next;
  };

  const addMessage = (msg) => setMessages((prev) => [...prev.slice(-30), msg]);
  const markMilestoneSeen = (val) => setSeenMilestones((prev) => [...prev, val]);
  const setWeeklyInsightSynced = (val) => {
    setWeeklyInsight(val)
    pushAllSoon()
  }

  return {
    loaded, history, todayHabits, streak, missed,
    messages, setMessages, addMessage,
    weeklyInsight, setWeeklyInsight: setWeeklyInsightSynced,
    seenMilestones, markMilestoneSeen, toggleHabit, toggleHabitOnDate,
  };
}
