const axios=require('axios')
const webpack=require('webpack')
const path=require('path')
const serverConfig=require('../../build/webpack.config.server')
const MemoryFs=require('memory-fs')
const ReactDOMServer=require('react-dom/server')
const proxy=require('http-proxy-middleware')

//获取HTML模板
const getTemplate=()=>{
  return new Promise((resolve,reject)=>{
    axios.get('http://localhost:8888/public/index.html')
      .then(res=>{
        console.log(res.data);
        resolve(res.data)
      })
      .catch(reject)
  })
}

const Module=module.constructor
const serverCompiler=webpack(serverConfig);
const mfs=new MemoryFs;
serverCompiler.outputFileSystem=mfs;
let serverBundle;
serverCompiler.watch({},(err,stats)=>{
  if(err) throw err
  stats=stats.toJson();
  stats.errors.forEach(err=>console.error(err))
  stats.warnings.forEach(warn=>console.warn(warn))

  const bundlePath=path.join(
    serverConfig.output.path,
    serverConfig.output.filename
  )
  const bundle=mfs.readFileSync(bundlePath,'utf-8');
  const m=new Module();

  m._compile(bundle,'server-entry.js');
  serverBundle=m.exports.default;

})



module.exports=function(app){
  app.use('/public',proxy({
    target:'http://localhost:8888'
  }))
  app.get("*",function(req,res){
    getTemplate().then(template=>{
      const content=ReactDOMServer.renderToString(serverBundle);
      res.send(template.replace('<!--app-->',content))
    })
  })
}