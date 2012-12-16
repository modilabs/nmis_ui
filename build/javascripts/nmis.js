
/*
This file is meant to initialize the NMIS object which includes
independently testable modules.
*/


(function() {
  var error;

  if (this.NMIS == null) {
    this.NMIS = {};
  }

  _.templateSettings = {
    escape: /<{-([\s\S]+?)}>/g,
    evaluate: /<{([\s\S]+?)}>/g,
    interpolate: /<{=([\s\S]+?)}>/g
  };

  (function() {
    /*
      This is the abdomen of the NMIS code. NMIS.init() initializes "data" and "opts"
      which were used a lot in the early versions.
    
      Many modules still access [facility-]data through NMIS.data()
    
      opts has more-or-less been replaced by NMIS.Env()
    */

    var cloneParse, data, opts, _s;
    data = false;
    opts = false;
    NMIS.init = function(_data, _opts) {
      opts = _.extend({
        iconSwitcher: true,
        sectors: false
      }, _opts);
      data = {};
      if (!!opts.sectors) {
        NMIS.loadSectors(opts.sectors);
      }
      NMIS.loadFacilities(_data);
      if (opts.iconSwitcher) {
        NMIS.IconSwitcher.init({
          items: data,
          statusShiftDone: function() {
            var tally;
            tally = {};
            return _.each(this.items, function(item) {
              if (!tally[item.status]) {
                tally[item.status] = 0;
              }
              return tally[item.status]++;
            });
          }
        });
      }
      return true;
    };
    NMIS.loadSectors = function(_sectors, opts) {
      return NMIS.Sectors.init(_sectors, opts);
    };
    cloneParse = function(d) {
      var datum, ll, sslug;
      datum = _.clone(d);
      if (datum.gps === undefined) {
        datum._ll = false;
      } else {
        ll = datum.gps.split(" ");
        datum._ll = [ll[0], ll[1]];
      }
      sslug = datum.sector.toLowerCase();
      datum.sector = NMIS.Sectors.pluck(sslug);
      return datum;
    };
    NMIS.loadFacilities = function(_data, opts) {
      return _.each(_data, function(val, key) {
        var id;
        id = val._id || key;
        return data[id] = cloneParse(val);
      });
    };
    NMIS.clear = function() {
      data = [];
      return NMIS.Sectors.clear();
    };
    NMIS.validateData = function() {
      NMIS.Sectors.validate();
      _(data).each(function(datum) {
        if (datum._uid === undefined) {
          return datum._uid = _.uniqueId("fp");
        }
      });
      _(data).each(function(datum) {
        var llArr;
        if (datum._latlng === undefined && datum.gps !== undefined) {
          llArr = datum.gps.split(" ");
          return datum._latlng = [llArr[0], llArr[1]];
        }
      });
      return true;
    };
    _s = void 0;
    NMIS.activeSector = function(s) {
      if (s === undefined) {
        return _s;
      } else {
        return _s = s;
      }
    };
    NMIS.dataForSector = function(sectorSlug) {
      var sector;
      sector = NMIS.Sectors.pluck(sectorSlug);
      return _(data).filter(function(datum, id) {
        return datum.sector.slug === sector.slug;
      });
    };
    NMIS.dataObjForSector = function(sectorSlug) {
      var o, sector;
      sector = NMIS.Sectors.pluck(sectorSlug);
      o = {};
      _(data).each(function(datum, id) {
        if (datum.sector.slug === sector.slug) {
          return o[id] = datum;
        }
      });
      return o;
    };
    return NMIS.data = function() {
      return data;
    };
  })();

  (function() {
    /*
      the internal "value" function takes a value and returns a 1-2 item list:
      The second returned item (when present) is a class name that should be added
      to the display element.
    
        examples:
      
        value(null)
        //  ["--", "val-null"]
      
        value(0)
        //  ["0"]
      
        value(true)
        //  ["Yes"]
    */

    var DisplayValue, round_down, value;
    value = function(v) {
      var r;
      r = [v];
      if (v === undefined) {
        r = ["&mdash;", "val-undefined"];
      } else if (v === null) {
        r = ["null", "val-null"];
      } else if (v === true) {
        r = ["Yes"];
      } else if (v === false) {
        r = ["No"];
      } else if (!isNaN(+v)) {
        r = [round_down(v)];
      } else if ($.type(v) === "string") {
        r = [NMIS.HackCaps(v)];
      }
      return r;
    };
    /*
      The main function, "NMIS.DisplayValue" receives an element
      and displays the appropriate value.
    */

    DisplayValue = function(d, element) {
      var res;
      res = value(d);
      if (res[1] != null) {
        element.addClass(res[1]);
      }
      element.html(res[0]);
      return element;
    };
    DisplayValue.raw = value;
    DisplayValue.special = function(v, indicator) {
      var classes, o, r;
      r = value(v);
      o = {
        name: indicator.name,
        classes: "",
        value: r[0]
      };
      classes = "";
      if (indicator.display_style === "checkmark_true") {
        classes = "label ";
        if (v === true) {
          classes += "chk-yes";
        } else if (v === false) {
          classes += "chk-no";
        } else {
          classes += "chk-null";
        }
      } else if (indicator.display_style === "checkmark_false") {
        classes = "label ";
        if (v === true) {
          classes += "chk-no";
        } else if (v === false) {
          classes += "chk-yes";
        } else {
          classes += "chk-null";
        }
      }
      o.classes = classes;
      return o;
    };
    DisplayValue.inTdElem = function(facility, indicator, elem) {
      var c, chkN, chkY, oclasses, vv;
      vv = facility[indicator.slug];
      c = value(vv);
      chkY = indicator.display_style === "checkmark_true";
      chkN = indicator.display_style === "checkmark_false";
      if (chkY || chkN) {
        oclasses = "label ";
        if ($.type(vv) === "boolean") {
          if (vv) {
            oclasses += (chkY ? "chk-yes" : "chk-no");
          } else {
            oclasses += (chkY ? "chk-no" : "chk-yes");
          }
        } else {
          oclasses += "chk-null";
        }
        c[0] = $("<span />").addClass(oclasses).html(c[0]);
      }
      return elem.html(c[0]);
    };
    round_down = function(v, decimals) {
      var d;
      if (decimals == null) {
        decimals = 2;
      }
      d = Math.pow(10, decimals);
      return Math.floor(v * d) / d;
    };
    return NMIS.DisplayValue = DisplayValue;
  })();

  error = function(message, opts) {
    if (opts == null) {
      opts = {};
    }
    return log.error(message);
  };

  NMIS.error = error;

}).call(this);

/*
I'm moving modules into this file wrapped in "do ->" (self-executing functions)
until they play well together (and I ensure they don't over-depend on other modules.)
..doing this instead of splitting them into individual files.
*/


(function() {

  (function() {
    var Breadcrumb;
    Breadcrumb = (function() {
      var clear, context, draw, elem, init, levels, setLevel, setLevels;
      levels = [];
      elem = false;
      context = {};
      init = function(_elem, opts) {
        if (opts == null) {
          opts = {};
        }
        elem = $(_elem).eq(0);
        if (opts.draw == null) {
          opts.draw = true;
        }
        if (opts.levels != null) {
          setLevels(opts.levels, false);
        }
        if (!!opts.draw) {
          return draw();
        }
      };
      clear = function() {
        if (elem) {
          elem.empty();
        }
        return levels = [];
      };
      setLevels = function(new_levels, needs_draw) {
        var i, level, _i, _len;
        if (new_levels == null) {
          new_levels = [];
        }
        if (needs_draw == null) {
          needs_draw = true;
        }
        for (i = _i = 0, _len = new_levels.length; _i < _len; i = ++_i) {
          level = new_levels[i];
          if (level != null) {
            levels[i] = level;
          }
        }
        if (needs_draw) {
          draw();
        }
        return context;
      };
      setLevel = function(ln, d) {
        levels[ln] = d;
        return context;
      };
      draw = function() {
        var a, fn, href, i, splitter, txt, _i, _len, _ref;
        if (elem == null) {
          throw new Error("Breadcrumb: elem is undefined");
        }
        elem.empty();
        splitter = $("<span>").text("/");
        for (i = _i = 0, _len = levels.length; _i < _len; i = ++_i) {
          _ref = levels[i], txt = _ref[0], href = _ref[1], fn = _ref[2];
          if (i !== 0) {
            splitter.clone().appendTo(elem);
          }
          a = $("<a>").text(txt).attr("href", href);
          if (fn != null) {
            a.click(fn);
          }
          a.appendTo(elem);
        }
        return elem;
      };
      return {
        init: init,
        setLevels: setLevels,
        setLevel: setLevel,
        draw: draw,
        _levels: function() {
          return levels;
        },
        clear: clear
      };
    })();
    return NMIS.Breadcrumb = Breadcrumb;
  })();

  (function() {
    return NMIS.S3Photos = (function() {
      var s3Root;
      s3Root = "http://nmisstatic.s3.amazonaws.com/facimg";
      return {
        url: function(s3id, size) {
          var code, id, _ref;
          if (size == null) {
            size = 0;
          }
          _ref = s3id.split(":"), code = _ref[0], id = _ref[1];
          return "" + s3Root + "/" + code + "/" + size + "/" + id + ".jpg";
        }
      };
    })();
  })();

  (function() {
    var capitalize;
    capitalize = function(str) {
      if (!str) {
        return "";
      } else {
        return str[0].toUpperCase() + str.slice(1);
      }
    };
    return NMIS.HackCaps = function(str) {
      var output, section, _i, _len, _ref;
      if ($.type(str) === "string") {
        output = [];
        _ref = str.split("_");
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          section = _ref[_i];
          output.push(capitalize(section));
        }
        return output.join(' ');
      } else {
        return str;
      }
    };
  })();

  (function() {
    return NMIS.MapMgr = (function() {
      var addLoadCallback, callbackStr, clear, elem, fakse, finished, init, isLoaded, loadCallbacks, loaded, mapLoadFn, mapboxLayer, opts, started;
      opts = {};
      started = false;
      finished = false;
      callbackStr = "NMIS.MapMgr.loaded";
      elem = false;
      fakse = false;
      loadCallbacks = [];
      mapLoadFn = function() {
        return $.getScript("http://maps.googleapis.com/maps/api/js?sensor=false&callback=" + callbackStr);
      };
      addLoadCallback = function(cb) {
        return loadCallbacks.push(cb);
      };
      isLoaded = function() {
        return finished;
      };
      clear = function() {
        return started = finished = false;
      };
      loaded = function() {
        var cb, _i, _len;
        for (_i = 0, _len = loadCallbacks.length; _i < _len; _i++) {
          cb = loadCallbacks[_i];
          cb.call(opts);
        }
        loadCallbacks = [];
        return finished = true;
      };
      init = function(_opts) {
        var fake;
        if (started) {
          return true;
        }
        if (_opts !== undefined) {
          opts = _.extend({
            launch: true,
            fake: false,
            fakeDelay: 3000,
            mapLoadFn: false,
            elem: "body",
            defaultMapType: "SATELLITE",
            loadCallbacks: []
          }, _opts);
          loadCallbacks = Array.prototype.concat.apply(loadCallbacks, opts.loadCallbacks);
          fake = !!opts.fake;
          if (opts.mapLoadFn) {
            mapLoadFn = opts.mapLoadFn;
          }
        } else {
          fake = false;
        }
        started = true;
        if (!fake) {
          mapLoadFn();
        } else {
          _.delay(loaded, opts.fakeDelay);
        }
        return started;
      };
      mapboxLayer = function(options) {
        if (typeof google === "undefined") {
          throw new Error("Google Maps has not yet loaded into the page.");
        }
        return new google.maps.ImageMapType({
          getTileUrl: function(coord, z) {
            return "http://b.tiles.mapbox.com/v3/modilabs." + options.tileset + "/" + z + "/" + coord.x + "/" + coord.y + ".png?updated=1331159407403";
          },
          name: options.name,
          alt: options.name,
          tileSize: new google.maps.Size(256, 256),
          isPng: true,
          minZoom: 0,
          maxZoom: options.maxZoom || 17
        });
      };
      return {
        init: init,
        clear: clear,
        loaded: loaded,
        isLoaded: isLoaded,
        mapboxLayer: mapboxLayer,
        addLoadCallback: addLoadCallback
      };
    })();
  })();

  (function() {
    return NMIS.IconSwitcher = (function() {
      var all, allShowing, callbacks, clear, context, createAll, filterStatus, filterStatusNot, hideItem, init, iterate, mapItem, mapItems, setCallback, setVisibility, shiftStatus, showItem;
      context = {};
      callbacks = ["createMapItem", "shiftMapItemStatus", "statusShiftDone", "hideMapItem", "showMapItem", "setMapItemVisibility"];
      mapItems = {};
      init = function(_opts) {
        var items, noop;
        noop = function() {};
        items = {};
        context = _.extend({
          items: {},
          mapItem: mapItem
        }, _opts);
        return _.each(callbacks, function(cbname) {
          if (context[cbname] === undefined) {
            return context[cbname] = noop;
          }
        });
      };
      mapItem = function(id, value) {
        if (!(value != null)) {
          return mapItems[id];
        } else {
          return mapItems[id] = value;
        }
      };
      hideItem = function(item) {
        return item.hidden = true;
      };
      showItem = function(item) {
        return item.hidden = false;
      };
      setVisibility = function(item, tf) {
        if (!!tf) {
          if (!item.hidden) {
            item.hidden = true;
            context.setMapItemVisibility.call(item, false, item, context.items);
            return true;
          }
        } else {
          if (!!item.hidden) {
            item.hidden = false;
            context.setMapItemVisibility.call(item, true, item, context.items);
            return true;
          }
        }
        return false;
      };
      iterate = function(cb) {
        return _.each(context.items, function(item, id, itemset) {
          return cb.apply(context, [item, id, itemset]);
        });
      };
      shiftStatus = function(fn) {
        iterate(function(item, id) {
          var status, statusChange, visChange;
          status = fn.call(context, id, item, context.items);
          visChange = setVisibility(item, status === false);
          statusChange = false;
          if (status === undefined) {

          } else if (status === false) {
            item.status = undefined;
          } else if (item.status !== status) {
            item._prevStatus = status;
            item.status = status;
            statusChange = true;
          }
          if (statusChange || visChange) {
            return context.shiftMapItemStatus(item, id);
          }
        });
        return context.statusShiftDone();
      };
      all = function() {
        return _.values(context.items);
      };
      setCallback = function(cbName, cb) {
        if (callbacks.indexOf(cbName) !== -1) {
          return context[cbName] = cb;
        }
      };
      filterStatus = function(status) {
        return _.filter(context.items, function(item) {
          return item.status === status;
        });
      };
      filterStatusNot = function(status) {
        return _.filter(context.items, function(item) {
          return item.status !== status;
        });
      };
      allShowing = function() {
        return filterStatusNot(undefined);
      };
      createAll = function() {
        return iterate(context.createMapItem);
      };
      clear = function() {
        log("Clearing IconSwitcher");
        return context = {};
      };
      return {
        init: init,
        clear: clear,
        allShowing: allShowing,
        createAll: createAll,
        filterStatus: filterStatus,
        filterStatusNot: filterStatusNot,
        all: all,
        setCallback: setCallback,
        shiftStatus: shiftStatus,
        iterate: iterate
      };
    })();
  })();

  (function() {
    return NMIS.FacilitySelector = (function() {
      var activate, active, deselect, isActive;
      active = false;
      isActive = function() {
        return active;
      };
      activate = function(params) {
        var fId, facility, key, val, _ref;
        fId = params.id;
        NMIS.IconSwitcher.shiftStatus(function(id, item) {
          if (id !== fId) {
            return "background";
          } else {
            active = true;
            return "normal";
          }
        });
        facility = false;
        _ref = NMIS.data();
        for (key in _ref) {
          val = _ref[key];
          if (key === params.id) {
            facility = val;
          }
        }
        return NMIS.FacilityPopup(facility);
      };
      deselect = function() {
        var sector;
        if (active) {
          sector = NMIS.activeSector();
          NMIS.IconSwitcher.shiftStatus(function(id, item) {
            if (item.sector === sector) {
              return "normal";
            } else {
              return "background";
            }
          });
          active = false;
          return dashboard.setLocation(NMIS.urlFor(NMIS.Env.extend({
            facilityId: false
          })));
        }
      };
      return {
        activate: activate,
        isActive: isActive,
        deselect: deselect
      };
    })();
  })();

  (function() {
    return NMIS.DataLoader = (function() {
      var fetch, fetchLocalStorage;
      fetchLocalStorage = function(url) {
        var data, p, stringData;
        p = void 0;
        data = void 0;
        stringData = localStorage.getItem(url);
        if (stringData) {
          data = JSON.parse(stringData);
          $.getJSON(url).then(function(d) {
            localStorage.removeItem(url);
            return localStorage.setItem(url, JSON.stringify(d));
          });
          return $.Deferred().resolve([data]);
        } else {
          p = new $.Deferred();
          $.getJSON(url).then(function(d) {
            localStorage.setItem(url, JSON.stringify(d));
            return p.resolve([d]);
          });
          return p.promise();
        }
      };
      fetch = function(url) {
        return $.getJSON(url);
      };
      return {
        fetch: fetch
      };
    })();
  })();

  (function() {
    return NMIS.LocalNav = (function() {
      var buttonSections, clear, displaySubmenu, elem, getNavLink, hideSubmenu, init, iterate, markActive, opts, submenu, wrap;
      elem = void 0;
      wrap = void 0;
      opts = void 0;
      buttonSections = {};
      submenu = void 0;
      init = function(selector, _opts) {
        wrap = $(selector);
        opts = _.extend({
          sections: []
        }, _opts);
        elem = $("<ul />", {
          id: "local-nav",
          "class": "nav"
        });
        wrap = $("<div />", {
          "class": "row ln-wrap"
        }).css({
          position: "absolute",
          top: 82,
          left: 56,
          "z-index": 99
        }).html(elem);
        $(".content").eq(0).prepend(wrap);
        _.each(opts.sections, function(section, i) {
          if (i !== 0) {
            $("<li />", {
              "class": "small spacer"
            }).html("&nbsp;").appendTo(elem);
          }
          return _.each(section, function(arr) {
            var a, code;
            code = arr[0].split(":");
            if (buttonSections[code[0]] === undefined) {
              buttonSections[code[0]] = {};
            }
            a = $("<a />", {
              href: arr[2],
              text: arr[1]
            });
            buttonSections[code[0]][code[1]] = a;
            return $("<li />").html(a).appendTo(elem);
          });
        });
        return submenu = $("<ul />").addClass("submenu").appendTo(elem);
      };
      getNavLink = function(code) {
        var name, section, _x;
        _x = code.split(":");
        section = _x[0];
        name = _x[1];
        return buttonSections[section][name];
      };
      markActive = function(codesArray) {
        wrap.find(".active").removeClass("active");
        return _.each(codesArray, function(code) {
          return getNavLink(code).parents("li").eq(0).addClass("active");
        });
      };
      clear = function() {
        wrap.empty();
        wrap = undefined;
        elem = undefined;
        buttonSections = {};
        return submenu = undefined;
      };
      hideSubmenu = function() {
        return submenu.hide();
      };
      displaySubmenu = function(nlcode, a, _opts) {
        var lpos, navLink;
        navLink = getNavLink(nlcode);
        lpos = navLink.parents("li").eq(0).position().left;
        submenu.hide().empty().css({
          left: lpos
        });
        _.each(a, function(aa) {
          return $("<li />").html($("<a />", {
            text: aa[0],
            href: aa[1]
          })).appendTo(submenu);
        });
        return submenu.show();
      };
      iterate = function(cb) {
        return _.each(buttonSections, function(buttons, sectionName) {
          return _.each(buttons, function(button, buttonName) {
            return cb.apply(this, [sectionName, buttonName, button]);
          });
        });
      };
      return {
        init: init,
        clear: clear,
        iterate: iterate,
        displaySubmenu: displaySubmenu,
        hideSubmenu: hideSubmenu,
        markActive: markActive
      };
    })();
  })();

  (function() {
    return NMIS.Tabulation = (function() {
      var filterBySector, init, sectorSlug, sectorSlugAsArray;
      init = function() {
        return true;
      };
      filterBySector = function(sector) {
        sector = NMIS.Sectors.pluck(sector);
        return _.filter(NMIS.data(), function(d) {
          return d.sector === sector;
        });
      };
      sectorSlug = function(sector, slug, keys) {
        var occurrences, values;
        occurrences = {};
        values = _(filterBySector(sector)).chain().pluck(slug).map(function(v) {
          return "" + v;
        }).value();
        if (keys === undefined) {
          keys = _.uniq(values).sort();
        }
        _.each(keys, function(key) {
          return occurrences[key] = 0;
        });
        _.each(values, function(d) {
          if (occurrences[d] !== undefined) {
            return occurrences[d]++;
          }
        });
        return occurrences;
      };
      sectorSlugAsArray = function(sector, slug, keys) {
        var occurrences;
        occurrences = sectorSlug.apply(this, arguments);
        if (keys === undefined) {
          keys = _.keys(occurrences).sort();
        }
        return _(keys).map(function(key) {
          return {
            occurrences: "" + key,
            value: occurrences[key]
          };
        });
      };
      return {
        init: init,
        sectorSlug: sectorSlug,
        sectorSlugAsArray: sectorSlugAsArray
      };
    })();
  })();

  (function() {
    return NMIS.Env = (function() {
      var env, env_accessor, get_env, set_env;
      env = false;
      env_accessor = function(arg) {
        if (arg != null) {
          return set_env(arg);
        } else {
          return get_env();
        }
      };
      get_env = function() {
        if (!env) {
          throw new Error("NMIS.Env is not set");
        }
        return _.extend({}, env);
      };
      set_env = function(_env) {
        return env = _.extend({}, _env);
      };
      env_accessor.extend = function(o) {
        return _.extend(get_env(), o);
      };
      return env_accessor;
    })();
  })();

  (function() {
    return NMIS.DisplayWindow = (function() {
      var addCallback, addTitle, clear, createHeaderBar, curSize, curTitle, elem, elem0, elem1, elem1content, elem1contentHeight, fullHeight, getElems, hbuttons, init, opts, resized, resizerSet, setBarHeight, setDWHeight, setSize, setTitle, setVisibility, showTitle, titleElems, visible;
      elem = void 0;
      elem1 = void 0;
      elem0 = void 0;
      elem1content = void 0;
      opts = void 0;
      visible = void 0;
      hbuttons = void 0;
      titleElems = {};
      curSize = void 0;
      resizerSet = void 0;
      resized = void 0;
      curTitle = void 0;
      init = function(_elem, _opts) {
        if (opts !== undefined) {
          clear();
        }
        if (!resizerSet) {
          resizerSet = true;
          $(window).resize(resized);
        }
        elem = $("<div />").appendTo($(_elem));
        opts = _.extend({
          height: 100,
          clickSizes: [["full", "Table Only"], ["middle", "Split"], ["minimized", "Map Only"]],
          size: "middle",
          sizeCookie: false,
          callbacks: {},
          visible: false,
          heights: {
            full: Infinity,
            middle: 280,
            minimized: 46
          },
          allowHide: true,
          padding: 10
        }, _opts);
        elem0 = $("<div />").addClass("elem0").appendTo(elem);
        elem1 = $("<div />").addClass("elem1").appendTo(elem);
        visible = !!opts.visible;
        setVisibility(visible, false);
        if (opts.sizeCookie) {
          opts.size = $.cookie("displayWindowSize") || opts.size;
        }
        elem.addClass("display-window-wrap");
        elem1.addClass("display-window-content");
        createHeaderBar().appendTo(elem1);
        elem1content = $("<div />").addClass("elem1-content").appendTo(elem1);
        return setSize(opts.size);
      };
      setDWHeight = function(height) {
        if (height === undefined) {
          height = "auto";
        } else {
          if (height === "calculate") {
            height = fullHeight();
          }
        }
        elem.height(height);
        return elem0.height(height);
      };
      setTitle = function(t, tt) {
        _.each(titleElems, function(e) {
          return e.text(t);
        });
        if (tt !== undefined) {
          return $("head title").text("NMIS: " + tt);
        } else {
          return $("head title").text("NMIS: " + t);
        }
      };
      showTitle = function(i) {
        curTitle = i;
        return _.each(titleElems, function(e, key) {
          if (key === i) {
            return e.show();
          } else {
            return e.hide();
          }
        });
      };
      addCallback = function(cbname, cb) {
        if (opts.callbacks[cbname] === undefined) {
          opts.callbacks[cbname] = [];
        }
        return opts.callbacks[cbname].push(cb);
      };
      setBarHeight = function(h, animate, cb) {
        if (animate) {
          return elem1.animate({
            height: h
          }, {
            duration: 200,
            complete: cb
          });
        } else {
          elem1.css({
            height: h
          });
          return (cb || function() {})();
        }
      };
      setSize = function(_size, animate) {
        var size;
        size = void 0;
        if (opts.heights[_size] !== undefined) {
          size = opts.heights[_size];
          if (size === Infinity) {
            size = fullHeight();
          }
          $.cookie("displayWindowSize", _size);
          setBarHeight(size, animate, function() {
            if (!!curSize) {
              elem1.removeClass("size-" + curSize);
            }
            elem1.addClass("size-" + _size);
            return curSize = _size;
          });
        }
        if (opts.callbacks[_size] !== undefined) {
          _.each(opts.callbacks[_size], function(cb) {
            return cb(animate);
          });
        }
        if (opts.callbacks.resize !== undefined) {
          _.each(opts.callbacks.resize, function(cb) {
            return cb(animate, _size, elem, elem1, elem1content);
          });
        }
        hbuttons.find(".primary").removeClass("primary");
        return hbuttons.find(".clicksize." + _size).addClass("primary");
      };
      setVisibility = function(tf) {
        var css;
        css = {};
        if (!tf) {
          css = {
            left: "1000em",
            display: "none"
          };
        } else {
          css = {
            left: "0",
            display: "block"
          };
        }
        elem0.css(css);
        return elem1.css(css);
      };
      addTitle = function(key, jqElem) {
        titleElems[key] = jqElem;
        if (curTitle === key) {
          return showTitle(key);
        }
      };
      createHeaderBar = function() {
        hbuttons = $("<span />");
        _.each(opts.clickSizes, function(sizeArr) {
          var desc, size;
          size = sizeArr[0];
          desc = sizeArr[1];
          return $("<a />").attr("class", "btn small clicksize " + size).text(desc).attr("title", desc).click(function() {
            return setSize(size, false);
          }).appendTo(hbuttons);
        });
        titleElems.bar = $("<h3 />").addClass("bar-title").hide();
        return $("<div />", {
          "class": "display-window-bar breadcrumb"
        }).css({
          margin: 0
        }).append(titleElems.bar).append(hbuttons);
      };
      clear = function() {
        elem !== undefined && elem.empty();
        return titleElems = {};
      };
      getElems = function() {
        return {
          wrap: elem,
          elem0: elem0,
          elem1: elem1,
          elem1content: elem1content
        };
      };
      fullHeight = function() {
        var oh;
        oh = 0;
        $(opts.offsetElems).each(function() {
          return oh += $(this).height();
        });
        return $(window).height() - oh - opts.padding;
      };
      elem1contentHeight = function() {
        var padding;
        padding = 30;
        return elem1.height() - hbuttons.height() - padding;
      };
      resized = _.throttle(function() {
        var fh;
        if (curSize !== "full") {
          fh = fullHeight();
          elem.stop(true, false);
          elem.animate({
            height: fh
          });
          elem0.stop(true, false);
          return elem0.animate({
            height: fh
          });
        }
      }, 1000);
      return {
        init: init,
        clear: clear,
        setSize: setSize,
        getSize: function() {
          return curSize;
        },
        setVisibility: setVisibility,
        addCallback: addCallback,
        setDWHeight: setDWHeight,
        addTitle: addTitle,
        setTitle: setTitle,
        showTitle: showTitle,
        elem1contentHeight: elem1contentHeight,
        getElems: getElems
      };
    })();
  })();

}).call(this);
(function() {
  var headers;

  headers = (function() {
    var header, nav;
    header = false;
    nav = false;
    return function(what) {
      if (what === "header") {
        if (!header) {
          return header = $('.data-src').on('click', 'a', function() {
            return false;
          });
        } else {
          return header;
        }
      } else if (what === "nav") {
        if (!nav) {
          return nav = $('.lga-nav').on('submit', 'form', function() {
            return NMIS.select_district(nav.find('select').val());
          });
        } else {
          return nav;
        }
      }
    };
  })();

  (function() {
    var display_in_header;
    display_in_header = function(s) {
      var brand, logo, title;
      title = s.title;
      $('title').html(title);
      brand = $('.brand');
      logo = brand.find('.logo').detach();
      brand.empty().append(logo).append(title);
      return headers('header').find("span").text(s.id);
    };
    return NMIS.load_schema = function(data_src) {
      var deferred, schema_url;
      schema_url = "" + data_src + "schema.json";
      deferred = new $.Deferred;
      $.getJSON("" + data_src + "schema.json", function(schema) {
        var districts_module, dname, durl, _ref;
        display_in_header(schema);
        _ref = schema.defaults;
        for (dname in _ref) {
          durl = _ref[dname];
          NMIS.ModuleFile.DEFAULT_MODULES[dname] = new NMIS.ModuleFile(durl);
        }
        if (schema.districts_json != null) {
          districts_module = new NMIS.ModuleFile(schema.districts_json);
          return districts_module.fetch().done(function(dl) {
            NMIS.load_districts(dl.groups, dl.districts);
            return deferred.resolve();
          });
        } else if ((schema.districts != null) && (schema.groups != null)) {
          NMIS.load_districts(schema.groups, schema.districts);
          return deferred.resolve();
        } else {
          return deferred.fail();
        }
      });
      return deferred;
    };
  })();

  (function() {
    return NMIS.load_districts = function(group_list, district_list) {
      var already_selected, d, district, districts, get_group_by_id, group, group_names, groups, grp_details, new_select, optgroup, select_district, submit_button, _i, _j, _k, _len, _len1, _len2, _ref;
      group_names = [];
      groups = [];
      districts = [];
      get_group_by_id = function(grp_id) {
        var grp, grp_found, _i, _len;
        grp_found = false;
        for (_i = 0, _len = groups.length; _i < _len; _i++) {
          grp = groups[_i];
          if (grp.id === grp_id) {
            grp_found = grp;
          }
        }
        return grp_found;
      };
      groups = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = group_list.length; _i < _len; _i++) {
          grp_details = group_list[_i];
          _results.push(new NMIS.Group(grp_details));
        }
        return _results;
      })();
      for (_i = 0, _len = district_list.length; _i < _len; _i++) {
        district = district_list[_i];
        d = new NMIS.District(district);
        d.set_group(get_group_by_id(d.group));
        districts.push(d);
      }
      new_select = $('<select>', {
        id: 'lga-select',
        title: 'Select a district'
      });
      for (_j = 0, _len1 = groups.length; _j < _len1; _j++) {
        group = groups[_j];
        optgroup = $('<optgroup>', {
          label: group.name
        });
        _ref = group.districts;
        for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
          d = _ref[_k];
          $('<option>', d.html_params).appendTo(optgroup);
        }
        optgroup.appendTo(new_select);
      }
      /*
          We will want to hang on to these districts for later, and give them
          a nice name when we find a good home for them.
      */

      NMIS._districts_ = districts;
      NMIS._groups_ = groups;
      select_district = function(district_id) {
        /*
              this is called on form submit, for example
        */

        var existing, _l, _len3;
        existing = false;
        for (_l = 0, _len3 = districts.length; _l < _len3; _l++) {
          d = districts[_l];
          if (d.id === district_id) {
            existing = d;
          }
        }
        $.cookie("selected-district", existing ? district_id : false);
        if (existing == null) {
          return NMIS._lgaFacilitiesDataUrl_ = "" + existing.data_root + "/facilities.json";
        }
      };
      already_selected = $.cookie("selected-district");
      if (already_selected != null) {
        new_select.val(already_selected);
        select_district(already_selected);
      }
      submit_button = headers('nav').find("input[type='submit']").detach();
      headers('nav').find('form div').eq(0).empty().html(new_select).append(submit_button);
      return new_select.chosen();
    };
  })();

  NMIS.District = (function() {

    function District(d) {
      var f, _ref;
      _.extend(this, d);
      _ref = d.url_code.split("/"), this.group_slug = _ref[0], this.slug = _ref[1];
      if (this.data_modules == null) {
        this.data_modules = [];
      }
      this.module_files = (function() {
        var _i, _len, _ref1, _results;
        _ref1 = this.data_modules;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          f = _ref1[_i];
          _results.push(new NMIS.ModuleFile(f, this));
        }
        return _results;
      }).call(this);
      this.latLng = this.lat_lng;
      this.html_params = {
        text: this.label,
        value: this.id
      };
    }

    District.prototype.module_url = function(module_name) {
      return this.get_data_module(module_name).url;
    };

    District.prototype.sectors_data_loader = function() {
      var fetcher;
      fetcher = this.get_data_module("sectors").fetch();
      fetcher.done(function(s) {
        return NMIS.loadSectors(s.sectors, {
          "default": {
            name: "Overview",
            slug: "overview"
          }
        });
      });
      return fetcher;
    };

    District.prototype.get_data_module = function(module) {
      var m, match, _i, _len, _ref;
      _ref = this.module_files;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        if (m.name === module) {
          match = m;
        }
      }
      if (match == null) {
        match = NMIS.ModuleFile.DEFAULT_MODULES[module];
      }
      if (match == null) {
        throw new Error("Module not found: " + module);
      }
      return match;
    };

    District.prototype.has_data_module = function(module) {
      try {
        return !!this.get_data_module(module);
      } catch (e) {
        return false;
      }
    };

    District.prototype.set_group = function(group) {
      this.group = group;
      return this.group.add_district(this);
    };

    return District;

  })();

  NMIS.getDistrictByUrlCode = function(url_code) {
    var d, matching_district, _i, _len, _ref;
    matching_district = false;
    _ref = NMIS._districts_;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      d = _ref[_i];
      if (d.url_code === url_code) {
        matching_district = d;
      }
    }
    if (!matching_district) {
      throw new Error("District: " + url_code + " not found");
    }
    return matching_district;
  };

  NMIS.Group = (function() {

    function Group(details) {
      this.districts = [];
      this.label = details.label;
      this.id = details.id;
      this.label = this.name;
    }

    Group.prototype.add_district = function(d) {
      this.districts.push(d);
      if (this.slug == null) {
        this.slug = d.group_slug;
      }
      this.districts = this.districts.sort(function(a, b) {
        if (b != null) {
          return a.label > b.label;
        }
      });
      return true;
    };

    return Group;

  })();

  NMIS.ModuleFile = (function() {

    function ModuleFile(filename, district) {
      var devnull, mid_url, _ref;
      this.filename = filename;
      try {
        _ref = this.filename.match(/(.*)\.(json|csv)/), devnull = _ref[0], this.name = _ref[1], this.file_type = _ref[2];
      } catch (e) {
        throw new Error("Filetype not recognized: " + this.filename);
      }
      if (NMIS._data_src_root_url == null) {
        throw new Error("No data_src_root_url");
      }
      mid_url = district != null ? "" + district.data_root + "/" : "";
      this.url = "" + NMIS._data_src_root_url + mid_url + this.filename;
    }

    ModuleFile.prototype.fetch = function() {
      return NMIS.DataLoader.fetch(this.url);
    };

    return ModuleFile;

  })();

  NMIS.ModuleFile.DEFAULT_MODULES = {};

}).call(this);
(function() {

  (function() {
    return NMIS.SectorDataTable = (function() {
      var createIn, dataTableDraw, dt, getSelect, handleHeadRowClick, nullMarker, resizeColumns, setDtMaxHeight, table, tableSwitcher, _createTbody, _createThead;
      dt = void 0;
      table = void 0;
      tableSwitcher = void 0;
      createIn = function(tableWrap, env, _opts) {
        var columns, data, dataTableDraw, opts;
        opts = _.extend({
          sScrollY: 120
        }, _opts);
        data = NMIS.dataForSector(env.sector.slug);
        if (env.subsector === undefined) {
          throw new Error("Subsector is undefined");
        }
        env.subsector = env.sector.getSubsector(env.subsector.slug);
        columns = env.subsector.columns();
        if (tableSwitcher) {
          tableSwitcher.remove();
        }
        tableSwitcher = $("<select />");
        _.each(env.sector.subGroups(), function(sg) {
          return $("<option />").val(sg.slug).text(sg.name).appendTo(tableSwitcher);
        });
        table = $("<table />").addClass("facility-dt").append(_createThead(columns)).append(_createTbody(columns, data));
        tableWrap.append(table);
        dataTableDraw = function(s) {
          dt = table.dataTable({
            sScrollY: s,
            bDestroy: true,
            bScrollCollapse: false,
            bPaginate: false,
            fnDrawCallback: function() {
              var newSelectDiv, ts;
              newSelectDiv = void 0;
              ts = void 0;
              $(".dataTables_info", tableWrap).remove();
              if ($(".dtSelect", tableWrap).get(0) === undefined) {
                ts = getSelect();
                newSelectDiv = $("<div />", {
                  "class": "dataTables_filter dtSelect left"
                }).html($("<p />").text("Grouping:").append(ts));
                $(".dataTables_filter", tableWrap).parents().eq(0).prepend(newSelectDiv);
                ts.val(env.subsector.slug);
                return ts.change(function() {
                  var nextUrl, ssSlug;
                  ssSlug = $(this).val();
                  nextUrl = NMIS.urlFor(_.extend({}, env, {
                    subsector: env.sector.getSubsector(ssSlug)
                  }));
                  return dashboard.setLocation(nextUrl);
                });
              }
            }
          });
          return tableWrap;
        };
        dataTableDraw(opts.sScrollY);
        table.delegate("tr", "click", function() {
          return dashboard.setLocation(NMIS.urlFor(_.extend({}, NMIS.Env(), {
            facilityId: $(this).data("rowData")
          })));
        });
        return table;
      };
      getSelect = function() {
        return tableSwitcher.clone();
      };
      setDtMaxHeight = function(ss) {
        var h1, h2, tw;
        tw = void 0;
        h1 = void 0;
        h2 = void 0;
        tw = dataTableDraw(ss);
        h1 = $(".dataTables_scrollHead", tw).height();
        h2 = $(".dataTables_filter", tw).height();
        ss = ss - (h1 + h2);
        return dataTableDraw(ss);
      };
      handleHeadRowClick = function() {
        var column, indicatorSlug, newEnv, newUrl;
        column = $(this).data("column");
        indicatorSlug = column.slug;
        if (!!indicatorSlug) {
          newEnv = _.extend({}, NMIS.Env(), {
            indicator: indicatorSlug
          });
          if (!newEnv.subsector) {
            newEnv.subsector = _.first(newEnv.sector.subGroups());
          }
          newUrl = NMIS.urlFor(newEnv);
          return dashboard.setLocation(newUrl);
        }
      };
      _createThead = function(cols) {
        var row, startsWithType;
        row = $("<tr />");
        startsWithType = cols[0].name === "Type";
        _.each(cols, function(col, ii) {
          if (ii === 1 && !startsWithType) {
            $("<th />").text("Type").appendTo(row);
          }
          return row.append($("<th />").text(col.name).data("column", col));
        });
        row.delegate("th", "click", handleHeadRowClick);
        return $("<thead />").html(row);
      };
      nullMarker = function() {
        return $("<span />").html("&mdash;").addClass("null-marker");
      };
      resizeColumns = function() {
        if (!!dt) {
          return dt.fnAdjustColumnSizing();
        }
      };
      _createTbody = function(cols, rows) {
        var tbody;
        tbody = $("<tbody />");
        _.each(rows, function(r) {
          var row, startsWithType;
          row = $("<tr />");
          if (r._id === undefined) {
            console.error("Facility does not have '_id' defined:", r);
          } else {
            row.data("row-data", r._id);
          }
          startsWithType = cols[0].name === "Type";
          _.each(cols, function(c, ii) {
            var ftype, td, z;
            if (ii === 1 && !startsWithType) {
              ftype = r.facility_type || r.education_type || r.water_source_type || "unk";
              $("<td />").attr("title", ftype).addClass("type-icon").html($("<span />").addClass("icon").addClass(ftype).html($("<span />").text(ftype))).appendTo(row);
            }
            z = r[c.slug] || nullMarker();
            td = NMIS.DisplayValue.inTdElem(r, c, $("<td />"));
            return row.append(td);
          });
          return tbody.append(row);
        });
        return tbody;
      };
      dataTableDraw = function() {};
      return {
        createIn: createIn,
        setDtMaxHeight: setDtMaxHeight,
        getSelect: getSelect,
        resizeColumns: resizeColumns
      };
    })();
  })();

  (function() {
    return NMIS.FacilityTables = (function() {
      var classesStr, createForSector, createForSectors, div, hasClickAction, highlightColumn, sectorNav, select, _createHeadRow, _createNavigation, _createRow;
      div = void 0;
      sectorNav = void 0;
      createForSectors = function(sArr, _opts) {
        var opts;
        opts = _.extend({
          callback: function() {},
          sectorCallback: function() {},
          indicatorClickCallback: function() {}
        }, _opts);
        if (div === undefined) {
          div = $("<div />").addClass("facility-display-wrap");
        }
        div.empty();
        _.each(sArr, function(s) {
          return div.append(createForSector(s, opts));
        });
        if (opts.callback) {
          opts.callback.call(this, div);
        }
        return div;
      };
      select = function(sector, subsector) {
        var sectorElem;
        if (sectorNav !== undefined) {
          sectorNav.find("a.active").removeClass("active");
          sectorNav.find(".sub-sector-link-" + subsector.slug).addClass("active");
        }
        div.find("td, th").hide();
        sectorElem = div.find(".facility-display").filter(function() {
          return $(this).data("sector") === sector.slug;
        }).eq(0);
        return sectorElem.find(".subgroup-all, .subgroup-" + subsector.slug).show();
      };
      createForSector = function(s, opts) {
        var cols, dobj, iDiv, orderedFacilities, sector, tbody;
        tbody = $("<tbody />");
        sector = NMIS.Sectors.pluck(s);
        iDiv = $("<div />").addClass("facility-display").data("sector", sector.slug);
        cols = sector.getColumns().sort(function(a, b) {
          return a.display_order - b.display_order;
        });
        orderedFacilities = NMIS.dataForSector(sector.slug);
        dobj = NMIS.dataObjForSector(sector.slug);
        _.each(dobj, function(facility, fid) {
          return _createRow(facility, cols, fid).appendTo(tbody);
        });
        $("<table />").append(_createHeadRow(sector, cols, opts)).append(tbody).appendTo(iDiv);
        opts.sectorCallback.call(this, sector, iDiv, _createNavigation, div);
        return iDiv;
      };
      _createRow = function(facility, cols, facilityId) {
        var tr;
        tr = $("<tr />").data("facility-id", facilityId);
        _.each(cols, function(col, i) {
          var rawval, slug, val;
          slug = col.slug;
          rawval = facility[slug];
          return val = NMIS.DisplayValue(rawval, $("<td />", {
            "class": classesStr(col)
          })).appendTo(tr);
        });
        return tr;
      };
      _createNavigation = function(sector, _hrefCb) {
        var sgl, subgroups;
        sectorNav = $("<p />").addClass("facility-sectors-navigation");
        subgroups = sector.subGroups();
        sgl = subgroups.length;
        _.each(subgroups, function(sg, i) {
          var href;
          href = _hrefCb(sg);
          $("<a />", {
            href: href
          }).text(sg.name).data("subsector", sg.slug).addClass("sub-sector-link").addClass("sub-sector-link-" + sg.slug).appendTo(sectorNav);
          if (i < sgl - 1) {
            return $("<span />").text(" | ").appendTo(sectorNav);
          }
        });
        return sectorNav;
      };
      classesStr = function(col) {
        var clss;
        clss = ["data-cell"];
        _.each(col.subgroups, function(sg) {
          return clss.push("subgroup-" + sg);
        });
        return clss.join(" ");
      };
      hasClickAction = function(col, carr) {
        return !!(!!col.click_actions && col.click_actions.indexOf(col));
      };
      _createHeadRow = function(sector, cols, opts) {
        var tr;
        tr = $("<tr />");
        _.each(cols, function(col, i) {
          var th;
          th = $("<th />", {
            "class": classesStr(col)
          }).data("col", col);
          if (!!col.clickable) {
            th.html($("<a />", {
              href: "#"
            }).text(col.name).data("col", col));
          } else {
            th.text(col.name);
          }
          return th.appendTo(tr);
        });
        tr.delegate("a", "click", function(evt) {
          opts.indicatorClickCallback.call($(this).data("col"));
          return false;
        });
        return $("<thead />").html(tr);
      };
      highlightColumn = function(column, _opts) {
        var ind, table, th;
        div.find(".highlighted").removeClass("highlighted");
        th = div.find("th").filter(function() {
          return $(this).data("col").slug === column.slug;
        }).eq(0);
        table = th.parents("table").eq(0);
        ind = th.index();
        return table.find("tr").each(function() {
          return $(this).children().eq(ind).addClass("highlighted");
        });
      };
      return {
        createForSectors: createForSectors,
        highlightColumn: highlightColumn,
        select: select
      };
    })();
  })();

}).call(this);
(function() {
  var Indicator, Sector, SubSector, all, clear, defaultSector, init, pluck, sectors, slugs, validate,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty;

  sectors = null;

  defaultSector = null;

  Sector = (function() {

    function Sector(d) {
      var changed_keys, k, val;
      changed_keys = "subgroups columns default".split(' ');
      for (k in d) {
        val = d[k];
        this[__indexOf.call(changed_keys, k) >= 0 ? "_" + k : k] = val;
      }
    }

    Sector.prototype.subGroups = function() {
      if (this._subgroups != null) {
        return this._subgroups;
      } else {
        return [];
      }
    };

    Sector.prototype.subSectors = Sector.prototype.subGroups;

    Sector.prototype.getColumns = function() {
      if (!this._columns) {
        return [];
      }
      return this._columns.sort(function(a, b) {
        if (a.display_order > b.display_order) {
          return 1;
        } else {
          return -1;
        }
      });
    };

    Sector.prototype.columnsInSubGroup = function(sgSlug) {
      return _.filter(this.getColumns(), function(sg) {
        return !!_.find(sg.subgroups, function(f) {
          return f === sgSlug;
        });
      });
    };

    Sector.prototype.getIndicators = function() {
      return this._columns || [];
    };

    Sector.prototype.isDefault = function() {
      return !!this._default;
    };

    Sector.prototype.getSubsector = function(query) {
      var ss, ssI, ssL, ssSlug;
      if (!query) {
        return;
      }
      ssSlug = query.slug || query;
      ssI = 0;
      ss = this.subSectors();
      ssL = ss.length;
      while (ssI < ssL) {
        if (ss[ssI].slug === ssSlug) {
          return new SubSector(this, ss[ssI]);
        }
        ssI++;
      }
    };

    Sector.prototype.getIndicator = function(query) {
      var indicator, islug;
      if (!query) {
        return;
      }
      islug = query.slug || query;
      if ((function() {
        var _i, _len, _ref, _results;
        _ref = this.getIndicators();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          indicator = _ref[_i];
          _results.push(indicator.slug === islug);
        }
        return _results;
      }).call(this)) {
        return new Indicator(this, indicator);
      }
    };

    return Sector;

  })();

  SubSector = (function() {

    function SubSector(sector, opts) {
      var k, val;
      this.sector = sector;
      for (k in opts) {
        val = opts[k];
        this[k] = val;
      }
    }

    SubSector.prototype.columns = function() {
      var matches, t, tt, _i, _j, _len, _len1, _ref, _ref1;
      matches = [];
      _ref = this.sector.getColumns();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        t = _ref[_i];
        _ref1 = t.subgroups;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          tt = _ref1[_j];
          if (tt === this.slug) {
            matches.push(t);
          }
        }
      }
      return matches;
    };

    return SubSector;

  })();

  Indicator = (function() {

    function Indicator(sector, opts) {
      var k, val;
      this.sector = sector;
      for (k in opts) {
        if (!__hasProp.call(opts, k)) continue;
        val = opts[k];
        this[k] = val;
      }
    }

    Indicator.prototype.customIconForItem = function(item) {
      return ["" + this.iconify_png_url + item[this.slug] + ".png", 32, 24];
    };

    return Indicator;

  })();

  init = function(_sectors, opts) {
    if (!!opts && !!opts["default"]) {
      defaultSector = new Sector(_.extend(opts["default"], {
        "default": true
      }));
    }
    sectors = _(_sectors).chain().clone().map(function(s) {
      return new Sector(_.extend({}, s));
    }).value();
    return true;
  };

  clear = function() {
    return sectors = [];
  };

  pluck = function(slug) {
    return _(sectors).chain().filter(function(s) {
      return s.slug === slug;
    }).first().value() || defaultSector;
  };

  all = function() {
    return sectors;
  };

  validate = function() {
    var slugs;
    if (!sectors instanceof Array) {
      warn("Sectors must be defined as an array");
    }
    if (sectors.length === 0) {
      warn("Sectors array is empty");
    }
    _.each(sectors, function(sector) {
      if (sector.name === undefined) {
        warn("Sector name must be defined.");
      }
      if (sector.slug === undefined) {
        return warn("Sector slug must be defined.");
      }
    });
    slugs = _(sectors).pluck("slug");
    if (slugs.length !== _(slugs).uniq().length) {
      warn("Sector slugs must not be reused");
    }
    return true;
  };

  slugs = function() {
    return _.pluck(sectors, "slug");
  };

  NMIS.Sectors = {
    init: init,
    pluck: pluck,
    slugs: slugs,
    all: all,
    validate: validate,
    clear: clear
  };

}).call(this);

/*
Facilities:
*/


(function() {
  var launchFacilities, launch_facilities, prepFacilities, prepare_data_for_pie_graph, resizeDisplayWindowAndFacilityTable;

  launch_facilities = function() {
    var district, params;
    params = {};
    if (("" + window.location.search).match(/facility=(\d+)/)) {
      params.facilityId = ("" + window.location.search).match(/facility=(\d+)/)[1];
    }
    $("#conditional-content").hide();
    _.each(this.params, function(param, pname) {
      if ($.type(param) === "string" && param !== "") {
        return params[pname] = param.replace("/", "");
      }
    });
    district = NMIS.getDistrictByUrlCode("" + params.state + "/" + params.lga);
    NMIS._currentDistrict = district;
    if (params.sector === "overview") {
      params.sector = undefined;
    }
    return district.sectors_data_loader().done(function() {
      var fetchers, mod, _i, _len, _ref;
      prepFacilities(params);
      fetchers = {};
      _ref = ["facilities", "variables", "profile_data"];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mod = _ref[_i];
        fetchers[mod] = district.get_data_module(mod).fetch();
      }
      return $.when_O(fetchers).done(function(results) {
        return launchFacilities(results, params);
      });
    });
  };

  NMIS.launch_facilities = launch_facilities;

  prepFacilities = function(params) {
    var bcValues, e, facilitiesMode, lga, state;
    NMIS.DisplayWindow.setVisibility(true);
    facilitiesMode = {
      name: "Facility Detail",
      slug: "facilities"
    };
    lga = NMIS.getDistrictByUrlCode("" + params.state + "/" + params.lga);
    state = lga.group;
    e = {
      state: state,
      lga: lga,
      mode: facilitiesMode,
      sector: NMIS.Sectors.pluck(params.sector)
    };
    e.subsector = e.sector.getSubsector(params.subsector);
    e.indicator = e.sector.getIndicator(params.indicator);
    bcValues = NMIS._prepBreadcrumbValues(e, "state lga mode sector subsector indicator".split(" "), {
      state: state,
      lga: lga
    });
    NMIS.LocalNav.markActive(["mode:facilities", "sector:" + e.sector.slug]);
    NMIS.Breadcrumb.clear();
    NMIS.Breadcrumb.setLevels(bcValues);
    return NMIS.LocalNav.iterate(function(sectionType, buttonName, a) {
      var env;
      env = _.extend({}, e, {
        subsector: false
      });
      env[sectionType] = buttonName;
      return a.attr("href", NMIS.urlFor(env));
    });
  };

  this.mustachify = function(id, obj) {
    return Mustache.to_html($("#" + id).eq(0).html().replace(/<{/g, "{{").replace(/\}>/g, "}}"), obj);
  };

  resizeDisplayWindowAndFacilityTable = function() {
    var ah, bar, cf;
    ah = NMIS._wElems.elem1.height();
    bar = $(".display-window-bar", NMIS._wElems.elem1).outerHeight();
    cf = $(".clearfix", NMIS._wElems.elem1).eq(0).height();
    return NMIS.SectorDataTable.setDtMaxHeight(ah - bar - cf - 18);
  };

  /*
  The beast: launchFacilities--
  */


  launchFacilities = function(results, params) {
    var MapMgr_opts, createFacilitiesMap, dTableHeight, displayTitle, e, facilities, lga, mapZoom, obj, profileData, sector, sectors, state, tableElem, twrap, variableData;
    facilities = results.facilities;
    variableData = results.variables;
    profileData = results.profile_data.profile_data;
    lga = NMIS._currentDistrict;
    state = NMIS._currentDistrict.group;
    createFacilitiesMap = function() {
      var bounds, facilitiesMap, iconURLData, ll, mapClick, markerClick, markerMouseout, markerMouseover;
      iconURLData = function(item) {
        var sectorIconURL, slug, status;
        sectorIconURL = function(slug, status) {
          var iconFiles;
          iconFiles = {
            education: "education.png",
            health: "health.png",
            water: "water.png",
            "default": "book_green_wb.png"
          };
          return "./images/icons_f/" + status + "_" + (iconFiles[slug] || iconFiles["default"]);
        };
        slug = void 0;
        status = item.status;
        if (status === "custom") {
          return item._custom_png_data;
        }
        slug = item.iconSlug || item.sector.slug;
        return [sectorIconURL(slug, status), 32, 24];
      };
      markerClick = function() {
        var sslug;
        sslug = NMIS.activeSector().slug;
        if (sslug === this.nmis.item.sector.slug || sslug === "overview") {
          return dashboard.setLocation(NMIS.urlFor(_.extend(NMIS.Env(), {
            facilityId: this.nmis.id
          })));
        }
      };
      markerMouseover = function() {
        var sslug;
        sslug = NMIS.activeSector().slug;
        if (this.nmis.item.sector.slug === sslug || sslug === "overview") {
          return NMIS.FacilityHover.show(this);
        }
      };
      markerMouseout = function() {
        return NMIS.FacilityHover.hide();
      };
      mapClick = function() {
        if (NMIS.FacilitySelector.isActive()) {
          NMIS.FacilitySelector.deselect();
          return dashboard.setLocation(NMIS.urlFor(_.extend(NMIS.Env(), {
            facilityId: false
          })));
        }
      };
      ll = _.map(lga.lat_lng.split(","), function(x) {
        return +x;
      });
      if (!!facilitiesMap) {
        _.delay((function() {
          if (lga.bounds) {
            facilitiesMap.fitBounds(lga.bounds);
          } else {
            facilitiesMap.setCenter(new google.maps.LatLng(ll[0], ll[1]));
          }
          return google.maps.event.trigger(facilitiesMap, "resize");
        }), 1);
        return;
      } else {
        facilitiesMap = new google.maps.Map(NMIS._wElems.elem0.get(0), {
          zoom: mapZoom,
          center: new google.maps.LatLng(ll[0], ll[1]),
          streetViewControl: false,
          panControl: false,
          mapTypeControlOptions: {
            mapTypeIds: ["roadmap", "satellite", "terrain", "OSM"]
          },
          mapTypeId: google.maps.MapTypeId["SATELLITE"]
        });
        facilitiesMap.overlayMapTypes.insertAt(0, NMIS.MapMgr.mapboxLayer({
          tileset: "nigeria_overlays_white",
          name: "Nigeria"
        }));
      }
      facilitiesMap.mapTypes.set("OSM", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
          return "http://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OSM",
        maxZoom: 18
      }));
      bounds = new google.maps.LatLngBounds();
      google.maps.event.addListener(facilitiesMap, "click", mapClick);
      NMIS.IconSwitcher.setCallback("createMapItem", function(item, id, itemList) {
        var $gm, iconData, iconDataForItem, mI;
        if (!!item._ll && !this.mapItem(id)) {
          $gm = google.maps;
          iconData = (iconDataForItem = function(i) {
            var td;
            i.iconSlug = i.iconType || i.sector.slug;
            td = iconURLData(i);
            return {
              url: td[0],
              size: new $gm.Size(td[1], td[2])
            };
          })(item);
          mI = {
            latlng: new $gm.LatLng(item._ll[0], item._ll[1]),
            icon: new $gm.MarkerImage(iconData.url, iconData.size)
          };
          mI.marker = new $gm.Marker({
            position: mI.latlng,
            map: facilitiesMap,
            icon: mI.icon
          });
          mI.marker.setZIndex((item.status === "normal" ? 99 : 11));
          mI.marker.nmis = {
            item: item,
            id: id
          };
          google.maps.event.addListener(mI.marker, "click", markerClick);
          google.maps.event.addListener(mI.marker, "mouseover", markerMouseover);
          google.maps.event.addListener(mI.marker, "mouseout", markerMouseout);
          bounds.extend(mI.latlng);
          return this.mapItem(id, mI);
        }
      });
      NMIS.IconSwitcher.createAll();
      lga.bounds = bounds;
      _.delay((function() {
        google.maps.event.trigger(facilitiesMap, "resize");
        return facilitiesMap.fitBounds(bounds);
      }), 1);
      return NMIS.IconSwitcher.setCallback("shiftMapItemStatus", function(item, id) {
        var icon, mapItem;
        mapItem = this.mapItem(id);
        if (!!mapItem) {
          icon = mapItem.marker.getIcon();
          icon.url = iconURLData(item)[0];
          return mapItem.marker.setIcon(icon);
        }
      });
    };
    sectors = variableData.sectors;
    sector = NMIS.Sectors.pluck(params.sector);
    e = {
      state: state,
      lga: lga,
      mode: "facilities",
      sector: sector,
      subsector: sector.getSubsector(params.subsector),
      indicator: sector.getIndicator(params.indicator),
      facilityId: params.facilityId
    };
    dTableHeight = void 0;
    NMIS.Env(e);
    NMIS.activeSector(sector);
    NMIS.loadFacilities(facilities);
    if (e.sector !== undefined && e.subsector === undefined) {
      e.subsector = _.first(e.sector.subGroups());
      e.subsectorUndefined = true;
    }
    MapMgr_opts = {
      elem: NMIS._wElems.elem0
    };
    mapZoom = 8;
    if (NMIS.MapMgr.isLoaded()) {
      createFacilitiesMap();
    } else {
      NMIS.MapMgr.addLoadCallback(createFacilitiesMap);
      NMIS.MapMgr.init();
    }
    if (window.dwResizeSet === undefined) {
      window.dwResizeSet = true;
      NMIS.DisplayWindow.addCallback("resize", function(tf, size) {
        if (size === "middle" || size === "full") {
          return resizeDisplayWindowAndFacilityTable();
        }
      });
    }
    NMIS.DisplayWindow.setDWHeight("calculate");
    if (e.sector.slug === "overview") {
      NMIS._wElems.elem1content.empty();
      displayTitle = "Facility Detail: " + lga.name + " Overview";
      NMIS.DisplayWindow.setTitle(displayTitle);
      NMIS.IconSwitcher.shiftStatus(function(id, item) {
        return "normal";
      });
      obj = {
        facCount: "15",
        lgaName: "" + lga.label + ", " + lga.group.label,
        overviewSectors: [],
        profileData: _.map(profileData, function(d) {
          var val;
          val = "";
          if (d[1] === null || d[1] === undefined) {
            val = NMIS.DisplayValue.raw("--")[0];
          } else if (d[1].value !== undefined) {
            val = NMIS.DisplayValue.raw(d[1].value)[0];
          } else {
            val = NMIS.DisplayValue.raw("--");
          }
          return {
            name: d[0],
            value: val
          };
        })
      };
      _.each(NMIS.Sectors.all(), function(s) {
        var c;
        c = 0;
        _.each(NMIS.data(), function(d) {
          if (d.sector === s) {
            return c++;
          }
        });
        return obj.overviewSectors.push({
          name: s.name,
          slug: s.slug,
          url: NMIS.urlFor(_.extend(NMIS.Env(), {
            sector: s,
            subsector: false
          })),
          counts: c
        });
      });
      NMIS._wElems.elem1content.html(mustachify("facilities-overview", obj));
    } else {
      if (!!e.subsectorUndefined || !NMIS.FacilitySelector.isActive()) {
        NMIS.IconSwitcher.shiftStatus(function(id, item) {
          if (item.sector === e.sector) {
            return "normal";
          } else {
            return "background";
          }
        });
      }
      displayTitle = "Facility Detail: " + lga.name + " " + e.sector.name;
      if (!!e.subsector) {
        NMIS.DisplayWindow.setTitle(displayTitle, displayTitle + " - " + e.subsector.name);
      }
      NMIS._wElems.elem1content.empty();
      twrap = $("<div />", {
        "class": "facility-table-wrap"
      }).append($("<div />").attr("class", "clearfix").html("&nbsp;")).appendTo(NMIS._wElems.elem1content);
      tableElem = NMIS.SectorDataTable.createIn(twrap, e, {
        sScrollY: 1000
      }).addClass("bs");
      if (!!e.indicator) {
        (function() {
          var mm;
          if (e.indicator.iconify_png_url) {
            NMIS.IconSwitcher.shiftStatus(function(id, item) {
              if (item.sector === e.sector) {
                item._custom_png_data = e.indicator.customIconForItem(item);
                return "custom";
              } else {
                return "background";
              }
            });
          }
          if (e.indicator.click_actions.length === 0) {
            return;
          }
          $(".indicator-feature").remove();
          obj = _.extend({}, e.indicator);
          mm = $(mustachify("indicator-feature", obj));
          mm.find("a.close").click(function() {
            var xx;
            xx = NMIS.urlFor(_.extend({}, e, {
              indicator: false
            }));
            dashboard.setLocation(xx);
            return false;
          });
          mm.prependTo(NMIS._wElems.elem1content);
          return (function(pcWrap) {
            var column, pieChartDisplayDefinitions, piechartFalse, piechartTrue, tabulations;
            sector = e.sector;
            column = e.indicator;
            piechartTrue = _.include(column.click_actions, "piechart_true");
            piechartFalse = _.include(column.click_actions, "piechart_false");
            pieChartDisplayDefinitions = void 0;
            if (piechartTrue) {
              pieChartDisplayDefinitions = [
                {
                  legend: "No",
                  color: "#ff5555",
                  key: "false"
                }, {
                  legend: "Yes",
                  color: "#21c406",
                  key: "true"
                }, {
                  legend: "Undefined",
                  color: "#999",
                  key: "undefined"
                }
              ];
            } else if (piechartFalse) {
              pieChartDisplayDefinitions = [
                {
                  legend: "Yes",
                  color: "#ff5555",
                  key: "true"
                }, {
                  legend: "No",
                  color: "#21c406",
                  key: "false"
                }, {
                  legend: "Undefined",
                  color: "#999",
                  key: "undefined"
                }
              ];
            }
            if (!!pieChartDisplayDefinitions) {
              tabulations = NMIS.Tabulation.sectorSlug(sector.slug, column.slug, "true false undefined".split(" "));
              return prepare_data_for_pie_graph(pcWrap, pieChartDisplayDefinitions, tabulations, {});
            }
          })(mm.find(".raph-circle").get(0));
        })();
      }
    }
    resizeDisplayWindowAndFacilityTable();
    if (!!e.facilityId) {
      return NMIS.FacilitySelector.activate({
        id: e.facilityId
      });
    }
  };

  prepare_data_for_pie_graph = function(pieWrap, legend, data, _opts) {
    /*
      creates a graph with some default options.
      if we want to customize stuff (ie. have behavior that changes based on
      different input) then we should work it into the "_opts" parameter.
    */

    var colors, defaultOpts, gid, hover_off, hover_on, item, opts, pie, pvals, r, rearranged_vals, values, _i, _len;
    gid = $(pieWrap).get(0).id;
    if (!gid) {
      $(pieWrap).attr("id", "pie-wrap");
      gid = "pie-wrap";
    }
    defaultOpts = {
      x: 50,
      y: 40,
      r: 35,
      font: "12px 'Fontin Sans', Fontin-Sans, sans-serif"
    };
    opts = $.extend({}, defaultOpts, _opts);
    rearranged_vals = $.map(legend, function(val) {
      return $.extend(val, {
        value: data[val.key]
      });
    });
    values = [];
    colors = [];
    legend = [];
    rearranged_vals.sort(function(a, b) {
      return b.value - a.value;
    });
    for (_i = 0, _len = rearranged_vals.length; _i < _len; _i++) {
      item = rearranged_vals[_i];
      if (item.value > 0) {
        values.push(item.value);
        colors.push(item.color);
        legend.push("%% - " + item.legend + " (##)");
      }
    }
    pvals = {
      values: values,
      colors: colors,
      legend: legend
    };
    /*
      NOTE: hack to get around a graphael bug!
      if there is only one color the chart will
      use the default value (Raphael.fn.g.colors[0])
      here, we will set it to whatever the highest
      value that we have is
    */

    Raphael.fn.g.colors[0] = pvals.colors[0];
    r = Raphael(gid);
    r.g.txtattr.font = opts.font;
    pie = r.g.piechart(opts.x, opts.y, opts.r, pvals.values, {
      colors: pvals.colors,
      legend: pvals.legend,
      legendpos: "east"
    });
    hover_on = function() {
      this.sector.stop();
      this.sector.scale(1.1, 1.1, this.cx, this.cy);
      if (this.label) {
        this.label[0].stop();
        this.label[0].scale(1.4);
        return this.label[1].attr({
          "font-weight": 800
        });
      }
    };
    hover_off = function() {
      this.sector.animate({
        scale: [1, 1, this.cx, this.cy]
      }, 500, "bounce");
      if (this.label) {
        this.label[0].animate({
          scale: 1
        }, 500, "bounce");
        return this.label[1].attr({
          "font-weight": 400
        });
      }
    };
    pie.hover(hover_on, hover_off);
    return r;
  };

}).call(this);
(function() {
  var FacilityHover, _getNameFromFacility;

  _getNameFromFacility = function(f) {
    return f.name || f.facility_name || f.school_name;
  };

  FacilityHover = (function() {
    var getPixelOffset, hide, hoverOverlay, hoverOverlayWrap, show, wh;
    getPixelOffset = function(marker, map) {
      var nw, pixelOffset, scale, worldCoordinate, worldCoordinateNW;
      scale = Math.pow(2, map.getZoom());
      nw = new google.maps.LatLng(map.getBounds().getNorthEast().lat(), map.getBounds().getSouthWest().lng());
      worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
      worldCoordinate = map.getProjection().fromLatLngToPoint(marker.getPosition());
      return pixelOffset = new google.maps.Point(Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale), Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale));
    };
    show = function(marker, opts) {
      var hoverOverlay, hoverOverlayWrap, img, map, obj;
      if (opts === undefined) {
        opts = {};
      }
      map = marker.map;
      if (!opts.insertBefore) {
        opts.insertBefore = map.getDiv();
      }
      if (!hoverOverlayWrap) {
        hoverOverlayWrap = $("<div />").addClass("hover-overlay-wrap");
        hoverOverlayWrap.insertBefore(opts.insertBefore);
      }
      if (!opts.pOffset) {
        opts.pOffset = getPixelOffset(marker, map);
      }
      if (!opts.item) {
        opts.item = marker.nmis.item;
      }
      if (!opts.item.s3_photo_id) {
        opts.item.s3_photo_id = "none:none";
      }
      obj = {
        top: opts.pOffset.y + 10,
        left: opts.pOffset.x - 25,
        arrowLeft: 22,
        name: _getNameFromFacility(opts.item),
        community: opts.item.community,
        title: opts.item.id,
        img_thumb: NMIS.S3Photos.url(opts.item.s3_photo_id, 200)
      };
      hoverOverlay = $(Mustache.to_html($("#facility-hover").eq(0).html().replace(/<{/g, "{{").replace(/\}>/g, "}}"), obj));
      if (!!opts.addClass) {
        hoverOverlay.addClass(opts.addClass);
      }
      img = $("<img />").load(function() {
        var $this;
        $this = $(this);
        if ($this.width() > $this.height()) {
          $this.width(wh);
        } else {
          $this.height(wh);
        }
        return $this.css({
          marginTop: -.5 * $this.height(),
          marginLeft: -.5 * $this.width()
        });
      }).attr("src", NMIS.S3Photos.url(opts.item.s3_photo_id, 90));
      hoverOverlay.find("div.photothumb").html(img);
      return hoverOverlayWrap.html(hoverOverlay);
    };
    hide = function(delay) {
      if (!!hoverOverlay) {
        return hoverOverlay.hide();
      }
    };
    hoverOverlayWrap = void 0;
    hoverOverlay = void 0;
    wh = 90;
    return {
      show: show,
      hide: hide
    };
  })();

  NMIS.FacilityPopup = (function() {
    var div, make;
    make = function(facility, opts) {
      var defaultSubgroup, div, obj, s, sdiv, showDataForSector, subgroups, tmplHtml;
      if (opts === undefined) {
        opts = {};
      }
      if (!!div) {
        div.remove();
      }
      obj = _.extend({
        thumbnail_url: function() {
          return NMIS.S3Photos.url(this.s3_photo_id || "none1:none2", 200);
        },
        image_url: function() {
          return NMIS.S3Photos.url(this.s3_photo_id || "none1:none2", "0");
        },
        name: _getNameFromFacility(facility)
      }, facility);
      subgroups = facility.sector.subGroups();
      defaultSubgroup = subgroups[0];
      obj.sector_data = _.map(subgroups, function(o, i, arr) {
        return _.extend({}, o, {
          variables: _.map(facility.sector.columnsInSubGroup(o.slug), function(oo, ii, oiarr) {
            return NMIS.DisplayValue.special(facility[oo.slug], oo);
          })
        });
      });
      tmplHtml = $("#facility-popup").eq(0).html().replace(/<{/g, "{{").replace(/\}>/g, "}}");
      div = jQuery(Mustache.to_html(tmplHtml, obj));
      s = div.find("select");
      sdiv = div.find(".fac-content");
      showDataForSector = (function(slug) {
        return sdiv.find("> div").hide().filter(function(d, dd) {
          return $(dd).data("sectorSlug") === slug;
        }).show();
      });
      showDataForSector(defaultSubgroup.slug);
      s.change(function() {
        return showDataForSector($(this).val());
      });
      div.addClass("fac-popup");
      div.dialog({
        width: 500,
        height: 300,
        resizable: false,
        close: function() {
          return FacilitySelector.deselect();
        }
      });
      if (!!opts.addClass) {
        div.addClass(opts.addClass);
      }
      return div;
    };
    div = void 0;
    return make;
  })();

}).call(this);
(function() {
  var DisplayPanel, TmpSector, UnderscoreTemplateDisplayPanel, create_sector_panel, establish_template_display_panels, launch_summary, summaryMap, template_not_found, __display_panels, _tdps,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  NMIS.loadSummary = function(s) {
    var fetchers, initSummaryMap, lga, lga_code, state;
    lga_code = "" + s.params.state + "/" + s.params.lga;
    lga = NMIS.getDistrictByUrlCode(lga_code);
    state = lga.group;
    initSummaryMap = function() {
      var $mapDiv, ll, mapDiv, mapZoom, summaryMap;
      $mapDiv = $(".profile-box .map").eq(0);
      mapDiv = $mapDiv.get(0);
      ll = _.map(lga.latLng.split(","), function(x) {
        return +x;
      });
      mapZoom = 9;
      if (mapDiv) {
        if (!summaryMap) {
          summaryMap = new google.maps.Map(mapDiv, {
            zoom: mapZoom,
            center: new google.maps.LatLng(ll[1], ll[0]),
            streetViewControl: false,
            panControl: false,
            mapTypeControl: false,
            mapTypeId: google.maps.MapTypeId.HYBRID
          });
          summaryMap.mapTypes.set("ng_base_map", NMIS.MapMgr.mapboxLayer({
            tileset: "nigeria_base",
            name: "Nigeria"
          }));
          summaryMap.setMapTypeId("ng_base_map");
        }
        return _.delay((function() {
          google.maps.event.trigger(summaryMap, "resize");
          return summaryMap.setCenter(new google.maps.LatLng(ll[1], ll[0]), mapZoom);
        }), 1);
      }
    };
    if (NMIS.MapMgr.isLoaded()) {
      initSummaryMap();
    } else {
      NMIS.MapMgr.addLoadCallback(initSummaryMap);
      NMIS.MapMgr.init();
    }
    fetchers = {};
    if (lga.has_data_module("summary")) {
      fetchers.summary = NMIS.DataLoader.fetch(lga.module_url("summary"));
    }
    if (lga.has_data_module("summary_sectors")) {
      fetchers.summary_sectors = NMIS.DataLoader.fetch(lga.module_url("summary_sectors"));
    }
    return $.when_O(fetchers).done(function(results) {
      return launch_summary(s.params, state, lga, results);
    });
  };

  TmpSector = (function() {

    function TmpSector(s) {
      this.slug = s.id;
      this.name = s.name;
    }

    return TmpSector;

  })();

  launch_summary = function(params, state, lga, query_results) {
    var bcValues, current_sector, overviewObj, s, summary_data, summary_sectors, _env, _i, _len, _ref;
    if (query_results == null) {
      query_results = {};
    }
    summary_data = query_results.summary;
    summary_sectors = query_results.summary_sectors;
    NMIS.DisplayWindow.setVisibility(false);
    NMIS.DisplayWindow.setDWHeight();
    overviewObj = {
      name: "Overview",
      slug: "overview"
    };
    _ref = summary_data.view_details;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      s = _ref[_i];
      if (s.id === params.sector) {
        current_sector = new TmpSector(s);
      }
    }
    if (!current_sector) {
      current_sector = overviewObj;
    }
    _env = {
      mode: {
        name: "Summary",
        slug: "summary"
      },
      state: state,
      lga: lga,
      sector: current_sector
    };
    bcValues = NMIS._prepBreadcrumbValues(_env, "state lga mode sector subsector indicator".split(" "), {
      state: state,
      lga: lga
    });
    NMIS.Breadcrumb.clear();
    NMIS.Breadcrumb.setLevels(bcValues);
    NMIS.LocalNav.markActive(["mode:summary", "sector:" + _env.sector.slug]);
    NMIS.LocalNav.iterate(function(sectionType, buttonName, a) {
      var env;
      env = _.extend({}, _env);
      env[sectionType] = buttonName;
      return a.attr("href", NMIS.urlFor(env));
    });
    (function() {
      /*
          how can we do this better?
      */

      var cc_div, content_div, context, module, sector_id, sector_view_panel, sector_window, sector_window_inner_wrap, _j, _k, _len1, _len2, _ref1, _ref2;
      content_div = $('.content');
      if (content_div.find('#conditional-content').length === 0) {
        context = {};
        context.summary_data = summary_data;
        context.summary_sectors = summary_sectors;
        context.lga = lga;
        cc_div = $('<div>', {
          id: 'conditional-content'
        });
        _ref1 = summary_data.view_details;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          sector_view_panel = _ref1[_j];
          sector_window = $("<div>", {
            "class": "lga"
          });
          sector_window.html("<div class='display-window-bar breadcrumb'></div>");
          sector_window_inner_wrap = $("<div>", {
            "class": 'cwrap'
          }).appendTo(sector_window);
          sector_id = sector_view_panel.id;
          sector_window.addClass(sector_id);
          context.summary_sector = context.summary_sectors[sector_id];
          context.view_panel = sector_view_panel;
          _ref2 = sector_view_panel.modules;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            module = _ref2[_k];
            sector_window_inner_wrap.append(create_sector_panel(sector_id, module, context));
          }
          sector_window.appendTo(cc_div);
        }
        return $('.content').append(cc_div);
      }
    })();
    return (function() {
      var cc, sector;
      sector = _env.sector;
      cc = $("#conditional-content").hide();
      cc.find(">div").hide();
      cc.find(">div.lga." + sector.slug).show();
      return cc.show();
    })();
  };

  __display_panels = {};

  DisplayPanel = (function() {

    function DisplayPanel() {}

    DisplayPanel.prototype.build = function() {};

    return DisplayPanel;

  })();

  UnderscoreTemplateDisplayPanel = (function(_super) {

    __extends(UnderscoreTemplateDisplayPanel, _super);

    function UnderscoreTemplateDisplayPanel(module, elem) {
      this.template_html = elem.html();
    }

    UnderscoreTemplateDisplayPanel.prototype.build = function(elem, context) {
      if (context == null) {
        context = {};
      }
      return elem.append(_.template(this.template_html, context));
    };

    return UnderscoreTemplateDisplayPanel;

  })(DisplayPanel);

  template_not_found = function(name) {
    return "<h2>Template '" + name + "' not found</h2>";
  };

  _tdps = false;

  establish_template_display_panels = function() {
    if (!_tdps) {
      $('script.display-panel').each(function() {
        var $this, module;
        $this = $(this);
        module = $this.data('module');
        return __display_panels[module] = new UnderscoreTemplateDisplayPanel(module, $this);
      });
      return _tdps = true;
    }
  };

  create_sector_panel = function(sector_id, module, context) {
    var div, panel, _ref, _ref1;
    establish_template_display_panels();
    context.relevant_data = (_ref = context.summary_data.data) != null ? (_ref1 = _ref[sector_id]) != null ? _ref1[module] : void 0 : void 0;
    div = $('<div>');
    if (__display_panels[module] != null) {
      panel = __display_panels[module];
      panel.build(div, context);
    } else {
      div.html(template_not_found(module));
    }
    return div;
  };

  summaryMap = void 0;

}).call(this);