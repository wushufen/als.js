# als.js

**ajax监听与拦截 & 服务器与数据库模拟**
```javascript
ajax <=> als <=> localStorage
```

* 无须后端服务器即可完成前端业务开发
* 它是一个模拟服务器及数据库
* 它能处理所有增删改查的ajax请求并自动建表
* 它也可以处理ajax文件上传
* 不用Mock无意义的数据及写一堆生成规则
* 它查询出来的就是你提交的数据


## 安装
```html
<script src="path/to/als.js"></script>
```

## 使用

### 简单示例

#### 处理一个新增用户的ajax请求

```javascript
als.open() // 开启监听
```
```javascript
als('user/add', function(type, url, data){

    als.table('user').insert(data)

    return {
        error: 0,
        msg: 'success'
    }

})
```

### 高级示例

#### 处理所有 增删改查
```javascript
// 开发环境开启ajax监听
if ('dev') {
    als.open()
}

// 添加监听处理器
als('.*/(.*)/(.*)$', function(type, url, data, match) {

    // url匹配
    var table = match[1] // 表名
    var action = match[2] // 操作

    // action映射
    action = {
        'add': 'insert',
        'list': 'select'
        // ...
    }[action] || action

    // 是否 insert, update, save, delete, select
    if (!als.isAction(action)) return // 否则不拦截

    // 添加一些字段
    if (action == 'insert' || action == 'save') {
        data.createTime = new Date().getTime()
        // ...
    }

    // 使用模拟数据库 增删改查分页
    var rs = als.table(table, action, data, data.pageNo, data.pageSize)

    // 拦截ajax并模拟服务器响应
    return {
        error: 0,
        msg: 'success',
        data: rs,
        total: als.table(table).select().length
    }
})
```
[查看示例](https://wusfen.github.io/als.js/example.html)|[示例源码](https://github.com/wusfen/als.js/blob/gh-pages/example.html)

#### 处理ajax文件上传
```javascript
als('.*/upload', function(type, url, data) {

    return {
        error: 0,
        msg: 'upload success',
        data: {
            url: data.file // base64
            // url: '或者使用网络图片代替'
        }
    }

}, 1000); // 假装上传延时

```
[查看示例](https://wusfen.github.io/als.js/upload.html)|[示例源码](https://github.com/wusfen/als.js/blob/gh-pages/upload.html)



## API

### als(pattern?, handler, delay?=1)
添加ajax监听处理器
* {String|RegExp} pattern: url匹配，使用 string.match ，不传则监听所有
* **handler(type, url, data, match)**
  * type: ajax请求类型
  * url: 请求url
  * data: 发送的数据。已解析urlencoded|json|formData为js对象，File转为base64
  * match: url.match(pattern)
  * return: response 拦截并返回ajax响应，undefined则不拦截该请求
* delay: 响应延时
* return: this

### als(pattern?, response, delay?=1)
* {Object} response: ajax响应

### als.open()
开启ajax监听

### als.close()
关闭ajax监听

### als.isAction(action)
action 是否为 `'select'`, `'insert'`, `'update'`, `'save'`, `'delete'`
* {Boolean} return:

### als.table(name)
设置当前存储表名
* name: 表名
* return: als.db

### als.table(name).insert(data, pk?='id')
插入一条数据，并自动生成一个唯一主键
* data: 要存储的数据
* pk: 表的主键，默认为id，自动自增

### als.table(name).update(data, pk?='id')
根据主键修改一条数据
* data: 要存储的数据
* pk: 表的主键，默认为id

### als.table(name).save(data, pk?='id')
保存一条数据，根据主键判断，已存在则修改，不存在则插入
* data: 要存储的数据
* pk: 表的主键，默认为id

### als.table(name).delete(where?)
根据条件删除一条数据
* where: 删除条件，如{id:1}，没条件则清空

### als.table(name).select(where?)
根据条件查询数据，返回一个数组
* where: 查询条件，没条件则返回所有
* {Array} return: 查询结果

### als.table(name).page(pageNo, pageSize).select(where?)
分页查询，.page 仅对 .select 有效
* pageNo: 页码
* pageSize: 页大小
* {Array} return: 查询结果

### als.table(name, action, data?, pageNo?, pageSize?, pk?)
增删改查分页合并
* name: 表名
* action: `'select'`, `'insert'`, `'update'`, `'save'`, `'delete'`
* data: 数据或查询条件
* pageNo: 页码
* pageSize: 页大小
* pk: 表的主键，默认为id
* {Array} return: 查询结果