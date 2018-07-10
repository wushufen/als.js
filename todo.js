als(function(type, url, data){
​
  var m = url.match('user/add')
  if(m){
​
    als.table('user').insert(data)
​
    return {
        code: 10000,
        msg: 'success',
        data: null
    }
  }
​
})

als(function(type, url, data){
​
  var m = url.match('user/detail')
  if(m){
​
    var rs = als.table('user').select(data)
​
    return {
        code: 10000,
        msg: 'success',
        data: data[0]
    }
  }
​
})