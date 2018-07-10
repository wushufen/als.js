// 添加ajax拦截规则
als(function (type ,url, data) {

    // 如果符合条件
    var m = url.match(/api\/(.*)\/(.*)$/)
    if (m) {

        var table = m[1] // 表名
        var action = m[2] // 操作 insert, update, save, delete, select

        // action转换
        if (action=='list') action = 'select'
        // ...

        // 本地数据库操作
        var rs = als.table(table)[action](data)

        // 返回结果作为ajax响应
        return {
            code: 10000,
            msg: 'success',
            data: rs
        }
    }
})


// 开启ajax拦截
if ('dev') {
    als.open()
}