Meteor.startup(function () {
  var settings = Meteor.settings.uploadServer;
  settings.getDirectory = function(fileInfo,formData) {
    var dir = '/';
    if (formData.service) dir += formData.service + '/';
    if (formData.dirId) dir += formData.dirId + '/';
    return dir;
  }
  UploadServer.init(settings);
});