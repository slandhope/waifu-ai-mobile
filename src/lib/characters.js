/**
 * Live2D HTML builders + character config.
 * Brain/chat: AWS (waifu.js). Models + engine: bundled in app, copied to phone.
 */
export const CHARACTERS = [
  {
    id: 'asuka',
    name: 'Asuka',
    emoji: '🌸',
    description: 'Your default waifu companion',
    bundled: true,
    publicFolder: 'asuka',
    modelFile: 'huohuo.model3.json',
    scale: 1.22,
  },
  {
    id: 'alexia',
    name: 'Alexia',
    emoji: '💜',
    description: 'Elegant companion with expressive moods',
    bundled: true,
    publicFolder: 'alexia',
    modelFile: 'Alexia.model3.json',
    scale: 1.15,
  },
]

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]
}

/** Boot script — engine from ../js/, model data from vf.data.js or RN inject */
export function buildViewerPageBody(scale, modelFile, autoBoot = true) {
  const scaleNum = Number(scale) || 1.22
  const model = JSON.stringify(modelFile)
  return `
  var say=function(m){try{window.ReactNativeWebView.postMessage(String(m));}catch(e){}};
  window.__mouth=0;
  function blobFromEntry(entry){
    if(entry.t==='b64'){
      var bin=atob(entry.d);
      var arr=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([arr]));
    }
    return URL.createObjectURL(new Blob([entry.d],{type:'application/json'}));
  }
  window.__speak=function(dataUrl){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      window.__ctx=window.__ctx||new AC();
      var ctx=window.__ctx; if(ctx.resume) ctx.resume();
      var audio=new Audio(); audio.src=dataUrl;
      var srcNode=ctx.createMediaElementSource(audio);
      var analyser=ctx.createAnalyser(); analyser.fftSize=256;
      srcNode.connect(analyser); analyser.connect(ctx.destination);
      var data=new Uint8Array(analyser.frequencyBinCount);
      audio.onplay=function(){ (function loop(){ if(audio.paused||audio.ended){window.__mouth=0;return;} analyser.getByteFrequencyData(data); var s=0; for(var i=0;i<data.length;i++) s+=data[i]; window.__mouth=Math.max(0,Math.min(1,(s/data.length)/70)); requestAnimationFrame(loop); })(); };
      audio.onended=function(){ window.__mouth=0; };
      var p=audio.play(); if(p&&p.catch) p.catch(function(){});
    }catch(e){}
  };
  async function boot(){
    try{
      say('PROGRESS: Loading character…');
      var files=JSON.parse(decodeURIComponent(escape(atob(window.__VF_B64))));
      var blobs={};
      for(var path in files){ blobs[path]=blobFromEntry(files[path]); }
      var modelJson=JSON.parse(files[${model}].d);
      modelJson.url=${model};
      var runtime=PIXI.live2d.Live2DFactory.findRuntime(modelJson);
      if(!runtime) throw new Error('Unsupported Live2D model');
      var settings=runtime.createModelSettings(modelJson);
      var key='local-'+Date.now();
      settings._objectURL=key;
      settings.resolveURL=function(rel){ return PIXI.live2d.FileLoader.resolveURL(key,rel); };
      var map={};
      settings.getDefinedFiles().forEach(function(p){ if(blobs[p]) map[p]=blobs[p]; });
      if(blobs[settings.moc]) map[settings.moc]=blobs[settings.moc];
      (settings.textures||[]).forEach(function(p){ if(blobs[p]) map[p]=blobs[p]; });
      PIXI.live2d.FileLoader.filesMap[key]=map;
      window.__scaleMul=${scaleNum};
      var app=new PIXI.Application({view:document.getElementById('c'),autoStart:true,resizeTo:window,backgroundAlpha:0,antialias:true});
      var model=await PIXI.live2d.Live2DModel.from(settings);
      app.stage.addChild(model);
      window.__model=model;
      var baseW=model.width, baseH=model.height;
      var fit=function(){ var s=Math.min(window.innerHeight/baseH,window.innerWidth/baseW)*window.__scaleMul; model.scale.set(s); model.x=(window.innerWidth-model.width)/2; model.y=Math.max(0,(window.innerHeight-model.height)*0.06); };
      fit(); window.addEventListener('resize',fit);
      model.on('hit',function(){ try{ model.motion('Tap'); }catch(e){ try{ model.motion(''); }catch(_e){} } });
      if(PIXI.Ticker.shared&&PIXI.Ticker.shared.add){
        PIXI.Ticker.shared.add(function(){ try{ model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', window.__mouth||0);}catch(e){} });
      }
      say('LIVE2D_OK');
    }catch(e){
      say('ERR: '+(e&&e.message?e.message:e));
    }
  }
  ${autoBoot ? 'boot();' : 'window.startBoot=boot; say("READY");'}`
}

export function buildViewerHtmlDocument(scale, modelFile, autoBoot = true) {
  const body = buildViewerPageBody(scale, modelFile, autoBoot)
  const dataScript = autoBoot ? '<script src="vf.data.js"></script>\n' : ''
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}#c{width:100%;height:100%;display:block}</style>
<script src="../js/live2dcubismcore.min.js"></script>
<script src="../js/pixi.min.js"></script>
<script src="../js/cubism4.min.js"></script>
</head>
<body>
<canvas id="c"></canvas>
${dataScript}<script>${body}</script>
</body>
</html>`
}
