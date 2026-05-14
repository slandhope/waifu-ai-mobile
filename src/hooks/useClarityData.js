import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from "react";
import { calcStreak, missedDays, todayKey } from "../constants";
import { apiCall, login } from "../utils/api";

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
        await new Promise(resolve => setTimeout(resolve, 100))

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

        // get JWT token if we don't have one
        const existingToken = await AsyncStorage.getItem('auth-token')
        if(!existingToken) {
          const userName = await AsyncStorage.getItem('user-name') || 'User'
          const loginType = await AsyncStorage.getItem('login-type') || 'apple'
          await login(uid, userName, loginType)
        }

        // register push token
        try {
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

        // load from server
        try {
          const res = await apiCall('/api/sync/' + uid)
          const serverData = await res.json()
          if(serverData.exists) {
            setHistory(serverData.history || {})
            setSeenMilestones(serverData.seenMilestones || [])
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
        await apiCall('/api/sync', {
          method: 'POST',
          body: JSON.stringify({ userId, name, history, seenMilestones, pushToken })
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
