

leviathan_statement = new Mongo.Collection("leviathan_statement");
leviathan_response = new Mongo.Collection("leviathan_response");

leviathan_statement.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
});
leviathan_statement.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/leviathan/statement/' + this._id, doc);
});
leviathan_statement.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
leviathan_statement.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/leviathan/statement/' + doc._id, doc);
});
leviathan_statement.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/leviathan/statement/' + doc._id);
});

leviathan_response.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
});
leviathan_response.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/leviathan/response/' + this._id, doc);
});
leviathan_response.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
leviathan_response.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/leviathan/response/' + doc._id, doc);
});
leviathan_response.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/leviathan/response/' + doc._id);
});

CLapi.addCollection(leviathan_statement);
CLapi.addCollection(leviathan_response);

CLapi.addRoute('service/leviathan', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'The Leviathan API.'} };
    }
  }
});

CLapi.addRoute('service/leviathan/statement', {
  get: {
    action: function() {
      var rt = '/leviathan/statement/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/leviathan/statement/_search',data);
    }
  }
});
CLapi.addRoute('service/leviathan/statement/:sid', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid);
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid,this.request.json);
    }
  },
  delete: {
    action: function() {
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid,true);
    }
  },
});
CLapi.addRoute('service/leviathan/statement/:sid/responses', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.responses(this.urlParams.sid);
    }
  }
});

CLapi.addRoute('service/leviathan/response', {
  get: {
    action: function() {
      var rt = '/leviathan/response/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/leviathan/response/_search',data);
    }
  }
});
CLapi.addRoute('service/leviathan/response/:sid', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.response(this.urlParams.sid);
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.leviathan.response(this.urlParams.sid,this.request.json);
    }
  },
  delete: {
    action: function() {
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid,true);
    }
  },
});



CLapi.internals.service.leviathan = {};

CLapi.internals.service.leviathan.statement = function(sid,obj) {
  // user, url, highlight, cite, statement, sentiment, hash, tags (provided, derived), keywords (like / same as derived tags?), 
  
  // STATEMENT TYPES
  // positive / negative (e.g. MUST vs MUST NOT)
  // request (e.g. is this true, can this be reviewed)
}

CLapi.internals.service.leviathan.response = function(rid,obj) {
  // user, sid, cite, sentiment, hash, tags
  // should responses actually just be statements that are ABOUT other statements?
  // YES - and they could be framed as rebuttals or supports, or...
  
  // RESPONSE TYPES
  // agree / disagree
  // positive / negative
  // strongly stated (positive or negative)
  // alternative (Let's go dancing - yes, no, no let's go running)
  // authoritative (user can claim authority - that is a statement, and other users can agree or disagree)
  // support (with or without evidence)
  // refute (with or without evidence)
  // proof - logical, that statement is / is not true
  // accept (e.g. if multiple refutations, what is the accepted answer?)
  // duplicate - indicate that the question is a duplicate, and others can agree / disagree on that too, to weight whether it is or not
  // contradiction - indicate that the user stating "the sky is blue" elsewhere already said "the sky is red"
  // a more complex contradiction would be "men mostly commit violence, target men to reduce it" but elsehwere says "black people mostly commit crime, don't profile black people"
  // should a user being agreed to have made contradictory statements have a reduction applied to the weight of all their responses?
  // probably - so if user makes 1000 statements, and is marked as being contradictory 500 times, then any response they make to other questions only has +- .5 instead of 1
  // how many users need to agree to a response claiming a statement is a duplicate or a contradiction before it is accepted as being such?
  // perhaps it does not matter - just flag it as possibly contradictory, possibly duplicate, and leave it up to the creator to change it
  // in which case, dups are accepted as such by the creator, and just become pointers to the one they dup'd, and add scores to it
  // whilst contradictions if left standing have negative effect on creator vote power. if accepted as contradiction, don't have negative effect, but not deleted - stand as evidence
}

// user has to be able to sign up using our usual account auth
// also need to ask user to give us access to facebook and twitter (and other places they may make statements)
// user should be able to pick interest tags to follow

// create statements / questions
// look for @ and # terms provided in the statement
// look for ones specific to leviathan?
// extract keywords
// calculate positive / negative sentiment?
// calculate sentence hash (still to choose best way to do, aim is to compare similarity to other statements)
// search for relevant reference material for statement?
// count the number of responses to this statement so far? Or have the response endpoint iterate a counter on the statement itself

// have particular statement sets or # that drive specific action
// like someone could request an #expert user to #review their #article

// where could statements come from?
// facebook / twitter feeds, other places people actually make statements
// email users to ask them to answer certain questions
// browser plugin allowing user to ask for #review on the content of a particular web url
// or even a highlighted statement on the page of a given url
// for business use, requirements / issues, and feedback / rebuttals to them
// github issues, for example. we can see who cares about certain types of problem, or who works on certain sorts of thing

// such a browser app could also check for any comments on a given page
// but this is just like commentator / annotator - useful? maybe. different context.

// user answers statement / question
// extract keywords
// calculate response hash?
// are answers complex or yes/no? preferably complex
// but have to start with simple ones

// link relevant reference material to statement (as statement, or as answer to statement)
// indicate / calculate whether reference material is in support or in contradiction to statement

// demonstrate proximity of statements, answers, and users solely by what is written
// (assumption is content is an illusion at an individual level, and meaning is ONLY in relation)

// email users with questions to generate more responses
// allow email responses direct to questions

// some way to encourage new users to sign up
// a front page of recent statements - news
// a page of responses to view - activity
// a page of recent URLs submitted for review - action

// what does a new user get out of it, beyond the first group who volunteer as tests?
// a user could see the flavour of their locale, to get a better sense of their own community
// a user may want to get a better sense of someone else
// on facebook for example the rainbow overlays of profile pics could have red vs blue overlays, 
// either for a user viewing their own feed coloured to indicate the colour of users as represented 
// in the feed of the current user (because can only access what the user can access this way), 
// or for users signed up directly themselves having their profile coloured based on the entirety 
// of their user activity - indicating their leanings to other people

// how does this fit into the red vs blue teams on the train video example?
// can people be compared not only on statements but on metadata of themselves and their network?

// the aim is not to compare specific people
// instead the aim is to show that people group by interest - not by perspective
// e.g. football supporters are all football supporters regardless of their internal rivalry about teams
// what they care about is football - and it does not matter which way they care about it
// attempt to show the same about political affiliation, moral / religious belief etc
// it is not HOW or WHAT you believe that matters, but THAT you do so
// if you talk about god, either dismissing or affirming, you are part of the people who care about god
// ultimate aim? to examine if / how activism is causal, or is caused by, actions (or at least (stated) beliefs about actions)



/* 

the old answer

@blueprint.route('/', methods=['GET','POST'])
@blueprint.route('/<identifier>', methods=['GET','POST'])
def answer(identifier=None):

    if request.method == 'GET':

        if identifier is None:
            abort(404)
        else:
            f = models.Answer().pull(identifier)
            if f:
                resp = make_response( f.json )
                resp.mimetype = "application/json"
                return resp
            else:
                abort(404)

    else:
        if identifier is not None:
            f = models.Answer.pull(identifier)
            if f is None: abort(404)
        else:
            f = models.Answer()

        if request.json:
            for k in request.json.keys():
                f.data[k] = request.json[k]
        else:
            for k, v in request.values.items():
                if k not in ['submit']:
                    f.data[k] = v
        
        f.save()

        return ""
        
*/



/*

the old question

@blueprint.route('/', methods=['GET','POST'])
@blueprint.route('/<identifier>', methods=['GET','POST'])
def question(identifier=None):
    if request.method == 'GET':

        params = {
            'tags': request.values.get('tags',False),
            'keywords': request.values.get('keywords',False)
        }

        res = None
        
        if identifier is None:
            # TODO: this query should be filtered so as not to include questions 
            # the currently logged in user has already answered (if the user is logged in)
            
            # TODO: it is necessary for the UI to be able to pass query params into this
            # so that people can filter questions by tags
            
            qry = {
                "query" : { "match_all" : {} },
                "sort" : {
                    "_script" : { 
                        "script" : "Math.random()",
                        "type" : "string",
                        "params" : {},
                        "order" : "asc"
                    }
                }
            }

            if params['tags']:
                if 'bool' not in qry['query'].keys():
                    qry['query'] = {'bool':{'must':[]}}
                for v in params['tags'].split(','):
                    qry['query']['bool']['must'].append({'term':{'tags.exact':v}})
            if params['keywords']:
                if 'bool' not in qry['query'].keys():
                    qry['query'] = {'bool':{'must':[]}}
                for v in params['keywords'].split(','):
                    qry['query']['bool']['must'].append({'term':{'keywords.exact':v}})

            f = models.Question().query(q=qry)
            try:
                res = json.dumps(f['hits']['hits'][0]['_source'])
            except:
                pass
        else:
            f = models.Question().pull(identifier)
            if f is not None: res = f.json

            
        if res is not None:
            resp = make_response( res )
            resp.mimetype = "application/json"
            return resp
        else:
            abort(404)

    else:
        if identifier is not None:
            f = models.Question().pull(identifier)
        else:
            f = models.Question()

        if request.json:
            for k in request.json.keys():
                if k == 'tags':
                    f.data[k] = [i.strip(" ") for i in request.json[k].split(',')]
                else:
                    f.data[k] = request.json[k]
        else:
            for k, v in request.values.items():
                if k == 'tags':
                    f.data[k] = [i.strip(" ") for i in v.split(',')]
                elif k not in ['submit']:
                    f.data[k] = v

        if len(f.data.get('question','')) > 2:        
            f.data['question'] = strip_tags(f.data['question'])

        if len(f.data.get('question','')) > 2:
            f.data['formattedquestion'] = markdown.markdown(f.data['question'])
            f.data['shortquestion'] = ''
        
            tt = []
            for val in f.data['tags']:
                val = val.replace('#','').replace('@','')
                if len(val) > 1:
                    tt.append(val)
            f.data['tags'] = tt
            
            f.data['keywords'] = mine(blurb=f.data['question'],omitscores=True,raw=True)
            tk = []
            for val in f.data['keywords']:
                val = val.replace('#','').replace('@','')
                if len(val) > 2:
                    tk.append(val)
            f.data['keywords'] = tk
            
            f.data = metadata(request,f.data)
            
            f.save()
            flash("Thanks, your question has been added.","success")

        else:
            flash("Sorry, your question was not sufficiently verbose. Please try again.","danger")

        return redirect("/")
        


# get metadata about the question or answer submitted
def metadata(request,data):
    if 'request' not in data:
        try:
            try:
                ra = request.access_route[len(request.access_route)-1]
            except:
                ra = request.remote_addr
            src = requests.get('http://api.hostip.info/get_json.php?position=true&ip=' + ra)
            try:
                data['request'] = {
                    'country_name': src.json()['country_name'],
                    'country_code': src.json()['country_code'],
                    'city': src.json()['city'],
                    'ip': src.json()['ip'],
                    'geo':{
                        'lat': src.json()['lat'],
                        'lng': src.json()['lng']
                    }
                }
            except:
                pass
        except:
            pass

    if 'groups' not in data:
        data['groups'] = []

    if current_user.is_anonymous() and 'anonymous' not in data['groups']:
        data['groups'].append('anonymous')
    elif current_user.id not in data['groups']:
        data['groups'].append(current_user.id)

    if data['request'].get('city',''):
        if data['request']['city'] not in data['groups']:
            data['groups'].append(data['request']['city'])
    if data['request'].get('ip',''):
        if data['request']['ip'] not in data['groups']:
            data['groups'].append(data['request']['ip'])
    if data['request'].get('geo',{}).get('lat',False) and data['request'].get('geo',{}).get('lng',False):
        latlng = str(data['request']['geo']['lat']) + ',' + str(data['request']['geo']['lng'])
        if latlng not in data['groups']:
            data['groups'].append(latlng)

    return data


# strip html from the input question
class MLStripper(HTMLParser):
    def __init__(self):
        self.reset()
        self.fed = []
    def handle_data(self, d):
        self.fed.append(d)
    def get_data(self):
        return ''.join(self.fed)

def strip_tags(html):
    s = MLStripper()
    s.feed(html)
    return s.get_data()

*/



/*

the old leviathan graph

'''

a completely customised graph endpoint for leviathan

receives a query with which to filter the questions, e.g. 
by tags or by user or by specific question.

then gets all the relevant questions
and all their tags
and all their answers

and get all the users - that created questions and submitted answers
connect users to the questions and answers they created

connect tags to questions they are about
connect answers to questions they are for
where a positive answer, shade green
where negative, shade red

pass the question text so it can be displayed too, and usernames and tags text

get hierarchies once they are enabled, and set a depth controller
so that for result set can get next level in all three directions
parents, siblings, children
then can recurse to depth setting

'''

import json, urllib2, requests

from flask import Blueprint, request, make_response

from portality.core import app
import portality.models as models
import portality.util as util


blueprint = Blueprint('graph', __name__)


@blueprint.route('/', methods=['GET','POST'])
@util.jsonp
def graph():

    def qvals(qid):
        # get the answers for this question and work out value as number of answers
        ans = [x for x in answers if x['qid.exact'] == qid]
        val = len(ans)

        # then get the color as avg of answers
        c = 0.0
        for a in ans: 
            c += float(a['answer'])
        if val != 0: c = c/val
        f = (c+1) / 2
        col = '#%02x%02x%02x' % ((1-f)*255, f*255, 0.)

        # if value is 0, increase it to 1 so that the dot shows up
        if val == 0: val = 1

        return {'value':val,'color':col,'score':c}


    def fuzzify(val):
        if '*' not in val and '~' not in val and ':' not in val:
            valparts = val.split(',')
            nval = ""
            for vp in valparts:
                if len(vp):
                    nval += '*' + vp + '* '
            val = nval

        return val.strip(" ")

    # get any query parameters
    params = {
        'facets':request.values.get('facets','').split(','),    
        'answers': request.values.get('answers',False),
        'selectedtags': request.values.get('selectedtags',False),
        'oneoftags': request.values.get('oneoftags',False),
        'selectedkeywords': request.values.get('selectedkeywords',False),
        'selectedgroups': request.values.get('selectedgroups',False),
        'query': request.values.get('query',False),
        'question': request.values.get('question',False)
    }

    # the starting query
    qs = {
        'query':{
            'match_all':{
            }
        },
        'size':10000,
        'fields':[
            'question.exact',
            'groups.exact',
            'tags.exact',
            'author.exact',
            'id.exact'
        ],
        'facets':{
        }
    }

    for fct in params['facets']:
        if len(fct) > 0:
            qs['facets'][fct] = {
                'terms':{
                    'field':fct + '.exact',
                    'size':10000
                }
            }

    if params['selectedtags']:
        if 'bool' not in qs['query'].keys():
            qs['query'] = {
                'bool':{
                    'must':[]
                }
            }
        for s in params['selectedtags'].split(','):
            qs['query']['bool']['must'].append({'term':{'tags.exact':s}})

    if params['oneoftags']:
        if 'bool' not in qs['query'].keys():
            qs['query'] = {
                'bool':{
                    'must':[]
                }
            }
        if 'should' not in qs['query']['bool'].keys():
            qs['query']['bool']['should'] = []
        for s in params['oneoftags'].split(','):
            qs['query']['bool']['should'].append({'term':{'tags.exact':s}})

    if params['selectedkeywords']:
        if 'bool' not in qs['query'].keys():
            qs['query'] = {
                'bool':{
                    'must':[]
                }
            }
        for s in params['selectedkeywords'].split(','):
            qs['query']['bool']['must'].append({'term':{'keywords.exact':s}})

    if params['selectedgroups']:
        if 'bool' not in qs['query'].keys():
            qs['query'] = {
                'bool':{
                    'must':[]
                }
            }
        for s in params['selectedgroups'].split(','):
            qs['query']['bool']['must'].append({'term':{'groups.exact':s}})

    if params['query']:
        if 'bool' not in qs['query'].keys():
            qs['query'] = {
                'bool':{
                    'must':[]
                }
            }
        qs['query']['bool']['must'].append({'query_string':{'query':fuzzify(params['query'])}})

    if params['question']:
        if 'bool' not in qs['query']:
            qs['query'] = {
                'bool':{
                    'must':[]
                }
            }
        qs['query']['bool']['must'] = {'term':{'id.exact':params['question']}}

    # get all the questions that match the query
    res = models.Question.query(q=qs)
    questions = [i['fields'] for i in res.get('hits',{}).get('hits',[])]
    if 'tags' in params['facets']:
        tags = [i for i in res.get('facets',{}).get('tags',{}).get('terms',[])]
    else:
        tags = []
    if 'usernames' in params['facets']:
        usernames = [i for i in res.get('facets',{}).get('usernames',{}).get('terms',[])]
    else:
        usernames = []
    if 'groups' in params['facets']:
        groups = [i for i in res.get('facets',{}).get('groups',{}).get('terms',[])]
    else:
        groups = []
        

    # get all the answers to those questions
    aq = {
        'query':{
            'filtered':{
                'query':{
                    'match_all':{}
                },
                'filter':{
                    'terms':{
                        'qid.exact':[i['id.exact'] for i in questions]
                    }
                }
            }
        },
        'size':100000,
        'fields':[
            'answer',
            'author.exact',
            'qid.exact',
            'id.exact'
        ]
    }
    ares = models.Answer.query(q=aq)
    answers = [i['fields'] for i in ares.get('hits',{}).get('hits',[])]


    # put everything into the nodes and work out the links
    positions = {}
    nodes = []
    links = []
    linksindex = {}

    # put all tags into the nodes
    for t in tags:    
        nodes.append({
            'type':'tag',
            'id':t['term'],
            'className':t['term'],
            'label': '#' + t['term'],
            'hoverlabel': t['term'] + " (" + str(t['count']) + ')',
            'value':t['count'],
            'color':'white'
        })
        positions[t['term']] = len(nodes) - 1

    # put all usernames into the nodes
    for u in usernames:    
        nodes.append({
            'type':'username',
            'id':u['term'],
            'className':u['term'],
            'label': '@' + u['term'],
            'hoverlabel': u['term'] + " (" + str(u['count']) + ')',
            'value':u['count'],
            'color':'orange'
        })
        positions[u['term']] = len(nodes) - 1

    # put all groups into the nodes
    for g in groups:
        nodes.append({
            'type':'group',
            'id':g['term'],
            'className':g['term'],
            'label': '@' + g['term'],
            'hoverlabel': g['term'] + " (" + str(g['count']) + ')',
            'value':g['count'],
            'color':'#ffeeaa'
        })
        positions[g['term']] = len(nodes) - 1

    for q in questions:
        # add every question to the nodes
        qv = qvals(q['id.exact'])
        nodes.append({
            'type':'question',
            'id':q['id.exact'],
            'className':q.get('question.exact',""),
            'label': q.get('shortquestion.exact',q.get('question.exact',"")),
            'hoverlabel': q.get('question.exact',"") + " - averaged " + str(qv['score']) + " over " + str(qv['value']) + " votes",
            'score':qv['score'],
            'value':qv['value'],
            'color':qv['color']
        })
        positions[q['id.exact']] = len(nodes) - 1
        # for every question write a link to the author
        if 'usernames' in params['facets']:
            links.append({
                'source':positions[q['id.exact']],
                'target':positions[q['author.exact']]
            })
            linksindex[str(positions[q['id.exact']]) + "," + str(positions[q['author.exact']])] = 1
        # for every question write a link to all of its tags
        if 'tags' in params['facets']:
            tgs = q.get('tags.exact',[])
            if not isinstance(tgs,list): tgs = [tgs]
            for tag in tgs:
                links.append({
                    'source':positions[q['id.exact']],
                    'target':positions[tag]
                })
                linksindex[str(positions[q['id.exact']]) + "," + str(positions[tag])] = 1    
        # for every question write a link to all of its tags
        if 'groups' in params['facets']:
            gps = q.get('groups.exact',[])
            if not isinstance(gps,list): gps = [gps]
            for gp in gps:
                links.append({
                    'source':positions[q['id.exact']],
                    'target':positions[gp]
                })
                linksindex[str(positions[q['id.exact']]) + "," + str(positions[gp])] = 1

        
    if params['answers']:

        for a in answers:
            # add every answer to the nodes
            if a['answer'] > 0:
                col = '#33CC00'
            elif a['answer'] == 0:
                col = '#666'
            elif a['answer'] < 0:
                col = 'red'
            nodes.append({
                'type':'answer',
                'id':a['id.exact'],
                'label': "",
                'hoverlabel': a['author.exact'] + " voted " + str(a['answer']),
                'value':1,
                'color':col
            })
            positions[a['id.exact']] = len(nodes) - 1
            # for every answer write a link to the question
            links.append({
                'source':positions[a['id.exact']],
                'target':positions[a['qid.exact']]
            })
            linksindex[str(positions[a['id.exact']]) + "," + str(positions[a['qid.exact']])] = 1
            # TODO: put links to faceted things that are relevant to answers, like groups or usernames
            '''if params['usernames']:
                links.append({
                    'source':positions[a['id.exact']],
                    'target':positions[a['author.exact']]
                })
                linksindex[str(positions[a['id.exact']]) + "," + str(positions[a['author.exact']])] = 1'''


    # send back the answer
    resp = make_response( json.dumps( {'nodes':nodes,'links':links, 'linksindex':linksindex} ) )
    resp.mimetype = "application/json"
    return resp

*/


