import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import { ASUKA_ASSETS, ASUKA_MODEL_FILE } from '../../assets/live2d/asukaManifest'
import { ALEXIA_ASSETS, ALEXIA_MODEL_FILE } from '../../assets/live2d/alexiaManifest'
import { LIVE2D_JS_ASSETS } from '../../assets/live2d/live2dJsManifest'
import { buildViewerHtmlDocument, getCharacter } from './characters'

const BUNDLED = {
  asuka: { assets: ASUKA_ASSETS, modelFile: ASUKA_MODEL_FILE },
  alexia: { assets: ALEXIA_ASSETS, modelFile: ALEXIA_MODEL_FILE },
}

const LIVE2D_DIR = `${FileSystem.documentDirectory}live2d/`
const JS_DIR = `${LIVE2D_DIR}js/`
const JS_READY = `${JS_DIR}.ready`
const JS_CACHE_VERSION = '2'
const VF_B64_LIMIT = 12 * 1024 * 1024

/** @typedef {{ pct: number, label: string }} Live2DProgress */

function report(onProgress, pct, label) {
  onProgress?.({ pct: Math.min(100, Math.max(0, Math.round(pct))), label })
}

const BINARY_EXT = /\.(moc3|png|jpg|jpeg|webp)$/i

function resolveBundledAsset(moduleRef) {
  if (typeof moduleRef === 'number' || (moduleRef && typeof moduleRef === 'object' && 'uri' in moduleRef)) {
    return Asset.fromModule(moduleRef)
  }
  if (typeof moduleRef === 'string') {
    return Asset.fromURI(moduleRef)
  }
  throw new Error('Invalid bundled asset reference')
}

async function ensureDir(path) {
  const info = await FileSystem.getInfoAsync(path)
  if (!info.exists) await FileSystem.makeDirectoryAsync(path, { intermediates: true })
}

async function copyBundledAsset(moduleRef, dest) {
  const asset = resolveBundledAsset(moduleRef)
  await asset.downloadAsync()
  const src = asset.localUri || asset.uri
  if (!src) throw new Error(`missing bundled asset for ${dest}`)
  const slash = dest.lastIndexOf('/')
  if (slash > 0) await ensureDir(dest.slice(0, slash + 1))
  await FileSystem.copyAsync({ from: src, to: dest })
  const info = await FileSystem.getInfoAsync(dest)
  if (!info.exists || info.size === 0) throw new Error(`empty asset copy: ${dest}`)
}

async function ensureLive2dJsOnPhone() {
  const ready = await FileSystem.getInfoAsync(JS_READY)
  if (ready.exists) {
    try {
      const version = await FileSystem.readAsStringAsync(JS_READY)
      if (version === JS_CACHE_VERSION) {
        for (const name of Object.keys(LIVE2D_JS_ASSETS)) {
          const info = await FileSystem.getInfoAsync(`${JS_DIR}${name}`)
          if (!info.exists || info.size === 0) throw new Error(`missing js: ${name}`)
        }
        return
      }
    } catch (_) {
      // re-install
    }
  }

  await ensureDir(JS_DIR)
  for (const [name, moduleRef] of Object.entries(LIVE2D_JS_ASSETS)) {
    await copyBundledAsset(moduleRef, `${JS_DIR}${name}`)
  }
  await FileSystem.writeAsStringAsync(JS_READY, JS_CACHE_VERSION)
}

async function isLocalReady(characterId) {
  const modelDir = `${LIVE2D_DIR}${characterId}/`
  const ready = await FileSystem.getInfoAsync(`${modelDir}.ready`)
  if (!ready.exists) return false
  const cfg = BUNDLED[characterId]
  const modelInfo = await FileSystem.getInfoAsync(`${modelDir}${cfg.modelFile}`)
  return modelInfo.exists && modelInfo.size > 0
}

async function installCharacterModel(characterId, onProgress) {
  const cfg = BUNDLED[characterId]
  if (!cfg) throw new Error(`Unknown bundled character: ${characterId}`)

  await ensureLive2dJsOnPhone()

  const modelDir = `${LIVE2D_DIR}${characterId}/`
  if (await isLocalReady(characterId)) return modelDir

  await ensureDir(modelDir)
  const entries = Object.entries(cfg.assets)
  const name = cfg === BUNDLED.alexia ? 'Alexia' : 'Asuka'
  for (let i = 0; i < entries.length; i++) {
    const [relPath, moduleRef] = entries[i]
    const pct = ((i + 1) / entries.length) * 50
    report(onProgress, pct, `Copying ${name}… ${i + 1}/${entries.length}`)
    await copyBundledAsset(moduleRef, `${modelDir}${relPath}`)
  }
  await FileSystem.writeAsStringAsync(`${modelDir}.ready`, '1')
  report(onProgress, 50, `${name} saved to phone`)
  return modelDir
}

async function readVirtualModelFiles(characterId, onProgress) {
  const cfg = BUNDLED[characterId]
  const modelDir = `${LIVE2D_DIR}${characterId}/`
  const files = {}
  const paths = Object.keys(cfg.assets)

  for (let i = 0; i < paths.length; i++) {
    const relPath = paths[i]
    const uri = `${modelDir}${relPath}`
    const pct = 50 + ((i + 1) / paths.length) * 20
    report(onProgress, pct, `Reading files… ${i + 1}/${paths.length}`)
    if (BINARY_EXT.test(relPath)) {
      files[relPath] = {
        t: 'b64',
        d: await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
      }
    } else {
      files[relPath] = { t: 'text', d: await FileSystem.readAsStringAsync(uri) }
    }
  }

  return files
}

async function writeViewerPage(characterId, scale, modelFile, virtualFiles, onProgress) {
  const charDir = `${LIVE2D_DIR}${characterId}/`
  await ensureDir(charDir)

  report(onProgress, 72, 'Packaging model…')
  const vfJsonPath = `${charDir}vf.json`
  await FileSystem.writeAsStringAsync(vfJsonPath, JSON.stringify(virtualFiles))
  report(onProgress, 76, 'Encoding…')
  const vfB64 = await FileSystem.readAsStringAsync(vfJsonPath, {
    encoding: FileSystem.EncodingType.Base64,
  })

  const useInject = vfB64.length > VF_B64_LIMIT
  if (!useInject) {
    report(onProgress, 80, 'Writing viewer…')
    await FileSystem.writeAsStringAsync(
      `${charDir}vf.data.js`,
      `window.__VF_B64=${JSON.stringify(vfB64)};`
    )
  }

  const html = buildViewerHtmlDocument(scale, modelFile, !useInject)
  const viewerPath = `${charDir}viewer.html`
  await FileSystem.writeAsStringAsync(viewerPath, html)
  report(onProgress, 82, 'Opening viewer…')

  return {
    uri: viewerPath,
    useInject,
    vfB64: useInject ? vfB64 : null,
    scale,
    modelFile,
  }
}

export async function resolveLive2DBundle(character, onProgress) {
  const c = typeof character === 'string' ? getCharacter(character) : character
  const already = await isLocalReady(c.id)

  if (already) {
    report(onProgress, 50, `${c.name} ready on phone`)
  } else {
    report(onProgress, 2, `Copying ${c.name} to phone…`)
    await installCharacterModel(c.id, onProgress)
  }

  const virtualFiles = await readVirtualModelFiles(c.id, onProgress)
  const viewer = await writeViewerPage(c.id, c.scale, c.modelFile, virtualFiles, onProgress)

  return {
    mode: 'local',
    source: { uri: viewer.uri },
    readAccessDir: LIVE2D_DIR.replace(/\/$/, ''),
    characterId: c.id,
    useInject: viewer.useInject,
    vfB64: viewer.vfB64,
    scale: viewer.scale,
    modelFile: viewer.modelFile,
  }
}

export async function ensureLocalCharacterModel(characterId) {
  const modelDir = await installCharacterModel(characterId)
  const cfg = BUNDLED[characterId]
  return {
    modelUrl: `${modelDir}${cfg.modelFile}`,
    baseDir: modelDir.replace(/\/$/, ''),
  }
}
