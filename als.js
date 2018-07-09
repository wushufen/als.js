!function () {

	// 
	// 本地存储 模拟 数据库
	// 
	var db = {
		store: window.localStorage || {},
		name: 'als:table',
		table: function (name) {
			this.name = 'als:' + name
			return this
		},
		read: function () {
			try {
				return JSON.parse(this.store[this.name]) || []
			} catch (e) {
				return []
			}
		},
		write: function (data) {
			this.store[this.name] = JSON.stringify(data, null, ' ')
		},
		cid: function () {
			var id = this.store['als.id'] || '0'
			id = +id + 1
			return this.store['als.id'] = id
		},
		insert: function (data, pk) {
			pk = pk || 'id'
			var list = this.read()
			data[pk] = this.cid()
			list.push(data)
			this.write(list)
		},
		update: function (data, pk) {
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
		save: function (data, pk) {
			pk = pk || 'id'
			if (data[pk]) {
				this.update(data, pk)
			} else {
				this.insert(data)
			}
		},
		delete: function (where) {
			var list = this.read()
			for (var i = 0, length = list.length; i < length; i++) {
				var item = list[i]
				if (this.match(item, where)) {
					list.splice(i, 1), i-- , length--
				}
			}
			this.write(list)
		},
		page: function (pageIndex, pageSize) {
			this.pageIndex = pageIndex
			this.pageSize = pageSize
			return this
		},
		select: function (where) {
			var list = this.read()
			var arr = []
			for (var i = 0; i < list.length; i++) {
				var item = list[i]
				if (this.match(item, where)) {
					arr.push(item)
				}
			}

			if (this.pageIndex) {
				var pageIndex = this.pageIndex
				var pageSize = this.pageSize || 10
				var start = (pageIndex - 1) * pageSize
				var end = start + pageSize
				delete this.pageIndex
				return arr.slice(start, end)
			}

			return arr
		},
		match: function (obj, where) {
			if (obj === where) {
				return true
			}

			var isMatch = true
			for (var key in where) {
				var ov = obj[key]
				var wv = where[key]
				if (ov != wv && typeof (ov) != 'object' && typeof (wv) != 'object') {
					isMatch = false
					break
				}
			}
			return isMatch
		}
	}


	// k=v&a=b  //=> {}
	function parseParams(params) {
		if (!params) { return params }

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


	var XHR = window.XMLHttpRequest
	var _XHR = fakeXHR(XHR)
	// 
	// XMLHttpRequest 冒充
	// 
	function fakeXHR(XHR) {

		// 真·太子 
		var XHR = XHR
		var PRO = XHR.prototype

		// 冒充者
		var _XHR = function () {
			this.xhr = new XHR
		}
		var _PRO = _XHR.prototype

		// 冒充者继承家产
		for (var key in PRO) {
			(function (key) {
				var fun = (function () { try { return PRO[key] } catch (e) { } }())
				// 假·方法 ***
				_PRO[key] = typeof (fun) != 'function' ? fun : function () {
					// console.log(key, fun)
					// 真·方法
					fun.apply(this.xhr, arguments)
				}
			})(key)
		}

		// 假·发送 <- 用户
		_PRO.send = function (data) {
			var _xhr = this
			var xhr = this.xhr
			// console.info('[als]', type, url, data)

			// 真·变化
			xhr.onreadystatechange = function () {
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
			xhr.onload = function () {
				// 假·完成 -> 用户
				_xhr.onload && _xhr.onload.apply(_xhr, arguments)
			}

			// 真·发送
			xhr.send.apply(xhr, arguments)
		}

		// 冒充者
		return _XHR
	}


	// 拦截
	function inject(_XHR) {

		var XHR = _XHR
		var PRO = XHR.prototype
		var PRO_open = PRO.open

		PRO.open = function (type, url) {
			try{

				// 匹配到拦截规则
				var rule = getRule(type, url)
				var table = rule.table
				var action = rule.action
				var actions = ['select', 'insert', 'update', 'save', 'delete']
				var isAction = actions.indexOf(action) != -1
				console.log('open', rule)

				if (rule && isAction) {

					this.send = function (data) {
						console.info('[als]', type, url)
						console.info('	table:', table, '	action:', action)
						console.info('	data:', data)

						var params = data
						if (typeof params == 'string') {
							data = params.match('{')? JSON.parse(data): parseParams(data)
						}


						// 模拟数据
						var res = ''
						if (isAction) {
							var res = db.table(table)[action](data) || []
						} else {
							console.warn('[als] action must be: ' + actions, '=>', action)
						}
						var after = rule.after || als.after
						console.log('res', res)
						res = after ? after(res) : res

						console.info('	res:', res)


						// 取消用户注册的回调
						var onload = this.onload
						var orc = this.onreadystatechange
						this.onload = null
						this.onreadystatechange = null

						// 模拟成功
						var xhr = this
						setTimeout(function () {
							res = JSON.stringify(res)
							xhr.readyState = 4
							xhr.status = 200
							xhr.response = xhr.responseText = res

							// 手动触发用户回调
							onload && onload.apply(xhr, [{}])
							orc && orc.apply(xhr, [{}])
						}, 1)


						PRO.send.apply(this, arguments)
					}


					// PRO_open.apply(this, arguments)
					PRO_open.apply(this, [type, url + '?__@[als]'])
					// PRO_open.apply(this, ['GET', '.?als:' + type + '='+ url])
				} else {
					PRO_open.apply(this, arguments)
				}

			}catch(e){
				console.error(e)
			}
		}

	}
	inject(_XHR)



	// 拦截规则
	var rules = []
	function getRule(type, url) {
		for (var i = rules.length - 1; i >= 0; i--) {
			var rule = rules[i]
			if (typeof rule == 'object') {
				if (url.match(rule.url) && (!rule.type || (rule.type && rule.type.toUpperCase() == type.toUpperCase()))) {
					return rule
				}
			}
			if (typeof rule == 'function') {
				return rule(type, url)
			}
		}
		return false
	}



	als.db = db
	als.rules = rules
	als.getRule = getRule

	function als(fn) {
		rules.push(fn)
		return als
	}
	als.rule = function (rule) {
		rules.push(rule)
		return this
	}
	als.before = function (data) {
	}
	als.after = function (data) {
		return {
			code: 0,
			msg: 'success',
			data: data
		}
	}
	als.open = function () {
		window.XMLHttpRequest = _XHR
		return this
	}
	als.close = function () {
		window.XMLHttpRequest = XHR
		return this
	}


	if (typeof module != 'undefined') {
		module.exports = als
	} else {
		window.als = als
	}


}()
