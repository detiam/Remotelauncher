function scrollToPage(page) {
  try { window.scrollTo(0, window.localStorage.getItem(page)); }
  catch (error) { console.log('scrollToPage('+page+'): Failed! ' + error)}
}

function isfavorite(id) {
  return JSON.parse(localStorage.favoritelist || '{}')[id]
}

function openDetailWindow(id, x, y) {
  if (isNaN(id)) {
    id.preventDefault();
    var url = id.target.href;
  } else {
    var url = flaskUrl.get("page_detail")(id);
  }
  let screenWidth = window.screen.width;
  let screenHeight = window.screen.height;
  let windowWidth = x; // 新窗口的宽度
  let windowHeight = y; // 新窗口的高度
  let left = (screenWidth - windowWidth) / 2;
  let top = (screenHeight - windowHeight) / 2;
  window.open(url,
    "_blank", 'width=' + windowWidth + ',height=' +
    windowHeight + ',left=' + left + ',top=' + top +
  ',toolbar=no,addressbar=no,location=no,menubar=no');
}

function addZoominclass(elem) {
  elem.classList.add('custom-contextmenu')
  elem.setAttribute('onclick',
    'event.preventDefault(); handleZoomin(event.target)')
  $(elem).off("click")
}

function delZoominclass() {
  document.querySelectorAll('.custom-contextmenu').forEach(function (element) {
    element.classList.remove('custom-contextmenu');
    element.removeAttribute('onclick');
    $(element).on('click', e => {
      launchapp(e.target.id.match(/\d+/))
    });
  });
};

function handleZoomin(elem) {
  hasContextMenu = elem.classList.contains('custom-contextmenu');
  delZoominclass()
  if (!hasContextMenu) {
    addZoominclass(elem)
  }
}

function setCursorAndTimeout(event, timeout) {
  var element = event.target;
  // element.style.cursor = 'not-allowed';
  element.classList.add('disabled');
  setTimeout(function () {
    element.classList.remove('disabled');
    // element.style.cursor = 'pointer';
  }, timeout);
}

function handleDrop(event) {
  if (!event.dataTransfer) {return}
  event.preventDefault();
  let id = event.target.id.match(/\d+/)
  if (id === null) {id = $(event.target).closest('tr').attr('id').match(/\d+/);}
  console.log('handleDrop(): Called');
  if (event.dataTransfer.types.includes('text/uri-list')) {
    let url = event.dataTransfer.getData('text/uri-list');
    uploadUrl(url, id)
  } else if (event.dataTransfer.types.includes('Files')) {
    let file = event.dataTransfer.files[0];
    uploadFile(file, id)
  }
}

function handleUrlBox(event, id) {
  event.preventDefault();
  console.log('handleUrlBox(): Called')
  const formData = new FormData(event.target);
  window.opener.uploadUrl(formData.get('imgurl'), id)
}

async function handleFileSelect(event, id) {
  event.preventDefault();
  console.log('handleFileSelect(): Called')
  try {
    if ('showOpenFilePicker' in window) {
      // 浏览器支持showOpenFilePicker方法
      const [handle] = await window.showOpenFilePicker();
      const file = await handle.getFile();
      //const content = await file.text();
      window.opener.uploadFile(file, id)
    } else {
      console.warn('handleFileSelect(): window.showOpenFilePicker() unsupported');
      try {
        const fileInput = document.getElementById('detail-file-input')
        fileInput.click();
        fileInput.addEventListener('change', function (event) {
          window.opener.uploadFile(event.target.files[0], id);
        })
      } catch (error) {
        event.target.parentNode.classList.add('disabled');
        event.target.parentNode.setAttribute('title', "Browser unsupported")
      }
    }
  } catch (error) {
    console.log(error)
  }
}

function readFileFromFlask(route, file) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', route, true);
  xhr.responseType = 'blob';
  xhr.onload = function () {
    if (this.status == 200) {
      var blob = this.response;
      var reader = new FileReader();
      reader.onload = function (event) {
        file(event.target.result);
      }
      reader.readAsDataURL(blob)
    }
  }
  xhr.send();
}

function realDelAllMatchedCache(cacheName, pathName, callback) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      keys.forEach(key => {
        const url = new URL(key.url);
        if (location.origin === url.origin && url.pathname.startsWith(pathName)) {
          cache.delete(key).then(status => {
            console.log('delCache(): ' + key.url + ' deleted, ' + status);
          });
        };
      })
      if (typeof callback === 'function') {
        callback(cache)
      }
    });
  });
}

function delCache(pathName, callback) {
  window.delCacheCallbackFunc = callback
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'delCache',
      pathName: pathName,
    });
  } else {
    if (typeof callback === 'function') {callback()}
  }
}

function uploadUrl(url, id) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', flaskUrl.get("data_upload")(id), true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = () => {
    const route = flaskUrl.get("data_get")('resources/'+id) + '/' + xhr.response
    if (xhr.status === 201 && xhr.response === 'library.jpg') {
      delCache(route, () => { 
        readFileFromFlask(route, (content) => {
          $('img[id$="p-'+id+'"]').attr('src', content);
          console.log('uploadUrl(): new image loaded');
        });
      })
    } else if (xhr.response === 'icon.ico') {
      const imgPreview = document.getElementById('t-' + id);
      delCache(route, () => { 
        readFileFromFlask(route, (content) => {
          imgPreview.src = content;
          imgPreview.style = null;
          console.log('uploadUrl(): new icon loaded');
        });
      })
    } else {
      console.log('uploadUrl(): Failed, ' + xhr.response);
      alert('Something went wrong, check console log.')
    }
  }
  var data = JSON.stringify({ "url": url });
  console.log('uploadUrl(): ready to send url, sending')
  xhr.send(data);
}

function uploadFile(file, id) {
  let formData = new FormData();
  formData.append('file', file);
  const xhr = new XMLHttpRequest();
  xhr.open('POST', flaskUrl.get("data_upload")(id), true);
  xhr.onload = function () {
    const url = flaskUrl.get("data_get")('resources/'+id) + '/' + xhr.response
    if (xhr.status === 201 && xhr.response === 'library.jpg') {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        $('img[id$="p-'+id+'"]').attr('src', reader.result);
        console.log('uploadFile(): new image loaded');
      });
      reader.readAsDataURL(file);
    } else if (xhr.response === 'icon.ico') {
      const imgPreview = document.getElementById('t-' + id);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        imgPreview.src = reader.result;
        imgPreview.style = null;
        console.log('uploadFile(): new icon loaded');
      });
      reader.readAsDataURL(file);
    } else {
      console.log('uploadFile(): Failed, ' + xhr.response);
      alert('Something went wrong, check console log.');
      return;
    }
    delCache(url, cache => {
      if (typeof cache === 'object') {
        cache.add(url)
      }
    })
  };
  console.log('uploadFile(): ready to send file, sending')
  xhr.send(formData);
}

function launchapp(id) {
  $.get(flaskUrl.get("apps_launch")(id))
    .fail(function(jqXHR, textStatus, errorThrown) {
      alert(errorThrown+': '+textStatus+', '+jqXHR.responseText);
    })
}

function fullPicview(useCase) {
  function postTuning() {
    bsmenu_reload()
    coverhandle_reload('.custom-img')
    scrollToPage('ScrollPositionPicview')
    document.title = flaskStr.get("i18n_picviewTitle");
    document.querySelector('meta[name="theme-color"]').setAttribute('content', "#686868");
    document.querySelector('.picview').style.borderRadius = '5px';
    document.body.style.backgroundColor = '#686868';
    document.body.style.margin = '1em';
    document.querySelectorAll('.cover').forEach(function (element) {
      element.classList.add('fullpagecover');
    });
  }
  if (useCase === 'enterPicview') {
    localStorage.ScrollPositionMainpage = window.pageYOffset;
    sessionStorage.mainpageclone = $('#mainpage').html();
    sessionStorage.mainpageinfo = JSON.stringify({
      origTitle: document.title,
      origColor: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
    })
    $('#mainpage').html($('#p-icview').clone())
    postTuning()
  } else if (useCase === 'reLoad') {
    localStorage.ScrollPositionPicview = window.pageYOffset
    $('#mainpage').load(flaskUrl.get("html_picview")(), function () {
      postTuning()
    });
  }
}

async function back2Mainpage() {
  localStorage.ScrollPositionPicview = window.pageYOffset
  const mainpageinfo = JSON.parse(sessionStorage.mainpageinfo);
  $('#mainpage').html(sessionStorage.mainpageclone);
  scrollToPage('ScrollPositionMainpage');
  if (sessionStorage.needReloadWhenGoBack)
    {mainHTML_reload()} else {bsmenu_reload()};
  coverhandle_reload('.custom-img')
  Mainpage_js()
  document.body.style = '';
  document.title = mainpageinfo.origTitle;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', mainpageinfo.origColor);
  sessionStorage.removeItem('mainpageinfo');
  sessionStorage.removeItem('mainpageclone');
  sessionStorage.removeItem('needReloadWhenGoBack');
}

function coverhandle_reload(handleEvent) {
  $(handleEvent).off().attr({
    'data-toggle': 'tooltip',
    'data-placement': 'bottom'
  }).on({
    'dragover': false,
    'drop': e => {
      handleDrop(e.originalEvent)},
    'error': e => {
      // 现在已经不需要了
      e.target.src=flaskUrl.get("static")('pic/fallback.png')},
    'click': e => {
      launchapp(e.target.id.match(/\d+/))}
  });
}

async function mainHTML_reload() {
  $('#collapseTwo').load(flaskUrl.get("html_picview")(), async () => {
    fav_reload()
  });
  $('#collapseThree').load(flaskUrl.get('html_tableview')(), async () =>{
    $('.picon')
    .on('load', e => {
      e.originalEvent.target.style.display='initial'
    })
    $('.tableViewRow')
      .on('dragover', false) 
      .on('drop', e => {
        handleDrop(e.originalEvent)
      });
  });
  bsmenu_reload()
}

function fav_reload() {
  $('#f-avorites').remove();
  const favCollapse = $('.picview').clone().attr('id', 'avorites')
  $('.picview').attr('id', 'p-icview')
  favCollapse.children().each(function() {
    const favoriteList = JSON.parse(localStorage.favoritelist || '{}');
    const id = $(this).attr('id').match(/\d+/);
    if (!(id in favoriteList)) {
      $(this).remove(); // 从 DOM 中删除 div
    }
  });
  $('#collapseOne').html(favCollapse).find('[id]').attr('id', function(_, id) {
    return 'f-' + id;
  });
  coverhandle_reload('.custom-img')
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="tooltip"]').hover(e => {
    if ($(e.target).hasClass('custom-contextmenu')) {
      $(e.target).tooltip('disable');
    } else {
      $(e.target).tooltip('enable');
    }
  });
}

function bsmenu_reload() {
  $('.dropdown.bootstrapMenu').remove();
  new BootstrapMenu('.img-thumbnail', {
    fetchElementData: function($rowElem) {
      return {
          id: $rowElem.attr('id').match(/\d+/),
          zoomname: $rowElem.hasClass('custom-contextmenu'),
          haszoom: true
      };
    },
    menuItems: menuContext
  });
  new BootstrapMenu('.tableViewRow', {
    fetchElementData: function($rowElem) {
        return {
            id: $rowElem.attr('id').match(/\d+/),
            haszoom: false
        };
    },
    menuItems: menuContext
  });
}



document.addEventListener('DOMContentLoaded', () => {
  // 保存页面collapse状态
  $('.collapse').on('hidden.bs.collapse shown.bs.collapse', function () {
    const id = this.id;
    const state = this.classList.contains('in') ? 'show' : 'hide';
    const collapseStates = JSON.parse(localStorage.getItem('collapseStates')) || {};
    collapseStates[id] = state;
    localStorage.setItem('collapseStates', JSON.stringify(collapseStates));
  });

  // 在加载时恢复页面collapse状态
  const collapseStates = JSON.parse(window.localStorage.getItem('collapseStates')) || {};
  for (let id in collapseStates) {
    const state = collapseStates[id];
    const elem = document.getElementById(id);
    if (elem) {
      if (state === 'hide') {
        // $(elem).collapse('hide');
        elem.classList.remove('in');
        $(elem).siblings('.panel-heading').removeClass('active');
      } else {
        // $(elem).collapse('show');
        elem.classList.add('in');
        $(elem).siblings('.panel-heading').addClass('active');
      }
    }
    // localStorage.removeItem('collapseStates');
  }
});

history.scrollRestoration = 'manual'
document.addEventListener('contextmenu', event => event.preventDefault());
