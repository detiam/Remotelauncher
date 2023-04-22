function openDetailWindow(id, x, y) {
  if (isNaN(id)) {
    id.preventDefault();
    var url = id.target.href;
  } else {
    var url = myflaskGet('page_detail', id);
  }
  let screenWidth = window.screen.width;
  let screenHeight = window.screen.height;
  let windowWidth = x; // 新窗口的宽度
  let windowHeight = y; // 新窗口的高度
  let left = (screenWidth - windowWidth) / 2;
  let top = (screenHeight - windowHeight) / 2;
  var DetailWindow = window.open(url,
    "_blank", 'width=' + windowWidth + ',height=' +
    windowHeight + ',left=' + left + ',top=' + top +
  ',toolbar=no,addressbar=no,location=no,menubar=no');
}

function addZoominclass(elem) {
  elem.classList.add('custom-contextmenu')
  //event.target.parentNode.setAttribute('onclick', 'return false;');
  elem.setAttribute('onclick',
    'event.preventDefault(); handleZoomin(event.target)')
}

function delZoominclass() {
  document.querySelectorAll('.custom-contextmenu').forEach(function (element) {
    element.classList.remove('custom-contextmenu');
    element.removeAttribute('onclick');
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
  event.preventDefault();
  console.log(event.target)
  let id = event.target.id.match(/\d+/)
  if (id === null) {id = $(event.target).closest('tr').attr('id').match(/\d+/);}
  console.log(id)
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

function delCache(route, callback) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('cacheinfo');
    navigator.serviceWorker.addEventListener('message', event => {
      caches.open(event.data.cacheName).then(function(cache) {
        cache.delete(route).then(function(status) {
          console.log('cacheDelete('+route+'): '+status)
          if (typeof callback === 'function') {callback()}
        });
      })
    })
  } else {
    if (typeof callback === 'function') {callback()}
  }
}

function uploadUrl(url, id) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', myflaskGet('data_upload', id), true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = () => {
    const route = myflaskGet('data_get', 'resources/' + id) + '/' + xhr.response
    if (xhr.status === 201 && xhr.response === 'library.jpg') {
      const imgPreview = document.getElementById('p-' + id);
      delCache(route, () => { 
        readFileFromFlask(route, (content) => {
          imgPreview.src = content;
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
  xhr.open('POST', myflaskGet('data_upload', id), true);
  xhr.onload = function () {
    delCache(myflaskGet('data_get', 'resources/' + id) + '/' + xhr.response)
    if (xhr.status === 201 && xhr.response === 'library.jpg') {
      const imgPreview = document.getElementById('p-' + id);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        imgPreview.src = reader.result;
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
    }
  };
  console.log('uploadFile(): ready to send file, sending')
  xhr.send(formData);
}

function reloadLang() {
  try {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('cacheinfo');
      navigator.serviceWorker.addEventListener('message', event => {
        const cacheName = event.data.cacheName
        const filesToCache = event.data.filesToCache
        caches.open(cacheName).then(function(cache) {
          filesToCache.forEach(function(cacheItem) {
            cache.delete(cacheItem)
            cache.add(cacheItem)
          })
        })
      });
    }
  } finally {
    location.reload();
  }
}

function myscrollTo(page) {
  try { window.scrollTo(0, window.localStorage.getItem(page)); }
  catch (error) { console.log('myscrollTo('+page+'): Failed! ' + error)}
}

function launchapp(id) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', myflaskGet('apps_launch', id), true);
  xhr.onload = () => {
    if (xhr.status === 204) {
      console.log('launchapp('+id+'): Success!')
    } else {
      console.log('launchapp('+id+'): Failed..')
    }
  }
  xhr.send()
}

function detail_reload() {
  if (window.opener.document.title == myflaskGet('i18n_picviewTitle')) {
    window.opener.fullPicview('reload')
    console.log('reload.fullPicview()')
  } else {
    window.opener.mainHTML_reload()
  }
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

function fullPicview(useCase) {
  if (useCase === 'enterPicview') {
    localStorage.setItem("ScrollPositionMainpage", window.pageYOffset);
    sessionStorage.mainpageclone = $('#mainpage').html();
    sessionStorage.mainpageinfo = [
      document.title,
      document.querySelector('meta[name="theme-color"]').getAttribute('content'),
    ]
  }
  $('#mainpage').load(myflaskGet('html_picview'), function () {
    myscrollTo('ScrollPositionPicview')
    bsmenu_reload()
    document.title = myflaskGet('i18n_picviewTitle');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', "#686868");
    document.querySelector('.picview').style.borderRadius = '5px';
    document.body.style.backgroundColor = '#686868';
    document.body.style.margin = '1em';
    document.querySelectorAll('.cover').forEach(function (element) {
      element.classList.add('fullpagecover');
    });
  });
}

function back2Mainpage() {
  localStorage.setItem("ScrollPositionPicview", window.pageYOffset);
  $('#mainpage').html(sessionStorage.mainpageclone)
  myscrollTo('ScrollPositionMainpage')
  bsmenu_reload()
  document.body.style = '';
  document.title = sessionStorage.mainpageinfo[0];
  document.querySelector('meta[name="theme-color"]').setAttribute('content', sessionStorage.mainpageinfo[1]);
}

function mainHTML_reload() {
  $('#collapseTwo').load(myflaskGet('html_picview'), () => {
    $('[data-toggle="tooltip"]').tooltip();
    $('[data-toggle="tooltip"]').hover(function() {
      if ($(this).hasClass('custom-contextmenu')) {
        $(this).tooltip('disable');
      } else {
        $(this).tooltip('enable');
      }
    });
  });
  $('#collapseThree').load(myflaskGet('html_tableview'));
  bsmenu_reload()
}


document.addEventListener('DOMContentLoaded', () => { mainHTML_reload()
  // 保存页面collapse状态
  $('.collapse').on('hidden.bs.collapse shown.bs.collapse', function () {
    var id = this.id;
    var state = this.classList.contains('in') ? 'show' : 'hide';
    var collapseStates = JSON.parse(localStorage.getItem('collapseStates')) || {};
    collapseStates[id] = state;
    localStorage.setItem('collapseStates', JSON.stringify(collapseStates));
  });

  // 在加载时恢复页面collapse状态
  const collapseStates = JSON.parse(window.localStorage.getItem('collapseStates')) || {};
  for (var id in collapseStates) {
    var state = collapseStates[id];
    var elem = document.getElementById(id);
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

if (location.pathname === '/') {
  if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.register('serviceworker.js');
    } catch (error) {
      console.error('[Service Worker] Failed to register:', error);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (document.title == myflaskGet('i18n_picviewTitle')) {
      localStorage.setItem("ScrollPositionPicview", window.pageYOffset);
    } else {
      localStorage.setItem("ScrollPositionMainpage", window.pageYOffset);
    }
  });

  window.addEventListener('load', () => {
    myscrollTo('ScrollPositionMainpage')
  });

  document.addEventListener('DOMContentLoaded', () => {
    $('.panel-collapse').on('show.bs.collapse', function () {
      $(this).siblings('.panel-heading').addClass('active');
    });
  
    $('.panel-collapse').on('hide.bs.collapse', function () {
      delZoominclass()
      $(this).siblings('.panel-heading').removeClass('active');
    });

    // 获取语言切换器组件
    const langSelector = document.getElementById("lang-selector");
    // 添加监听器，当用户选择语言时触发
    langSelector.addEventListener("change", (event) => {
      // 获取用户选择的语言
      const lang = event.target.value;
      // 将语言设置为 cookie，过期时间为一年
      document.cookie = `lang=${lang};max-age=${60 * 60 * 24 * 365}`;
      // 刷新页面，使语言生效
      reloadLang();
    });
  });
}

history.scrollRestoration = 'manual'
document.addEventListener('contextmenu', event => event.preventDefault());
