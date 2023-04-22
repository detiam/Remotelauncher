const menuContext = [{
  header: "{{ _('Actions') }}"
},{
  name: "{{ _('Back to index') }}",
  iconClass: 'fa fa-camera-retro',
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
  name: "{{ _('Zoom in') }}",
  iconClass: 'fa fa-camera-retro',
  isShown: function(e) {
    if (document.title == "{{ _('Picview') }}") {
      return false;
    } else {
      return e.zoomin;
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
  name: "{{ _('Delete this') }}",
  iconClass: 'fa fa-trash',
  classNames: 'action-danger',
  onClick: function(e) {
      $.get(myflaskGet('apps_del', e.id), function(){
        if (document.title == "{{ _('Picview') }}") {
          fullPicview('reload')
          console.log('reload.fullPicview()')
        } else {
          mainHTML_reload()
        }
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
    name: function() {
        return "{{ _('Add to favorite') }}"
    },
    iconClass: 'fa fa-bookmark-o',
  },{
    name: "{{ _('Open data folder') }}",
    iconClass: 'fa fa-folder-o',
    onClick: function(e) {
      $.get(myflaskGet('api_opendir', e.id));
    }
  },{
    name: "{{ _('Modify property') }}",
    iconClass: 'fa fa-file-text-o',
    onClick: function(e) {
      openDetailWindow(e.id,400,600);
    }
  }]
}]

const flaskStr = new Map([
  ['i18n_picviewTitle', "{{ _('Picview') }}"],
]);

let flaskUrl;
if (sessionStorage.flaskUrl) {
  flaskUrl = new Map(JSON.parse(sessionStorage.flaskUrl));
} else {
  fetch('{{ url_for("api_urls") }}')
  .then(response => response.json())
  .then(data => {
    flaskUrl = new Map()
    for (const [key, value] of Object.entries(data)) {
      flaskUrl.set(key, value);
    }
    sessionStorage.flaskUrl = JSON.stringify([...flaskUrl]);
    console.log('flaskUrl fetched');
  });
}

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
