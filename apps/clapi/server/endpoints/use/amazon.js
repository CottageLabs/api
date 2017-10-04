
// amazon web services and other amazon APIs
// http://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/Welcome.html

CLapi.addRoute('use/amazon', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'A wrap of some amazon APIs'} };
    }
  }
});



CLapi.internals.use.amazon = {};
CLapi.internals.use.amazon.mturk = {};

CLapi.internals.use.amazon.mturk = function() {

    
}
