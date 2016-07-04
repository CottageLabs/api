Meteor.startup(function () {
  var settings = Meteor.settings.uploadServer;
  settings.getDirectory = function(fileInfo,formData) {
    var dir = '/';
    if (formData && formData.service) dir += formData.service + '/';
    if (formData && formData.dirId) dir += formData.dirId + '/';
    return dir;
  }
  UploadServer.init(settings);
});