import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/slandhope/asuka-model@main/asuka/huohuo.model3.json'

const live2dHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden;}#c{width:100%;height:100%;display:block;}</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  var say=function(m){try{window.ReactNativeWebView.postMessage(String(m));}catch(e){}};
  function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('script failed: '+src));};document.head.appendChild(s);});}
  window.__mouth = 0;
  (async function(){
    try{
      await load("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");
      await load("https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js");
      await load("https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js");
      var app=new PIXI.Application({view:document.getElementById("c"),autoStart:true,resizeTo:window,backgroundAlpha:0,antialias:true});
      var model=await PIXI.live2d.Live2DModel.from(${JSON.stringify(MODEL_URL)});
      window.__model=model; app.stage.addChild(model);
      var baseW=model.width, baseH=model.height;
      var fit=function(){ var s=window.innerHeight/baseH; model.scale.set(s); model.x=(window.innerWidth-model.width)/2; model.y=0; };
      fit(); window.addEventListener("resize",fit);
      model.on("hit",function(){ model.motion("Tap"); });
      // drive mouth AFTER the model's own update each frame
      PIXI.Ticker.shared.add(function(){ try{ model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', window.__mouth||0);}catch(e){} }, null, PIXI.UPDATE_PRIORITY.LOW);
      say("LIVE2D_OK");
    }catch(e){ say("ERR: "+(e&&e.message?e.message:e)); }
  })();

  // Play ElevenLabs audio + lip-sync from its amplitude
  window.__speak=function(dataUrl){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      window.__ctx=window.__ctx||new AC();
      var ctx=window.__ctx; if(ctx.resume) ctx.resume();
      var audio=new Audio(); audio.src=dataUrl; audio.crossOrigin='anonymous';
      var srcNode=ctx.createMediaElementSource(audio);
      var analyser=ctx.createAnalyser(); analyser.fftSize=256;
      srcNode.connect(analyser); analyser.connect(ctx.destination);
      var data=new Uint8Array(analyser.frequencyBinCount);
      audio.onplay=function(){ (function loop(){ if(audio.paused||audio.ended){window.__mouth=0;return;} analyser.getByteFrequencyData(data); var s=0; for(var i=0;i<data.length;i++) s+=data[i]; window.__mouth=Math.max(0,Math.min(1,(s/data.length)/70)); requestAnimationFrame(loop); })(); };
      audio.onended=function(){ window.__mouth=0; };
      var p=audio.play(); if(p&&p.catch) p.catch(function(e){ say('PLAY_BLOCKED: '+e.message); });
    }catch(e){ say('SPEAK_ERR: '+(e&&e.message?e.message:e)); }
  };
</script>
</body>
</html>
`

const AsukaLive2D = forwardRef(function AsukaLive2D({ style }, ref) {
  const webRef = useRef(null)
  useImperativeHandle(ref, () => ({
    speak(dataUrl) {
      webRef.current?.injectJavaScript('window.__speak(' + JSON.stringify(dataUrl) + '); true;')
    },
  }))
  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: live2dHtml }}
        style={styles.web}
        containerStyle={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        backgroundColor="transparent"
        onMessage={(e) => { const d = String(e.nativeEvent.data); if (d.startsWith('ERR') || d.includes('BLOCK') || d.includes('SPEAK')) console.log('[AsukaLive2D]', d) }}
      />
    </View>
  )
})

export default AsukaLive2D

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'transparent' },
  web: { flex: 1, backgroundColor: 'transparent' },
})
