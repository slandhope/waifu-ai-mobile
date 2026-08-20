const fs = require('fs')
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('moc3', 'jbin', 'motion3j', 'exp3j', 'model3j', 'physics3j', 'cdi3j')

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    const urlPath = req.url?.split('?')[0]
    if (urlPath?.startsWith('/public/')) {
      const filePath = path.join(__dirname, urlPath)
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath)
        const types = {
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.moc3': 'application/octet-stream',
        }
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
        res.setHeader('Access-Control-Allow-Origin', '*')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    return middleware(req, res, next)
  }
}

module.exports = config
