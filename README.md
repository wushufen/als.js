# als.js

```javascript
ajax <=> als <=> localStorage
```

* 拦截 ajax 使用 localStorage 作为数据库  
* 你可以不用管后端接口有没有开发完，服务有没有启动  
* 它就像一个服务器，内置一个本地存储模拟的数据库  
* 你也不用建表建字段，不存在时，它会给你自动创建
* 你也不用再使用毫无意义的模拟数据以及写一堆生成规则，因为它查询出来的就是你保存的数据


## 安装
```html
<script src="path/to/als.js"></script>
```

## 使用示例

```javascript

// 添加ajax拦截处理器
als(function (type, url, data) {

    // url匹配
    var m = url.match('.*/(.*)/(.*)')
    var table = m[1] // 表名
    var action = m[2] // 操作

    // action映射
    action = {
      'add': 'insert',
      'list': 'select'
    }[action]
    // ...

    // 如果action为 insert, update, save, delete, select
    if (als.isAction(action)) {

        // 可以在保存前对数据作些处理
        if (action=='insert') {
            data.createTime = new Date().getTime()
            // ...
        }

        // 本地数据库 CRUD
        var rs = als.table(table)[action](data)

        // 返回结果作为ajax响应
        return {
            code: 10000,
            msg: 'success',
            data: rs
        }
    }

    // 如果没有 return 则不拦截该请求
})

// 开启ajax拦截
if ('dev') {
    als.open()
}
```

## API

### als(handler)
添加拦截处理器，可以添加多个以处理多种情况
* handler(type, url, data): 处理函数
  * type: ajax 请求类型
  * url
  * data
  * return: 返回则作为ajax响应，无return则不拦截该请求

### als.open()
开启ajax拦截。开启之后，被添加的拦截处理器才会生效

### als.close()
关闭ajax拦截

### als.isAction(action)
action 是否为 `'select'`, `'insert'`, `'update'`, `'save'`, `'delete'`

### als.table(name)
设置当前存储表名
* name: 表名

### als.table(name).insert(data, [pk='id'])
插入一条数据
* data: 要存储的数据
* pk: 表的主键，默认为id，自动自增

### als.table(name).update(data, [pk='id'])
根据主键修改一条数据
* data: 要存储的数据
* pk: 表的主键，默认为id

### als.table(name).save(data, [pk='id'])
保存一条数据，根据主键判断，已存在则修改，不存在则插入
* data: 要存储的数据
* pk: 表的主键，默认为id

### als.table(name).delete([where])
根据条件删除一条数据
* {Object}where: 删除条件，如{id:1}，没条件则清空

### als.table(name).select([where])
根据条件查询数据，返回一个数组
* {Object}where: 查询条件，没条件则返回所有

### als.table(name).page(pageNo, pageSize).select([where])
分页查询
* pageNo: 页码
* pageSize: 页条数




