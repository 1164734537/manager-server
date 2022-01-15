/**
 * 用户管理模块
 */
const router = require('koa-router')()
const User = require('./../models/userSchema')
const Counter = require('./../models/counterSchema')
const util = require('./../utils/util')
const jwt = require('jsonwebtoken')
const md5 = require('md5')
router.prefix('/users')

router.post('/login', async (ctx) => {
  try {
    const {
      userName,
      userPwd
    } = ctx.request.body
    const res = await User.findOne({
      userName,
      userPwd: md5(userPwd)
    },'userId userName userEmail state role depId roleList')
    if (res) {
      const data = res._doc
      const token = jwt.sign({
        data
      }, 'zihang', {
        expiresIn: '1h'
      });
      data.token = token;
      ctx.body = util.success(data)
    } else {
      ctx.body = util.fail("账号密码不正确")
    }
  } catch (error) {
    ctx.body = util.fail(error.msg)
  }
})

router.get('/list', async (ctx) => {
  // 1.收到请求
  const {
    userId,
    userName,
    state
  } = ctx.request.query
  const {
    page,
    skipIndex
  } = util.pager(ctx.request.query)
  // 3.拼接成参数
  let params = {}
  if (userId) params.userId = userId;
  if (userName) params.userName = userName;
  if (state && state != '0') params.state = state;
  // 4.访问数据库
  try {
    // 不返回密码和id
    const query = User.find(params, {
      userPwd: 0,
      _id: 0
    });
    // 返回当前分页的列表
    const list = await query.skip(skipIndex).limit(page.pageSize);
    // 符合查询条件的数目
    const total = await User.countDocuments(params);
    console.log(total)
    // 返回 当前页数，一页显示数，总数，列表
    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询异常${error.stack}`)
  }
})

router.post('/delete', async (ctx) => {
  const {
    userIds
  } = ctx.request.body
  const res = await User.updateMany({
    userId: {
      $in: userIds
    }
  }, {
    state: 2
  })
  // ctx.body = userId
  console.log(res)
  if (res.nModified) {
    ctx.body = util.success(res, `共删除成功${res.nModified}条`);
    return
  }
  ctx.body = util.fail('删除失败')
})

router.post('/operate', async (ctx) => {
  // 1.新增操作
  const { userId,userName,userEmail,mobile,job,state,roleList,deptId,action } = ctx.request.body
  if(action == 'add') {
    // 1.验证
    if(!userName || !userEmail || !deptId){
      ctx.body = util.fail('参数错误',util.CODE.PARAM_ERROR);
      return;
    }
    // 查找是否有重复用户 userName,userEmail
    const res = await User.findOne({$or:[{userName},{userEmail}]},'id userName userEmail')
    // console.log(res)
    if(res){
      ctx.body = util.fail(`系统检测到有重复的用户，信息如下:${userName} - ${userEmail}`);
    }else{
      // 写入数据
      // 1.维护一个自增长的id
      const doc = await Counter.findOneAndUpdate({_id:'userId'},{$inc:{sequence_value: 1}},{new:true})
      // console.log('doc=>',doc)
      const user = new User({
        userId: doc.sequence_value,
        userName,
        userPwd: md5('123456'),
        userEmail,
        role: 1, //默认普通用户
        roleList,
        job,
        state,
        deptId,
        mobile
      })
      await user.save().then((res)=>{
        ctx.body = util.success('新增','用户创建成功')
      }).catch((error)=>{
        ctx.body = util.fail(error.stack,'用户创建失败')
      })

    }
  }else{
    // 验证
    if(!deptId){
      ctx.body = util.fail('部门不能为空',util.CODE.PARAM_ERROR)
      return;
    }
    // 查找数据，并修改
    try {
      const res = await User.findOneAndUpdate({ userId },{mobile,job,state,roleList,deptId})
      ctx.body = util.success('更新','更新成功')
    } catch (error) {
      ctx.body = util.fail(error.stack,'更新失败')
    }
  }
})

module.exports = router