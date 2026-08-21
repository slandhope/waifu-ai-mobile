/** Grok agent routing heuristics — mirrors PC grok-agent.js */

export function shouldUseGrokResearch(text = '') {
  const low = String(text).toLowerCase()
  if (low.length < 8) return false

  const patterns = [
    /\b(ct|crypto twitter|on x\b|x\.com|twitter|tweet)\b/,
    /\b(what(?:'s| is) (?:ct|twitter|x) saying)\b/,
    /\b(people saying|sentiment|narrative|buzz|hype|fud)\b/,
    /\b(latest news|breaking|look up|search (?:the )?web|research|dig into)\b/,
    /\b(summarize .{0,40}(online|on the web|from x|from twitter))\b/,
    /\b(why is (?:everyone|ct|twitter).{0,30}(talking|pumping|dumping))\b/,
    /\b(investigate|find out|what happened with)\b/,
    /\b(compare .{0,30}(online|competitors|market))\b/,
    /\b(study research|research (?:this|topic|before))\b/,
    /\b(run the numbers|calculate|spreadsheet|csv)\b/,
  ]

  return patterns.some((re) => re.test(low))
}

export function detectGrokTask(text = '') {
  const low = String(text).toLowerCase()
  if (/\b(study|homework|learn|teach me|lesson)\b/.test(low) && /\b(research|look up|find)\b/.test(low)) {
    return 'study'
  }
  if (/\b(btc|eth|sol|crypto|coin|token|pump|dump|trade|funding|liquidat)\b/.test(low)) {
    return 'trading'
  }
  return 'research'
}
