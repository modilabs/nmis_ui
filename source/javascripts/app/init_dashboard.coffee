
NMIS.url_root = do ->
  url_root = "#{window.location.pathname}"
  url_root = url_root.replace("index.html", "") if !!~ url_root.indexOf "index.html"
  url_root

###

initializing a Sammy.js object, called "dashboard".
This will route URLs and handle links to pre-routed URLs.

routes are defined in nmis_facilities.js and nmis_summary.js by:
   dashboard.get("/url/:variable", callback);

URL actions can be triggered by calling:
   dashboard.setLocation("/url/hello");

###

@dashboard = $.sammy("body", ->
  @get "#{NMIS.url_root}#/:state/:lga/?", ->
    # when user lands at this base page, they will
    # be redirected to a default section (ie. "summary")
    dashboard.setLocation "#{NMIS.url_root}#/#{@params.state}/#{@params.lga}/summary/"
)

#
#//NMIS.DisplayWindow.showTitle('tables')
#

NMIS.DisplayWindow.init ".content",
  offsetElems: ".topbar .fill .container"
  sizeCookie: true
  # callbacks:
  #   resize: [(animate, sizeName) ->
  #     switch sizeName
  #       when "full"
  #         NMIS.DisplayWindow.showTitle "tables"
  #       when "middle"
  #         NMIS.DisplayWindow.showTitle "bar"
  #       when "minimized"
  #         NMIS.DisplayWindow.showTitle "bar"
  #   ]

overviewObj =
  name: "Overview"
  slug: "overview"

NMIS.init()
wElems = NMIS.DisplayWindow.getElems()
NMIS._wElems = wElems

NMIS.LocalNav.init wElems.wrap,
  sections: [[["mode:summary", "LGA Summary", "#"], ["mode:facilities", "Facility Detail", "#"]], [["sector:overview", "Overview", "#"], ["sector:health", "Health", "#"], ["sector:education", "Education", "#"], ["sector:water", "Water", "#"]]]

NMIS.urlFor = (o) ->
  o.root = "#{NMIS.url_root}#" unless o.root?
  o.mode = "summary" unless o.mode?

  # If problems, revert back to this code:
  # o = _.extend(
  #   #defaults
  #   root: "#{NMIS.url_root}#"
  #   mode: "summary"
  # , _o)
  return "#{NMIS.url_root}#?error"  if not o.lga or not o.state
  uu = (_pushAsDefined = (obj, keyList) ->
    key = undefined
    i = undefined
    l = undefined
    arr = []
    item = undefined
    i = 0
    l = keyList.length

    while i < l
      key = keyList[i]
      item = obj[key]
      unless not item
        return ["/error"]  if item is false
        arr.push (if item.slug is `undefined` then item else item.slug)
      else
        return arr
      i++
    arr
  )(o, ["root", "state", "lga", "mode", "sector", "subsector", "indicator"]).join("/")
  uu += "?facility=" + o.facility  unless not o.facility
  uu

NMIS._prepBreadcrumbValues = (e, keys, env) ->
  arr = []
  i = 0
  l = keys.length

  while i < l
    key = keys[i]
    val = e[key]
    if val isnt `undefined`
      name = val.name or val.slug or val
      env[key] = val
      arr.push [name, NMIS.urlFor(env)]
    else
      return arr
    i++
  arr

NMIS.Breadcrumb.init "p.bc",
  levels: []

dashboard.get "#{NMIS.url_root}#/:state/:lga/facilities/?(#.*)?", NMIS.launch_facilities
dashboard.get "#{NMIS.url_root}#/:state/:lga/facilities/:sector/?(#.*)?", NMIS.launch_facilities
dashboard.get "#{NMIS.url_root}#/:state/:lga/facilities/:sector/:subsector/?(#.*)?", NMIS.launch_facilities
dashboard.get "#{NMIS.url_root}#/:state/:lga/facilities/:sector/:subsector/:indicator/?(#.*)?", NMIS.launch_facilities

dashboard.get "#{NMIS.url_root}#/:state/:lga/summary/?(#.*)?", NMIS.loadSummary
dashboard.get "#{NMIS.url_root}#/:state/:lga/summary/:sector/?(#.*)?", NMIS.loadSummary
dashboard.get "#{NMIS.url_root}#/:state/:lga/summary/:sector/:subsector/?(#.*)?", NMIS.loadSummary
dashboard.get "#{NMIS.url_root}#/:state/:lga/summary/:sector/:subsector/:indicator/?(#.*)?", NMIS.loadSummary

data_src = $.cookie "data-source"
default_data_source_url = "./path_to_generic_data_source/"
data_src = default_data_source_url unless data_src?
NMIS._data_src_root_url = data_src

@dashboard.get "#{NMIS.url_root}#data=(.*)", ()->
  data_src = @params.splat[0]
  $.cookie "data-source", data_src
  @redirect "#{NMIS.url_root}"

# After document has loaded, load "schema" and when that is complete, run sammy.
$ -> NMIS.load_schema(data_src).done ()-> dashboard.run()
