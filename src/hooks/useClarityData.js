import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import uuid from 'react-native-uuid';
import { API_URL, calcStreak, missedDays, todayKey } from "../constants";

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
        await new Promise(resolve => setTimeout(resolve, 100)) // wait for native modules

        // get or create user ID
        let uid = await AsyncStorage.getItem('user-id')
        if(!uid) {
          uid = uuid.v4()
          await AsyncStorage.setItem('user-id', uid)
        }
        setUserId(uid)

        // try to load from server first
        try {
          const res = await fetch(`${API_URL}/api/sync/${uid}`)
          const serverData = await res.json()
          if(serverData.exists) {
            setHistory(serverData.history || {})
            setSeenMilestones(serverData.seenMilestones || [])
            // also save to local
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
              history: serverData.history || {},
              messages: [],
              weeklyInsight: null,
              seenMilestones: serverData.seenMilestones || []
            }))
            setLoaded(true)
            return
          }
        } catch(e) {
          console.log('server load failed, using local:', e.message)
        }

        // fallback to local storage
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setHistory(data.history || {});
          setMessages(data.messages || []);
          setWeeklyInsight(data.weeklyInsight || null);
          setSeenMilestones(data.seenMilestones || []);
        }
      } catch (e) {
        console.log('load error:', e)
      }
      setLoaded(true);
    })();
  }, []);

  // save to local storage
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ history, messages, weeklyInsight, seenMilestones })
    ).catch(() => {});
  }, [history, messages, weeklyInsight, seenMilestones, loaded]);

  // sync to server every time history changes
  useEffect(() => {
    if(!loaded || !userId) return
    const syncToServer = async () => {
      try {
        const name = await AsyncStorage.getItem('user-name') || 'User'
        await fetch(`${API_URL}/api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name, history, seenMilestones })
        })
        console.log('synced to server!')
      } catch(e) {
        console.log('sync failed:', e.message)
      }
    }
    syncToServer()
  }, [history, seenMilestones])

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

  const addMessage = (msg) => setMessages((prev) => [...prev.slice(-30), msg]);
  const markMilestoneSeen = (val) => setSeenMilestones((prev) => [...prev, val]);

  return {
    loaded, history, todayHabits, streak, missed,
    messages, setMessages, addMessage,
    weeklyInsight, setWeeklyInsight,
    seenMilestones, markMilestoneSeen, toggleHabit,
  };
}