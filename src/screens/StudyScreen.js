import { useRef, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useFocusEffect } from '@react-navigation/native'
import * as ScreenOrientation from 'expo-screen-orientation'
import { getReply, synthesize, trySwitch, handleTeaching, buildLesson } from '../lib/waifu'

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/slandhope/asuka-model@main/asuka/huohuo.model3.json'

const HTML = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  :root{--bg:#0a0a0c;--bg3:#1e1e24;--border:rgba(255,255,255,.08);--text:#f5f5f7;--text2:#a0a0a8;--text3:#6a6a72;--accent:#0a84ff;--pink:#5e9eff;--gold:#ffd60a;}
  html,body{height:100%;font-family:-apple-system,system-ui,sans-serif;background:linear-gradient(160deg,#141417,#0a0a0c);color:var(--text);overflow:hidden;}
  #stage{position:absolute;inset:0;}
  #progress{position:absolute;top:0;left:0;height:3px;width:0;background:var(--accent);transition:width .35s;z-index:5;}
  #board{position:absolute;top:5%;left:4%;right:34%;height:60%;background:#14342b;border:8px solid #6b4b2f;border-radius:8px;box-shadow:inset 0 0 40px rgba(0,0,0,.5);padding:18px 22px;overflow-y:auto;}
  #board-title{color:#9fe;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.7;margin-bottom:10px;font-family:'Courier New',monospace;}
  #board-content{color:#eafff5;font-size:17px;line-height:1.7;font-family:'Courier New',monospace;white-space:pre-wrap;}
  #canvasWrap{position:absolute;bottom:0;right:1%;width:33%;height:74%;pointer-events:none;}
  #c{width:100%;height:100%;display:block;}
  #dialogue{position:absolute;left:0;right:0;bottom:0;min-height:26%;background:rgba(10,13,20,.94);border-top:1px solid var(--border);padding:16px 20px;}
  #speaker{display:inline-block;background:var(--accent);color:#001;font-weight:700;font-size:12px;padding:3px 14px;border-radius:12px;margin-bottom:8px;}
  #line{font-size:16px;line-height:1.5;color:var(--text);min-height:40px;}
  #row{display:flex;gap:8px;margin-top:12px;align-items:center;}
  #ask{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:11px 14px;color:var(--text);font-size:14px;outline:none;}
  .btn{padding:11px 16px;border:none;border-radius:12px;font-weight:700;font-size:13px;cursor:pointer;}
  #send{background:var(--pink);color:#001;}
  #next{background:var(--accent);color:#001;display:none;}
  #spin{position:absolute;top:8px;right:12px;width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:sp 1s linear infinite;display:none;z-index:6;}
  @keyframes sp{to{transform:rotate(360deg);}}
</style></head>
<body>
<div id="stage">
  <div id="progress"></div><div id="spin"></div>
  <div id="board"><div id="board-title">STUDY WITH ASUKA</div><div id="board-content">Type a topic below and I'll teach it on the board, step by step. You can also: tutor mode on  ·  grade this: …  ·  give me 5 practice questions on …</div></div>
  <div id="canvasWrap"><canvas id="c"></canvas></div>
  <div id="dialogue">
    <div id="speaker">Asuka</div>
    <div id="line">Ready when you are~ what are we learning today?</div>
    <div id="row">
      <input id="ask" placeholder="teach me…  /  grade this:  /  give me N practice questions on…">
      <button class="btn" id="send">Teach me</button>
      <button class="btn" id="next">Next &#9654;</button>
    </div>
  </div>
</div>
<script>
  var RN=function(o){try{window.ReactNativeWebView.postMessage(JSON.stringify(o));}catch(e){}};
  var $=function(id){return document.getElementById(id);};
  window.__board=function(t,c){$('board-title').textContent=t||'NOTES';$('board-content').textContent=c||'';$('board').scrollTop=0;};
  window.__line=function(t){$('line').textContent=t||'';};
  window.__progress=function(p){$('progress').style.width=Math.max(0,Math.min(100,p))+'%';};
  window.__busy=function(b){$('spin').style.display=b?'block':'none';$('send').disabled=!!b;};
  window.__showNext=function(b){$('next').style.display=b?'block':'none';};
  function ask(){var v=$('ask').value.trim();if(!v)return;$('ask').value='';RN({type:'ask',text:v});}
  $('send').onclick=ask;
  $('ask').addEventListener('keydown',function(e){if(e.key==='Enter')ask();});
  $('next').onclick=function(){RN({type:'next'});};

  window.__mouth=0;
  function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('load '+src));};document.head.appendChild(s);});}
  (async function(){
    try{
      await load("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");
      await load("https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js");
      await load("https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js");
      var wrap=$('canvasWrap');
      var app=new PIXI.Application({view:$('c'),autoStart:true,resizeTo:wrap,backgroundAlpha:0,antialias:true});
      var model=await PIXI.live2d.Live2DModel.from(${JSON.stringify(MODEL_URL)});
      app.stage.addChild(model);
      var bH=model.height;
      var fit=function(){var s=wrap.clientHeight/bH;model.scale.set(s);model.x=(wrap.clientWidth-model.width)/2;model.y=0;};
      fit();window.addEventListener('resize',fit);
      PIXI.Ticker.shared.add(function(){try{model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY',window.__mouth||0);}catch(e){}},null,PIXI.UPDATE_PRIORITY.LOW);
    }catch(e){ RN({type:'log',msg:'ERR '+e.message}); }
  })();
  window.__speak=function(dataUrl){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;window.__ctx=window.__ctx||new AC();var ctx=window.__ctx;if(ctx.resume)ctx.resume();
      var audio=new Audio();audio.src=dataUrl;var src=ctx.createMediaElementSource(audio);var an=ctx.createAnalyser();an.fftSize=256;src.connect(an);an.connect(ctx.destination);var d=new Uint8Array(an.frequencyBinCount);
      audio.onplay=function(){(function loop(){if(audio.paused||audio.ended){window.__mouth=0;return;}an.getByteFrequencyData(d);var s=0;for(var i=0;i<d.length;i++)s+=d[i];window.__mouth=Math.max(0,Math.min(1,(s/d.length)/70));requestAnimationFrame(loop);})();};
      audio.onended=function(){window.__mouth=0;};var pr=audio.play();if(pr&&pr.catch)pr.catch(function(e){RN({type:'log',msg:'PLAY_BLOCKED '+e.message});});
    }catch(e){RN({type:'log',msg:'SPEAK_ERR '+e.message});}
  };
</script>
</body></html>
`

export default function StudyScreen() {
  const web = useRef(null)
  const lesson = useRef({ steps: [], idx: 0, title: '' })
  const history = useRef([])

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP) }
    }, [])
  )

  const inject = (js) => web.current?.injectJavaScript(js + '; true;')
  const board = (t, c) => inject('window.__board(' + JSON.stringify(t) + ',' + JSON.stringify(c) + ')')
  const line = (t) => inject('window.__line(' + JSON.stringify(t) + ')')
  const progress = (p) => inject('window.__progress(' + p + ')')
  const busy = (b) => inject('window.__busy(' + (b ? 'true' : 'false') + ')')
  const showNext = (b) => inject('window.__showNext(' + (b ? 'true' : 'false') + ')')
  const speak = async (t) => { try { const a = await synthesize(t); inject('window.__speak(' + JSON.stringify(a) + ')') } catch (e) {} }

  async function showStep(i) {
    const l = lesson.current
    const step = l.steps[i]
    if (!step) return
    l.idx = i
    board(l.title || 'LESSON', step.board || '')
    line(step.say || '')
    progress(((i + 1) / l.steps.length) * 100)
    showNext(i < l.steps.length - 1)
    speak(step.say || '')
  }

  async function handleAsk(text) {
    busy(true)
    try {
      const sw = trySwitch(text)
      if (sw != null) { board('ASUKA', sw); line(sw); showNext(false); progress(0); speak(sw); return }

      const taught = await handleTeaching(history.current, text)
      if (taught != null) {
        board(/^\u{1F4DD}/u.test(taught) ? 'GRADED' : /^\u{1F3AF}/u.test(taught) ? 'PRACTICE' : 'ASUKA', taught)
        line(taught.length < 160 ? taught : 'Here you go \u2014 check the board.')
        showNext(false); progress(0)
        if (taught.length < 240) speak(taught)
        return
      }

      line('Okay! Putting a lesson together\u2026')
      const l = await buildLesson(text.replace(/^teach me\s*/i, ''))
      if (!l) { line("Hmm, that didn't build \u2014 try rephrasing the topic?"); return }
      lesson.current = { steps: l.steps, idx: 0, title: (l.title || 'LESSON').toUpperCase() }
      history.current = [...history.current, { role: 'user', content: text }].slice(-8)
      showStep(0)
    } catch (e) {
      line('(' + (e?.message || 'something went wrong') + ')')
    } finally {
      busy(false)
    }
  }

  function onMessage(e) {
    let m
    try { m = JSON.parse(e.nativeEvent.data) } catch (_) { return }
    if (m.type === 'ask') handleAsk(m.text)
    else if (m.type === 'next') { const l = lesson.current; if (l.idx < l.steps.length - 1) showStep(l.idx + 1); else { line("That's the lesson! Ask me anything or give me a new topic."); showNext(false) } }
    else if (m.type === 'log') console.log('[Study]', m.msg)
  }

  return (
    <View style={styles.root}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html: HTML }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        keyboardDisplayRequiresUserAction={false}
        onMessage={onMessage}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  web: { flex: 1, backgroundColor: 'transparent' },
})
