const menuContext = [{
  header: "{{ _('Actions') }}"
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
  name: "{{ _('Delete this row') }}",
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
      $.get(myflaskGet('detail_folder', e.id));
    }
  },{
    name: "{{ _('Modify property') }}",
    iconClass: 'fa fa-file-text-o',
    onClick: function(e) {
      openDetailWindow(e.id,400,600);
    }
  }]
}]

function myflaskGet(route, value) {
  if (route === 'picview') {return '{{ url_for("picview") }}'}
  if (route === 'i18n_picviewTitle') {return "{{ _('Picview') }}"}
  if (route === 'data_get') {return '{{ url_for("data_get", filename="2543455938") }}'.replace("2543455938", value)}
  if (route === 'apps_del') {return '{{ url_for("apps_del", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'apps_launch') {return '{{ url_for("apps_launch", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'detail_page') {return '{{ url_for("detail_page", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'detail_folder') {return '{{ url_for("detail_folder", program_id="2543455938") }}'.replace("2543455938", value)}
  if (route === 'data_upload') {return '{{ url_for("data_upload", program_id="2543455938") }}'.replace("2543455938", value)}
}

const flaskUrl = new Map([
  ['apps_del', (value) => '{{ url_for("apps_del", program_id="2543455938") }}'.replace("2543455938", value)],
  ['apps_launch', (value) => '{{ url_for("apps_launch", program_id="2543455938") }}'.replace("2543455938", value)],
  ['data_get', (value) => '{{ url_for("data_get", filename="2543455938") }}'.replace("2543455938", value)],
  ['data_upload', (value) => '{{ url_for("data_upload", program_id="2543455938") }}'.replace("2543455938", value)],
  ['detail_folder', (value) => '{{ url_for("detail_folder", program_id="2543455938") }}'.replace("2543455938", value)],
  ['detail_page', (value) => '{{ url_for("detail_page", program_id="2543455938") }}'.replace("2543455938", value)],
  ['picview', '{{ url_for("picview") }}'],
]);

const flaskStr = new Map([
  ['i18n_picviewTitle', "{{ _('Picview') }}"],
]);