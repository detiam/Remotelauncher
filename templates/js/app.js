function myflaskGet(route, value) {
  if (route === 'data_get') {return '{{ url_for("data_get", filename='2543455938') }}'.replace("2543455938", value)}
  if (route === 'apps_launch') {return '{{ url_for("apps_launch", program_id='2543455938') }}'.replace("2543455938", value)}
  if (route === 'detail_page') {return '{{ url_for("detail_page", program_id='2543455938') }}'.replace("2543455938", value)}
  if (route === 'data_upload') {return '{{ url_for("data_upload", program_id='2543455938') }}'.replace("2543455938", value)}
}

function handleMenu(event) {
  if (document.title == '{{ _('Picview') }}') {
    openDetailWindow(event.target.id.match(/\d+/), 400, 600)
  } else {
    hasContextMenu = event.target.classList.contains('custom-contextmenu');
    delMenu()
    if (!hasContextMenu) {
      addMenu(event)
    }
  }
}

function detail_reload() {
  if (window.opener.document.title == '{{ _('Picview') }}') {
    window.opener.fullPicview('reload')
    console.log('reload.fullPicview()')
  } else {
    window.opener.mainHTML_reload()
  }
}

function fullPicview(useCase) {
  if (useCase === 'enterPicview') {
    // 保存原来的内容
    localStorage.setItem('scrollPosition', window.pageYOffset);
    sessionStorage.setItem('mainHTML', document.documentElement.innerHTML);
  }
  $('#mainpage').load('picview', function () {
    document.querySelector('.picview').addEventListener('click', function (e) {
      document.open();
      document.write(sessionStorage.getItem('mainHTML'));
      document.close();
    });
    // 在回调函数中对加载完成的元素进行操作
    document.querySelectorAll('.cover').forEach(function (element) {
      element.classList.add('fullpagecover');
      document.title = '{{ _('Picview') }}';
      document.querySelector('meta[name="theme-color"]').setAttribute('content', "#686868");
      const picView = document.querySelector('.picview');
      picView.style.borderRadius = '5px';
      document.body.style.backgroundColor = '#686868';
      document.body.style.margin = '1em';
    });
  });
}