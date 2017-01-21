
CLapi.addRoute('limit', {
  get: {
    action: function() {
      return {status:'success',data:'there may not be anything useful to expose here...'}
    }
  }  
});

CLapi.internals.limit = function(limit,method,url,options,callback) {
  // receive the usual stuff for a meteor http method, but starting with a limit param
  // if there is no api meta record of request to this url, record that it was executed now, and execute it
  // if there is a record showing last execute time, if it is beyond limit time, execute now and record time now
  // if the record less than limit time in the past, update the time on it plus limit
  // wait until that time plus limit then execute (so a wait of some time less than total limit)
  // if the record shows a limit time in the future, update that time plus limit
  // wait until the future time plus limit, then execute (so a wait longer than limit time)
  // once executed, return
  
  // starting query should be - most recent record of request to this url, sorted descending created time, limit 1, 
  // and created later than now minus limit
  
  // this will essentially queue up requests in memory, so of course wil eat memory.
  // but then, so will any fast in-memory queue system.
  // the memory usage is just the size of the request object, so assuming outgoing requests to places we are 
  // asking FOR stuff rather than sending stuff to, they are unlikely to be big.
  // if we do have to limit many outgoing requests that are trying to send large data,
  // then may have to store that data to disk and retrieve it when execute time rolls around
  
  // the only question is, will subsequent requests to this method not even kick off while it is doing stuff?
  // js / meteor framework should preclude that, but test - if not precluded, do something about it
  // doing something about it means using the cron server to do a one-second schedule, and using the jobs 
  // method to create jobs to execute the request at a given time - but that will also mean callbacks are 
  // necessary, and could make other code flow more complex
};


