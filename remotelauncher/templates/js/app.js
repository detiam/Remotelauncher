const windows = [];
const menuContext = [{
  header: "{{ _('Actions') }}"
},{
  name: "{{ _('Start application') }}",
  iconClass: 'fa fa-cog',
  onClick: function(e) {
    launchapp(e.id)
  },
  subMenuItems:
  [{
    name: "{{ _('With achievements') }}",
    onClick: function(e) {
      launchapp(e.id, true)
    }
  },{
    name: "{{ _('Only achievements') }}",
    onClick: function(e) {
      launchapp(e.id, 'onlyAchi')
    }
  }]
},{
  name: function(e) {
    if (isfavorite(e.id)) {
      return "{{ _('Remove favorite') }}"
    } else {
      return "{{ _('Add to favorite') }}"
    }
  },
  iconClass: function(e) {
    if (isfavorite(e.id)) {
      return "fa fa-bookmark"
    } else {
      return "fa fa-bookmark-o"
    }
  },
  onClick: function(e) {
    const favoritelist = JSON.parse(localStorage.favoritelist || '{}')
    if (isfavorite(e.id)) {
      delete favoritelist[e.id]
    } else {
      favoritelist[e.id] = 'true'
    }
    favSave(favoritelist)
  }
},{
  name: "{{ _('Delete this app') }}",
  iconClass: 'fa fa-trash icon-danger',
  subMenuItems: [{
    name: "{{ _('I really want to delete this app') }}",
    classNames: 'action-danger',
    onClick: function(e) {
      if (document.title === "{{ _('Picview') }}") {
        sessionStorage.needReloadWhenGoBack = true
      }
      windows[e.id]?.close();
      $.get(flaskUrl.get("apps_del")(e.id), function(){
        delCache(flaskUrl.get("data_get")('resources/'+e.id), () => {
          $('[id$='+e.id+']').remove();
        })
      }).fail(function() {
        alert('Something went wrong.');
      });
    },
  }]
},{
  divider: true
},{
  name: "{{ _('Back to index') }}",
  iconClass: 'fa fa-arrow-left',
  isShown: function() {
    if (document.title == "{{ _('Picview') }}") {
      return true;
    } else {
      return false;
    }
  },
  onClick: function() {
    back2Mainpage()
  }
},{
  name: function(e) {
    if (e.zoomname) {
      return "{{ _('Zoom out') }}"
    } else {
      return "{{ _('Zoom in') }}"
    }
  },
  iconClass: 'fa fa-camera-retro',
  isShown: function(e) {
    if (document.title == "{{ _('Picview') }}") {
      return false;
    } else {
      return e.haszoom;
    }
  },
  onClick: function(e) {
    handleZoomin(document.getElementById(e.id.input));
  }
},{
  name: "{{ _('More Options') }}",
  iconClass: 'fa fa-bars',
  onClick: function(e) {
    windows[e.id] = openDetailWindow(e.id,400,600);
  },
  subMenuItems:
  [{
    name: "{{ _('Open app folder') }}",
    iconClass: 'fa fa-folder-o',
    onClick: function(e) {
      $.get(flaskUrl.get("api_appinfo")(e.id), function(appinfo){
        if (appinfo.workdir) {
          $.post(flaskUrl.get("api_opendir")(), {path: appinfo.workdir})
            .fail(function(jqXHR, textStatus, errorThrown) {
              alert(errorThrown+': '+textStatus+', '+jqXHR.responseText);
            })
        } else {
          alert('No working directory for this app. Please set one.')
        }
      });
    }
  },{
    name: "{{ _('Open data folder') }}",
    iconClass: 'fa fa-folder-o',
    onClick: function(e) {
      $.get(flaskUrl.get("api_openresdir")(e.id));
    }
  },{
    divider: true
  },{
    name: "{{ _('Modify property') }}",
    iconClass: 'fa fa-file-text-o',
    onClick: function(e) {
      windows[e.id] = openDetailWindow(e.id,400,600);
    }
  }]
}]

let flaskUrl;
fetch('{{ url_for("api_urls") }}')
  .then(response => response.json())
  .then(data => {
    flaskUrl = new Map(Array.from(Object.entries(data))
      .map(([key, value]) => [key, (param) => value.replace(/<.*:.*>/i, param)])
    )
  }).finally(()=>{
    if ('serviceWorker' in navigator && document.cookie.indexOf("dev"))
    {
      try {
        navigator.serviceWorker.register(flaskUrl.get("file_serviceworker")());
        navigator.serviceWorker.onmessage = event => {
          switch(event.data.type) {
            case 'reloadLang':
              caches.open(event.data.cacheName).then(function(cache) {
                event.data.filesToCache.forEach(function(cacheItem) {
                  cache.delete(cacheItem)
                })
                cache.addAll(event.data.filesToCache)
                location.reload();
              })
              break
            case 'delCache':
              const { cacheName, pathName } = event.data;
              realDelAllMatchedCache(cacheName, pathName, window.delCacheCallbackFunc);
              break
            default:
              console.log('[Service Worker] Unknown message type:', event.data.type);
            break
          }
        }
      } catch (error) {
        console.error('[Service Worker] Failed to register:', error);
      }
    }
    if (location.pathname === '/') {
      mainHTML_reload()
      Mainpage_js()
      if (localStorage.reloadLangNeeded) {
        lang_reload()
        localStorage.removeItem('reloadLangNeeded')
      }
    }
  });

const flaskStr = new Map([
  ['i18n_picviewTitle', "{{ _('Picview') }}"],
]);