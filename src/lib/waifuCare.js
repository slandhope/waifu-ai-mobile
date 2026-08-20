/** Care + shop logic — ported from crypto-ai-desktop/main.js (PC) */

export const DEFAULT_TIERS = [
  { level: 1, name: 'Acquaintance', xp: 0, emoji: '🌱', unlocks: [] },
  { level: 2, name: 'Friend', xp: 100, emoji: '🌸', unlocks: ['outfit:casual'] },
  { level: 3, name: 'Close', xp: 300, emoji: '💛', unlocks: ['hair:long', 'accessory:flower'] },
  { level: 4, name: 'Trusted', xp: 600, emoji: '💗', unlocks: ['outfit:kimono', 'hair:twintails'] },
  { level: 5, name: 'Cherished', xp: 1000, emoji: '💖', unlocks: ['accessory:catears', 'outfit:gothic'] },
  { level: 6, name: 'Devoted', xp: 1600, emoji: '💝', unlocks: ['hair:silver', 'accessory:crown'] },
  { level: 7, name: 'Soulbound', xp: 2500, emoji: '👑', unlocks: ['outfit:santa', 'special:poses'] },
]

export const COSMETICS = {
  outfit: [
    { id: 'default', name: 'Default', price: 0, emoji: '✨' },
    { id: 'alexia_dress', name: 'Alexia Dress', price: 0, live2dExpr: 'yf', characters: ['alexia'], emoji: '👗' },
    { id: 'alexia_hat', name: 'Alexia Dress + Hat', price: 150, live2dExpr: 'yfmz', characters: ['alexia'], emoji: '🎩' },
    { id: 'alexia_pose', name: 'Idle Poses', price: 100, live2dExpr: 'zs1', autoPose: true, characters: ['alexia'], emoji: '💃' },
    { id: 'casual', name: 'Casual Hoodie', price: 200, characters: ['asuka'], emoji: '🧥' },
    { id: 'kimono', name: 'Sakura Kimono', price: 500, characters: ['asuka'], emoji: '👘' },
    { id: 'gothic', name: 'Gothic Lolita', price: 600, characters: ['asuka'], emoji: '🖤' },
    { id: 'swimsuit', name: 'Summer Swimsuit', price: 450, seasonal: 'summer', characters: ['asuka'], emoji: '👙' },
    { id: 'santa', name: 'Santa Outfit', price: 400, seasonal: 'winter', limited: true, characters: ['asuka'], emoji: '🎅' },
  ],
  hair: [
    { id: 'default', name: 'Default', price: 0, emoji: '✨' },
    { id: 'alexia_eyes_a', name: 'Eye Color A', price: 80, live2dExpr: 'yjys1', characters: ['alexia'], emoji: '👁️' },
    { id: 'alexia_eyes_b', name: 'Eye Color B', price: 80, live2dExpr: 'yjys2', characters: ['alexia'], emoji: '🧿' },
    { id: 'long', name: 'Long Flowing', price: 150, characters: ['asuka'], emoji: '💇' },
    { id: 'twintails', name: 'Twin Tails', price: 200, characters: ['asuka'], emoji: '🎀' },
    { id: 'short', name: 'Short Bob', price: 150, characters: ['asuka'], emoji: '✂️' },
    { id: 'silver', name: 'Silver (color)', price: 250, characters: ['asuka'], emoji: '🩶' },
  ],
  accessory: [
    { id: 'none', name: 'None', price: 0, emoji: '∅' },
    { id: 'glasses', name: 'Cute Glasses', price: 100, live2dExpr: 'dyj', emoji: '👓' },
    { id: 'sunglasses', name: 'Sunglasses', price: 120, live2dExpr: 'mj', characters: ['alexia'], emoji: '🕶️' },
    { id: 'alexia_bbt', name: 'BBT Accent', price: 90, live2dExpr: 'bbt', characters: ['alexia'], emoji: '🎀' },
    { id: 'catears', name: 'Cat Ears', price: 180, characters: ['asuka'], emoji: '🐱' },
    { id: 'flower', name: 'Hair Flower', price: 120, characters: ['asuka'], emoji: '🌸' },
    { id: 'crown', name: 'Tiny Crown', price: 300, limited: true, characters: ['asuka'], emoji: '👑' },
  ],
}

export const CARE_MESSAGES = {
  feed: ["Mmm thank you! I'm so full now~ 🍰", "Yummy! Thank you for feeding me 💕"],
  pat: ["Ehehe~ that feels nice 💕", "Headpats! My favorite~ 🥰", "I love when you pat me!"],
  clean: ["All fresh and clean now~ thank you! ✨"],
  play: ["Yay, playtime! That was fun~ 🎀"],
}

export function defaultCareState() {
  return {
    hunger: 80,
    happiness: 85,
    cleanliness: 90,
    affection: 0,
    coins: 100000,
    bondXP: 0,
    streak: 0,
    lastCareDay: null,
    lastTick: Date.now(),
    owned: ['default', 'none', 'alexia_dress'],
    equipped: { outfit: 'default', hair: 'default', accessory: null },
    equippedByChar: {
      asuka: { outfit: 'default', hair: 'default', accessory: null },
      alexia: { outfit: 'alexia_dress', hair: 'default', accessory: null },
    },
  }
}

export function getTier(xp) {
  let cur = DEFAULT_TIERS[0]
  for (const t of DEFAULT_TIERS) if (xp >= t.xp) cur = t
  return cur
}

export function getNextTier(xp) {
  return DEFAULT_TIERS.find((t) => t.xp > xp) || null
}

export function unlockedByLevel(xp) {
  const tier = getTier(xp)
  const ids = []
  for (const t of DEFAULT_TIERS) if (t.level <= tier.level) ids.push(...t.unlocks)
  return ids
}

export function getRelationship(xp) {
  const tier = getTier(xp)
  const next = getNextTier(xp)
  return {
    xp,
    tier,
    next,
    progress: next ? Math.round(((xp - tier.xp) / (next.xp - tier.xp)) * 100) : 100,
    toNext: next ? next.xp - xp : 0,
  }
}

export function applyDecay(care) {
  const d = { ...care }
  const hoursSince = (Date.now() - (d.lastTick || Date.now())) / 3600000
  if (hoursSince > 0.1) {
    d.hunger = Math.max(0, (d.hunger ?? 80) - hoursSince * 4)
    d.cleanliness = Math.max(0, (d.cleanliness ?? 90) - hoursSince * 2)
    d.happiness = Math.max(0, Math.min(100, (d.happiness ?? 80) - hoursSince * 1.5))
    d.lastTick = Date.now()
  }
  if (!d.equippedByChar || typeof d.equippedByChar !== 'object') d.equippedByChar = {}
  if (!d.equipped) d.equipped = { outfit: 'default', hair: 'default', accessory: null }
  if (!Array.isArray(d.owned)) d.owned = ['default', 'none']
  return d
}

export function getEquippedForChar(care, charId) {
  const d = care
  const id = charId || 'asuka'
  if (!d.equippedByChar[id]) {
    d.equippedByChar[id] = id === 'alexia'
      ? { outfit: 'alexia_dress', hair: 'default', accessory: null }
      : { outfit: 'default', hair: 'default', accessory: null }
  }
  return d.equippedByChar[id]
}

export function syncActiveEquipped(care, activeCharacterId) {
  care.equipped = { ...getEquippedForChar(care, activeCharacterId) }
  return care.equipped
}

function tickStreak(d) {
  const today = new Date().toDateString()
  if (d.lastCareDay !== today) {
    const yest = new Date(Date.now() - 864e5).toDateString()
    d.streak = d.lastCareDay === yest ? (d.streak || 0) + 1 : 1
    d.lastCareDay = today
    d.coins = (d.coins || 0) + 10 + Math.min(d.streak, 20)
    return true
  }
  return false
}

export function addBondXP(d, amount) {
  const before = getTier(d.bondXP || 0)
  d.bondXP = (d.bondXP || 0) + amount
  const after = getTier(d.bondXP)
  if (after.level > before.level) {
    const newUnlocks = after.unlocks || []
    for (const u of newUnlocks) {
      const id = u.split(':')[1]
      if (id && !d.owned.includes(id)) d.owned.push(id)
    }
    d.coins = (d.coins || 0) + after.level * 50
    return { leveledUp: true, tier: after, unlocked: newUnlocks, coinBonus: after.level * 50 }
  }
  return { leveledUp: false, tier: after }
}

export function performCareAction(care, action) {
  const d = applyDecay({ ...care, equippedByChar: { ...care.equippedByChar } })
  const newDay = tickStreak(d)
  const xpGain = { feed: 8, pat: 15, clean: 6, play: 12 }[action] || 5

  if (action === 'feed') {
    d.hunger = Math.min(100, d.hunger + 30)
    d.happiness = Math.min(100, d.happiness + 8)
    d.affection = Math.min(100, d.affection + 3)
  } else if (action === 'pat') {
    d.happiness = Math.min(100, d.happiness + 15)
    d.affection = Math.min(100, d.affection + 5)
  } else if (action === 'clean') {
    d.cleanliness = Math.min(100, d.cleanliness + 40)
    d.happiness = Math.min(100, d.happiness + 6)
    d.affection = Math.min(100, d.affection + 2)
  } else if (action === 'play') {
    d.happiness = Math.min(100, d.happiness + 20)
    d.hunger = Math.max(0, d.hunger - 5)
    d.affection = Math.min(100, d.affection + 6)
    d.coins = (d.coins || 0) + 5
  }

  const msgs = CARE_MESSAGES[action] || ['💕']
  const message = action === 'feed' && d.hunger > 90 ? msgs[0] : msgs[Math.floor(Math.random() * msgs.length)]
  const levelInfo = addBondXP(d, xpGain)
  d.lastTick = Date.now()
  return { care: d, message, newDay, levelInfo }
}

const HABIT_MESSAGES = [
  'Nice! +{coins} coins for that habit~ ✨',
  'You did it! {coins} coins earned 💕',
  'Proud of you — +{coins} 🪙',
]

export function rewardHabitCompletion(care, { pts = 10, perfectDay = false, milestone = null, label = 'habit' }) {
  const d = applyDecay({ ...care, equippedByChar: { ...care.equippedByChar } })
  let coins = Math.max(5, Math.round(pts / 2))
  let xp = Math.max(4, Math.round(pts / 4))
  d.happiness = Math.min(100, (d.happiness || 80) + 4)
  d.affection = Math.min(100, (d.affection || 0) + 2)

  if (perfectDay) {
    coins += 50
    xp += 25
    d.happiness = Math.min(100, d.happiness + 10)
  }
  if (milestone) {
    coins += milestone * 15
    xp += milestone * 5
  }

  d.coins = (d.coins || 0) + coins
  const levelInfo = addBondXP(d, xp)
  d.lastTick = Date.now()

  let message
  if (perfectDay && milestone) {
    message = `Perfect day + ${milestone}-day streak! +${coins} coins 🎉`
  } else if (perfectDay) {
    message = `All habits done today! +${coins} coins including perfect-day bonus 🌟`
  } else if (milestone) {
    message = `${milestone}-day streak milestone! +${coins} coins 🔥`
  } else {
    const tpl = HABIT_MESSAGES[Math.floor(Math.random() * HABIT_MESSAGES.length)]
    message = tpl.replace('{coins}', String(coins)).replace('habit', label)
  }

  return { care: d, coins, xp, levelInfo, message, perfectDay, milestone }
}

function currentSeason() {
  const month = new Date().getMonth()
  if (month >= 5 && month <= 7) return 'summer'
  if (month === 11 || month <= 1) return 'winter'
  return 'all'
}

export function buildShopCatalog(care, characterId, activeCharacterId, characters) {
  const d = applyDecay({ ...care, owned: [...care.owned], equippedByChar: { ...care.equippedByChar } })
  const season = currentSeason()
  const unlockedIds = unlockedByLevel(d.bondXP || 0)
  const charId = characterId || activeCharacterId

  for (const cat of ['outfit', 'hair', 'accessory']) {
    for (const item of COSMETICS[cat]) {
      if (item.price === 0 && (!item.characters || item.characters.includes(charId)) && !d.owned.includes(item.id)) {
        d.owned.push(item.id)
      }
    }
  }

  const levelGate = {}
  for (const t of DEFAULT_TIERS) {
    for (const u of t.unlocks || []) {
      const [, id] = u.split(':')
      levelGate[id] = t
    }
  }

  const equipped = getEquippedForChar(d, charId)
  const tag = (items, cat) =>
    items
      .filter((i) => !i.characters || i.characters.includes(charId))
      .map((i) => {
        const gate = levelGate[i.id]
        const levelLocked = gate && (d.bondXP || 0) < gate.xp && !d.owned.includes(i.id)
        return {
          ...i,
          owned: d.owned.includes(i.id) || i.price === 0,
          available: !i.seasonal || i.seasonal === season,
          levelLocked,
          unlockLevel: gate ? gate.level : null,
          unlockTierName: gate ? gate.name : null,
          freeUnlock: unlockedIds.includes(`${cat}:${i.id}`),
        }
      })

  return {
    care: d,
    coins: d.coins,
    equipped,
    bondXP: d.bondXP || 0,
    tier: getTier(d.bondXP || 0),
    characterId: charId,
    catalog: {
      outfit: tag(COSMETICS.outfit, 'outfit'),
      hair: tag(COSMETICS.hair, 'hair'),
      accessory: tag(COSMETICS.accessory, 'accessory'),
    },
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      active: c.id === activeCharacterId,
    })),
  }
}

export function shopBuy(care, category, id) {
  const d = { ...care, owned: [...care.owned] }
  const item = (COSMETICS[category] || []).find((i) => i.id === id)
  if (!item) return { error: 'Item not found' }
  if (d.owned.includes(id)) return { error: 'Already owned' }
  for (const t of DEFAULT_TIERS) {
    for (const u of t.unlocks || []) {
      if (u === `${category}:${id}` && (d.bondXP || 0) < t.xp) {
        return { error: 'locked', needLevel: t.level, tierName: t.name }
      }
    }
  }
  if ((d.coins || 0) < item.price) return { error: 'not_enough', need: item.price - d.coins }
  d.coins -= item.price
  d.owned.push(id)
  d.lastTick = Date.now()
  return {
    success: true,
    care: d,
    coins: d.coins,
    message: item.autoPose ? "Pose unlocked — she'll pose on her own now 💃" : `Got the ${item.name}! Want me to wear it? 💕`,
    item,
  }
}

export function shopEquip(care, category, id, characterId) {
  const d = { ...care, equippedByChar: { ...care.equippedByChar } }
  const item = (COSMETICS[category] || []).find((i) => i.id === id)
  if (!item) return { error: 'Not found' }
  if (item.price > 0 && !d.owned.includes(id)) return { error: 'Not owned' }
  const eq = getEquippedForChar(d, characterId)
  eq[category] = id === 'none' ? null : id
  d.equippedByChar[characterId] = eq
  d.lastTick = Date.now()
  return {
    success: true,
    care: d,
    equipped: eq,
    live2dExpr: item.live2dExpr || null,
    item,
  }
}

export function getLive2dExprsForEquipped(equipped) {
  if (!equipped) return []
  const exprs = []
  for (const cat of ['outfit', 'hair', 'accessory']) {
    const id = equipped[cat]
    if (!id) continue
    const item = (COSMETICS[cat] || []).find((i) => i.id === id)
    if (item?.live2dExpr) exprs.push(item.live2dExpr)
  }
  return exprs
}

export function careToCloudPayload(care) {
  return {
    bond: care.bondXP || 0,
    coins: care.coins || 0,
    cosmetics: {
      owned: care.owned || [],
      care: {
        hunger: care.hunger,
        happiness: care.happiness,
        cleanliness: care.cleanliness,
        affection: care.affection,
      },
      equipped: care.equipped,
      equippedByChar: care.equippedByChar,
      streak: care.streak,
      lastCareDay: care.lastCareDay,
    },
    updatedAt: care.lastTick || Date.now(),
  }
}

export function mergeCloudIntoCare(localCare, cloud) {
  if (!cloud) return applyDecay(localCare)
  const d = applyDecay({ ...localCare })
  if (typeof cloud.bond === 'number') d.bondXP = cloud.bond
  if (typeof cloud.coins === 'number') d.coins = cloud.coins
  const cos = cloud.cosmetics || {}
  if (Array.isArray(cos.owned)) d.owned = [...new Set([...d.owned, ...cos.owned])]
  if (cos.care) {
    if (typeof cos.care.hunger === 'number') d.hunger = cos.care.hunger
    if (typeof cos.care.happiness === 'number') d.happiness = cos.care.happiness
    if (typeof cos.care.cleanliness === 'number') d.cleanliness = cos.care.cleanliness
    if (typeof cos.care.affection === 'number') d.affection = cos.care.affection
  }
  if (cos.equippedByChar) d.equippedByChar = { ...d.equippedByChar, ...cos.equippedByChar }
  if (cos.equipped) d.equipped = cos.equipped
  if (typeof cos.streak === 'number') d.streak = cos.streak
  if (cos.lastCareDay) d.lastCareDay = cos.lastCareDay
  if (cloud.updatedAt) d.lastTick = Math.max(d.lastTick || 0, cloud.updatedAt)
  return d
}
