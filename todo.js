als('url', {
	data: 'res'
})

als('(.*)/(.*)$', function(type, url, data, match){
	var table = match[0]
	var action = match[1]

	var rs = als.query(table, action, data, pageNo, pageSize)

	return {
		code: 10000,
		msg: 'success',
		data: rs
	}
})
