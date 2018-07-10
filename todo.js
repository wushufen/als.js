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