# waifu.ai — mobile

Expo app for iOS/Android. Companion chat, habits, study, trading, and wellness — synced with the PC app via the shared AWS backend.

**Repo:** [github.com/slandhope/waifu-ai-mobile](https://github.com/slandhope/waifu-ai-mobile)  
**PC / server repo:** [github.com/slandhope/crypto-ai-desktop](https://github.com/slandhope/crypto-ai-desktop)

## Architecture

| Layer | Where |
|-------|--------|
| This repo | Phone UI (Expo / React Native) |
| [crypto-ai-desktop](https://github.com/slandhope/crypto-ai-desktop) | Electron desktop + `scanner-server.js` on AWS |
| AWS API | `http://13.51.141.42:3000` (see `src/constants/index.js`) |
| Auth | Google / Apple ID token → same Cognito user on PC + phone |

When logged in with the same account, these sync automatically:

- Home companion chat (`memory.__sync.chatLog`)
- Habit history, coach goals, steps/sleep (`/api/sync`)
- Study library + flashcards (`/state.lessons`)
- Waifu care — coins, bond, shop (`/state`)
- Trading — signals, sniper, paper trades (server endpoints)

Guest mode is local-only (no cloud sync).

## Setup

```bash
npm install
cp src/secrets.example.js src/secrets.js   # if present; add API keys locally
npx expo start
```

For native modules (HealthKit, WalletConnect, PDF export):

```bash
npx expo run:ios
# or
npx expo run:android
```

Expo Go is limited — use a dev build for full features.

### Required secrets (`src/secrets.js`, gitignored)

- `WALLETCONNECT_PROJECT_ID` — WalletConnect cloud project id
- Optional fallbacks: Groq, ElevenLabs (voice goes through AWS when logged in)

## Deploy / release

Mobile ships via **EAS** or local builds — not through the EC2 server.

```bash
npx eas build --platform ios
```

After server changes land in `crypto-ai-desktop`, redeploy AWS (see that repo’s README) so sync routes stay in sync.

## Related docs

- PC ops: `crypto-ai-desktop/P0-OPS.md` (TLS, voice keys)
- Feature status: `crypto-ai-desktop/FEATURE-INVENTORY.md`
