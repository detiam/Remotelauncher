const menuContext = [{
  header: "{{ _('Actions') }}"
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
    handleZoomin(document.getElementById('p-' + e.id));
  }
},{
  name: "{{ _('Start application') }}",
  iconClass: 'fa fa-cog',
  onClick: function(e) {
      $.get(myflaskGet('apps_launch', e.id));
  }
},{
  name: "{{ _('Delete this app') }}",
  iconClass: 'fa fa-trash',
  classNames: 'action-danger',
  onClick: function(e) {
    if (document.title === myflaskGet('i18n_picviewTitle')) {
      sessionStorage.needReloadWhenGoBack = true
    }
    $.get(myflaskGet('apps_del', e.id), function(){
      delCache(myflaskGet('data_get', 'resources/' + e.id), () => {
        if (document.title == "{{ _('Picview') }}") {
          fullPicview('reload')
        } else {
          mainHTML_reload()
        }
      })
    }).fail(function() {
      alert('Something went wrong.');
    });
  }
},{
  divider: true
},{
  name: "{{ _('More Options') }}",
  iconClass: 'fa fa-bars',
  subMenuItems:
  [{
    name: "{{ _('Open data folder') }}",
    iconClass: 'fa fa-folder-o',
    onClick: function(e) {
      $.get(myflaskGet('api_opendir', e.id));
    }
  },{
    name: function() {
      return "{{ _('Add to favorite') }}"
    },
    iconClass: 'fa fa-bookmark-o',
  },{
    name: "{{ _('Modify property') }}",
    iconClass: 'fa fa-file-text-o',
    onClick: function(e) {
      openDetailWindow(e.id,400,600);
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
    if ('serviceWorker' in navigator &&
        !navigator.serviceWorker.controller &&
        document.cookie.indexOf("dev"))
    {
      try {
        navigator.serviceWorker.register(flaskUrl.get("file_serviceworker")());
      } catch (error) {
        console.error('[Service Worker] Failed to register:', error);
      }
    }
  });


const flaskStr = new Map([
  ['i18n_picviewTitle', "{{ _('Picview') }}"],
]);

function myflaskGet(route, value) {
  if (route === 'html_picview') {return '{{ url_for("html_picview") }}'}
  if (route === 'html_tableview') {return '{{ url_for("html_tableview") }}'}
  if (route === 'i18n_picviewTitle') {return "{{ _('Picview') }}"}
  if (route === 'data_get') {return '{{ url_for("data_get", filename="2543455938") }}'.replace("2543455938", value)}
  if (route === 'apps_del') {return '{{ url_for("apps_del", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'apps_launch') {return '{{ url_for("apps_launch", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'page_detail') {return '{{ url_for("page_detail", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'api_opendir') {return '{{ url_for("api_opendir", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'data_upload') {return '{{ url_for("data_upload", program_id="2543455938") }}'.replace("2543455938", value)}
}
