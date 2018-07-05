!function () {
	
	// 
	// XMLHttpRequest 冒充
	// 
	function replaceXHR(){

		// 真·太子 
		var XHR = window.XMLHttpRequest
		var PRO = XHR.prototype

		// 冒充者
		var _XHR = function(){
			this.xhr = new XHR
		}
		var _PRO = _XHR.prototype

		// 冒充者继承家产
		for(var key in PRO){
			(function(key){
				var fun = (function(){try{return PRO[key]}catch(e){}}())
				// 假·方法 ***
				_PRO[key] = typeof(fun)!='function'? fun : function(){
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
				for(var k in xhr){
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

		// 冒充者 上位
		window.XMLHttpRequest = _XHR
		_XHR.XHR = XHR
	}



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
		read: function(){
			try{
				return JSON.parse(this.store[this.name]) || []
			}catch(e){
				return []
			}
		},
		write: function (data) {
			this.store[this.name] = JSON.stringify(data, null, ' ')
		},
		cid: function () {
			var id = this.store['als.id'] || '0'
			id = +id +1
			return this.store['als.id'] = id
		},
		insert: function (data) {
			var list = this.read()
			list.push(data)
			this.write(list)
		},
		update: function (data, pk) {
			pk = pk || 'id'

			var where = {}
			where[pk] = data[pk]
			this.delete(where)

			this.insert(data)
		},
		save: function (data, pk) {
			pk = pk || 'id'

			if (data[pk]) {
				this.update(data, pk)
			}else{
				data[pk] = this.cid()
				this.insert(data)
			}
		},
		delete: function (where) {
			var list = this.read()
			for (var i = 0, length = list.length; i < length; i++) {
				var item = list[i]
				if (this.match(item, where)) {
					list.splice(i, 1), i--, length--
				}
			}
			this.write(list)
		},
		page: function(pageIndex, pageSize){
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
			for(var key in where){
				var ov = obj[key]
				var wv = where[key]
				if (ov!=wv && typeof(ov)!='object' && typeof(wv)!='object') {
					isMatch = false
					break
				}
			}
			return isMatch
		}
	}


	// k=v&a=b  //=> {}
	function parseData (params) {
		if (!params) {
			return params
		}
		var data = {}
		params = params.replace(/\+/g, ' ')
		var kvs = params.split('&')
		for(var i=0; i<kvs.length; i++){
			var item = kvs[i]
			kv = item.split('=')
			data[kv[0]] = kv[1]
		}
		return data
	}





	// 拦截
	function inject() {
		replaceXHR()

		var XHR = XMLHttpRequest
		var PRO = XHR.prototype
		var PRO_open = PRO.open

		PRO.open = function (type, url) {
			this.type = type
			this.url = url

			// 匹配到拦截规则
			this.rule = getRule(type, url)
			// console.log(type, url, this.rule)

			if (this.rule) {
				PRO_open.apply(this, [type, '.?als=' + url])
			} else {
				PRO_open.apply(this, arguments)
			}
		}

		var PRO_send = PRO.send
		PRO.send = function (data) {
			var type = this.type
			var url = this.url
			data = parseData(data)

			// 转到本地存储
			if (this.rule) {
				console.info('[als]', type, url, data, this.rule)

				var rule = this.rule
				var table = rule.table
				var action = rule.action
				var actions = ['select', 'insert', 'update', 'save', 'delete']

				var isAction = actions.indexOf(action) != -1

				if (isAction) {
					// 模拟数据库执行
					var res = db.table(table)[action](data)
				} else {
					console.error('[als] action must be: ' + actions, '=>', action)
				}


				res = als.after?als.after(res):res
				res = JSON.stringify(res)

				var _orc = this.onreadystatechange
				this.onreadystatechange = function () {
					this.status = 200
					this.response = this.responseText = res

					_orc && _orc.apply(this, arguments)
				}

				PRO_send.apply(this, arguments)
			} else {
				PRO_send.apply(this, arguments)
			}

		}

	}




	// 拦截规则
	var rules = []
	function getRule(type, url) {
		for (var i = rules.length - 1; i >= 0; i--) {
			var rule = rules[i]
			if (typeof rule == 'object') {
				if (url.match(rule.url) && (!rule.type || (rule.type && rule.type.toUpperCase()==type.toUpperCase()))) {
					return rule
				}
			}
			if (typeof rule == 'function') {
				return rule(type, url)
			}
		}
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
		inject()
		return this
	}
	als.close = function () {
		window.XMLHttpRequest = XMLHttpRequest.XHR || XMLHttpRequest
		return this
	}

	// als.open()
	// als.close()



	if (typeof module != 'undefined') {
		module.exports = als
	} else{
		window.als = als
	}


}()
