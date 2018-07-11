/*! @preserve https://github.com/wusfen/als.js */
! function() {

    // 
    // 本地存储 模拟 数据库
    // 
    var db = {
        store: window.localStorage || {},
        name: 'als:table',
        table: function(name) {
            this.name = 'als:' + name
            return this
        },
        read: function() {
            try {
                return JSON.parse(this.store[this.name]) || []
            } catch (e) {
                return []
            }
        },
        write: function(data) {
            this.store[this.name] = JSON.stringify(data, null, ' ')
        },
        cid: function() {
            var id = this.store['als.id'] || '0'
            id = +id + 1
            return this.store['als.id'] = id
        },
        isAction: function (action) {
            return ['select','insert','update','save','delete'].indexOf(action) != -1
        },
        insert: function(data, pk) {
            pk = pk || 'id'
            var list = this.read()
            data[pk] = this.cid()
            list.push(data)
            this.write(list)
        },
        update: function(data, pk) {
            pk = pk || 'id'
            var list = this.read()
            var where = {}
            where[pk] = data[pk]
            for (var i = 0, length = list.length; i < length; i++) {
                var item = list[i]
                if (this.match(item, where)) {
                    list[i] = data
                }
            }
            this.write(list)
        },
        save: function(data, pk) {
            pk = pk || 'id'
            if (data[pk]) {
                this.update(data, pk)
            } else {
                this.insert(data, pk)
            }
        },
        delete: function(where) {
            var list = this.read()
            for (var i = 0, length = list.length; i < length; i++) {
                var item = list[i]
                if (this.match(item, where)) {
                    list.splice(i, 1), i--, length--
                }
            }
            this.write(list)
        },
        page: function(pageNo, pageSize) {
            this.pageNo = pageNo
            this.pageSize = pageSize
            return this
        },
        select: function(where) {
            var list = this.read()
            var arr = []
            for (var i = 0; i < list.length; i++) {
                var item = list[i]
                if (this.match(item, where)) {
                    arr.push(item)
                }
            }

            if (this.pageNo) {
                var pageNo = this.pageNo
                var pageSize = this.pageSize || 10
                var start = (pageNo - 1) * pageSize
                var end = start + pageSize
                delete this.pageNo
                return arr.slice(start, end)
            }

            return arr
        },
        match: function(obj, where) {
            if (obj === where) {
                return true
            }

            var isMatch = true
            for (var key in where) {
                var ov = obj[key]
                var wv = where[key]

                if (typeof ov == 'object') continue
                if (typeof wv == 'object') continue
                if (!(key in obj)) continue

                if (ov != wv) {
                    isMatch = false
                    break
                }
            }
            return isMatch
        }
    }


    // 
    // XMLHttpRequest 冒充
    // 
    function fakeXHR(XHR) {

        // 真·太子 
        var XHR = XHR
        var PRO = XHR.prototype

        // 冒充者
        var _XHR = function() {
            this.xhr = new XHR
        }
        var _PRO = _XHR.prototype

        // 冒充者继承家产
        for (var key in PRO) {
            (function(key) {
                var fun = (function() { try { return PRO[key] } catch (e) {} }())
                // 假·方法 ***
                _PRO[key] = typeof(fun) != 'function' ? fun : function() {
                    // console.log(key, fun)
                    // 真·方法
                    fun.apply(this.xhr, arguments)
                }
            })(key)
        }

        // 假·发送 <- 用户
        _PRO.send = function(data) {
            var _xhr = this
            var xhr = this.xhr
            // console.info('[als]', type, url, data)

            // 真·变化
            xhr.onreadystatechange = function() {
                // 假·信息 <- 真·信息
                for (var k in xhr) {
                    var v = xhr[k]
                    if (typeof v != 'function') {
                        _xhr[k] = v
                    }
                }

                // 假·变化 -> 用户
                var _orc = _xhr.onreadystatechange
                _orc && _orc.apply(_xhr, arguments)
            }
            // 真·完成
            xhr.onload = function() {
                // 假·完成 -> 用户
                _xhr.onload && _xhr.onload.apply(_xhr, arguments)
            }

            // 真·发送
            xhr.send.apply(xhr, arguments)
        }

        // 冒充者
        return _XHR
    }


    // k=v&a=b  //=> {}
    function parseParams(params) {
        if (!params) { return {} }

        var data = {}
        params = params.replace(/\+/g, ' ')
        var kvs = params.split('&')

        for (var i = 0; i < kvs.length; i++) {
            var kkv = kvs[i]
            var kk_v = kkv.split('=')
            var kk = decodeURIComponent(kk_v[0]) // obj[a][0][ak]
            var value = decodeURIComponent(kk_v[1]) // 1

            set(data, kk, convertValue(value))
        }

        function set(data, kk, value) {
            var path = kk.replace(/\]/g, '').split('[') // ["obj", "a", "0", "ak"]

            var parent = data

            for (var i = 0; i < path.length; i++) {
                var key = path[i] // a
                var nextKey = path[i + 1] // 0

                // ["obj", "a", "0"
                // last = obj.a[0] = []  || obj.a[0] = {}
                // last.push(value)      || last[key] = value
                if (i == path.length - 1) break

                // 下个key决定当前是对象还是数组
                var cur = parent[key] || (isNaN(nextKey) ? {} : []) // '0' ''
                parent[key] = cur
                parent = cur

            }

            // last key
            // obj.a[0]  ['ak'] = 1
            parent instanceof Array ? parent.push(value) : parent[key] = value

            return data
        }

        function convertValue(value) {
            if (value == 'undefined' || value == 'null') value = null
            if (value == 'true') value = true
            if (value == 'false') value = false
            if (value && typeof value == 'string' && !isNaN(value)) value = Number(value)
            return value
        }

        return data
    }


    // 拦截处理器
    var handlers = []


    // 拦截
    function inject(_XHR) {

        var XHR = _XHR
        var PRO = XHR.prototype
        var PRO_open = PRO.open

        PRO.open = function(type, url) {
            PRO_open.apply(this, arguments)

            this.send = function(params) {
                // parse data
                var data = {}
                if (typeof params == 'string') {
                    data = params.match('{') ? JSON.parse(params) : parseParams(params)
                }

                // 拦截处理
                var rs
                try {
                    for (var i = 0; i < handlers.length; i++) {
                        var handler = handlers[i]
                        if (typeof handler == 'function') {
                            rs = handler(type, url, data) || rs
                        }
                    }
                } catch (e) {
                    console.error(e)
                }

                // 是否拦截返回
                if (rs) {

                    // 覆盖
                    PRO_open.apply(this, [type, url + '?__@[als]'])

                    // 取消用户注册的回调
                    var onload = this.onload
                    var orc = this.onreadystatechange
                    this.onload = null
                    this.onreadystatechange = null

                    // 模拟成功
                    var xhr = this
                    setTimeout(function() {
                        var res = JSON.stringify(rs)
                        xhr.readyState = 4
                        xhr.status = 200
                        xhr.response = xhr.responseText = res

                        // 手动触发用户回调
                        onload && onload.apply(xhr, [{}])
                        orc && orc.apply(xhr, [{}])
                    }, 1)

                    // log
                    console.info('\n', '[als]', type, url, '\n', data, '\n', rs, '\n\n')

                } else {

                    PRO.send.apply(this, arguments)
                }

            }

        }

    }


    // 
    var XHR = window.XMLHttpRequest
    var _XHR = fakeXHR(XHR)
    inject(_XHR)


    // api
    function als(handler) {
        handlers.push(handler)
        return als
    }
    als.open = function() {
        window.XMLHttpRequest = _XHR
        return this
    }
    als.close = function() {
        window.XMLHttpRequest = XHR
        return this
    }

    als.db = db
    als.table = function (name) {
        return db.table(name)
    }
    als.isAction = db.isAction


    // export
    if (typeof module != 'undefined') {
        module.exports = als
    } else {
        window.als = als
    }

}()