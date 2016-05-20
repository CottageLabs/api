


var makeaccs = function(execute) {
  var fs = Meteor.npmRequire('fs');
  var recs = JSON.parse(fs.readFileSync('/home/cloo/oab_accounts_19052016.json'));
  var output = {start:recs.hits.hits.length,created:0,groupadd:0,already:0,noted:0,errors:0,end:0};
  for (var k in recs.hits.hits) {
    var rec = recs.hits.hits[k]._source;
    var email = rec.email;
    var user = Meteor.users.findOne({'emails.address':email});
    if ( !user ) {
      if (execute) {
        try {
          var password = Random.hexString(30);
          var apikey = rec.api_key ? rec.api_key : Random.hexString(30);
          var apihash = Accounts._hashLoginToken(apikey);
          var userId = Accounts.createUser({email:email,password:password});
          var oabdata = {'signup':'legacy','oldid':rec.id}
          if (rec.profession) oabdata.profession = rec.profession;
          if (rec.confirm_public !== undefined) oabdata.confirm_public = rec.confirm_public;
          if (rec.confirm_terms !== undefined) oabdata.confirm_terms = rec.confirm_terms;
          if (rec.mailing_list !== undefined) oabdata.mailing_list = rec.mailing_list;
          if (rec.created_date !== undefined) oabdata.orig_created = rec.created_date;
          Meteor.users.update(userId, {$set: {'username':rec.id,'service':{'openaccessbutton':oabdata},'security':{'httponly':Meteor.settings.public.loginState.HTTPONLY_COOKIES}, 'api': {'keys': [{'key':apikey, 'hashedToken': apihash, 'name':'default'}] }, 'emails.0.verified': true}});
          Roles.addUsersToRoles(userId, 'user', 'openaccessbutton');
        } catch(err) {
          output.errors += 1;
          console.log(err);
        }
      }
      output.created += 1;
    } else if ( CLapi.cauth('openaccessbutton.user',user) === false ) {
      if ( user.service === undefined ) user.service = {};
      if ( user.service.openaccessbutton === undefined ) user.service.openaccessbutton = {};
      user.service.openaccessbutton.signup = 'legacy';
      user.service.openaccessbutton.hadaccount = 'already';
      user.service.openaccessbutton.oldid = rec.id
      if (rec.profession) user.service.openaccessbutton.profession = rec.profession;
      if (rec.confirm_public !== undefined) user.service.openaccessbutton.confirm_public = rec.confirm_public;
      if (rec.confirm_terms !== undefined) user.service.openaccessbutton.confirm_terms = rec.confirm_terms;
      if (rec.mailing_list !== undefined) user.service.openaccessbutton.mailing_list = rec.mailing_list;
      if (rec.created_date !== undefined) user.service.openaccessbutton.orig_created = rec.created_date;
      var setter = {'service':user.service};
      if (rec.username && !user.username) setter.username = rec.username;
      if (execute) {
        Meteor.users.update(user._id, {$set: setter});
        Roles.addUsersToRoles(user._id, 'user', 'openaccessbutton');
      }
      output.groupadd += 1;
    } else if ( user.service && user.service.openaccessbutton && user.service.openaccessbutton.odbpreoab !== undefined ) {
      output.already += 1;
    } else {
      if (execute) Meteor.users.update(user._id, {$set: {"service.openaccessbutton.odbpreoab":true,"service.openaccessbutton.oldid":rec.id}});
      output.noted += 1;
    }
  }
  output.end = output.created + output.groupadd + output.already + output.noted;
  output.created -= output.errors;
  output.executed = execute ? true : false;
  console.log(output);
  return output;
}
  

CLapi.addRoute('scripts/oabutton/makeaccs', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      return {status: 'success', data: makeaccs(this.queryParams.execute)};
    }
  }
});
