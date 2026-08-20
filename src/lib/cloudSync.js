import { mergeCoachFromServer, goalsToCloudPayload, loadDailyGoals } from './aiGoalsStore'
import { pullExtrasFromServer, pushExtrasToCloud, collectLocalExtras } from './extrasSync'
import { pullMemoryFromCloud, pushMemoryToCloud } from './memorySync'
import { pullStudyFromCloud, pushStudyToCloud } from './studySync'

export async function pullAllFromCloud(serverData) {
  const results = {}
  if (serverData) {
    results.coachGoals = await mergeCoachFromServer(serverData)
    results.extras = await pullExtrasFromServer(serverData)
  }
  results.memory = await pullMemoryFromCloud()
  results.study = await pullStudyFromCloud()
  return results
}

export async function pushAllToCloud(opts = {}) {
  const coach = goalsToCloudPayload(await loadDailyGoals())
  const extras = await collectLocalExtras(opts.coachChat)
  await pushExtrasToCloud(extras)
  await pushMemoryToCloud()
  await pushStudyToCloud()
  return { coach, extras }
}

let _timer = null
export function pushAllSoon(ms = 3000) {
  clearTimeout(_timer)
  _timer = setTimeout(() => { pushAllToCloud().catch(() => {}) }, ms)
}
