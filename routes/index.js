/**
 * 首页模块
 */
 const router = require('koa-router')()

 router.get('/',(ctx)=>{
    ctx.body = 'index page'
})

module.exports = router