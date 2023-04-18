function openDetailWindow(id, x, y) {
  if (isNaN(id)) {
    id.preventDefault();
    var url = id.target.href;
  } else {
    var url = myflaskGet('detail_page', id);
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

function addMenu(event) {
  event.target.classList.add('custom-contextmenu')
  //event.target.parentNode.setAttribute('onclick', 'return false;');
  event.target.setAttribute('onclick',
    'event.preventDefault(); openDetailWindow(' +
    event.target.id.match(/\d+/) + ',400,600)')
}

function delMenu() {
  document.querySelectorAll('.custom-contextmenu').forEach(function (element) {
    element.classList.remove('custom-contextmenu');
    element.removeAttribute('onclick');
  });
};

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
  let id = event.target.id.match(/\d+/)
  console.log('handleDrop(): Called')
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

function uploadUrl(url, id) {
  let xhr = new XMLHttpRequest();
  xhr.open('POST', myflaskGet('data_upload', id), true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function () {
    if (xhr.status === 201 && xhr.response === 'library.jpg') {
      const imgPreview = document.getElementById('p-' + id);
      readFileFromFlask(myflaskGet('data_get', 'resources/' + id) + '/' + xhr.response, function (content) {
        imgPreview.src = content;
        console.log('uploadUrl(): new image loaded');
      });
    } else if (xhr.response === 'icon.ico') {
      const imgPreview = document.getElementById('t-' + id);
      readFileFromFlask(myflaskGet('data_get', 'resources/' + id) + '/' + xhr.response, function (content) {
        imgPreview.src = content;
        imgPreview.style = null;
        console.log('uploadUrl(): new icon loaded');
      });
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
  let xhr = new XMLHttpRequest();
  xhr.open('POST', myflaskGet('data_upload', id), true);
  xhr.onload = function () {
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
    navigator.serviceWorker.controller.postMessage('cacheinfo');
    navigator.serviceWorker.addEventListener('message', event => {
      const cacheName = event.data.cacheName
      const filesToCache = event.data.filesToCache
      caches.delete(cacheName)
      caches.open(cacheName).then(function(cache) {
        return cache.addAll(filesToCache);
      })
    });
  } finally {
    location.reload();
  }
}

function mainHTML_reload() {
  $('#collapseTwo').load('picview', () => {
    $('#collapseThree').load('tableview', () => {
      myscrollTo('mainpageScrollPosition')
    }); 
  });
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

  $('.panel-collapse').on('show.bs.collapse', function () {
    $(this).siblings('.panel-heading').addClass('active');
  });

  $('.panel-collapse').on('hide.bs.collapse', function () {
    delMenu()
    $(this).siblings('.panel-heading').removeClass('active');
  });
});

if (location.pathname === '/') {
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('serviceworker.js');
    } catch (error) {
      console.error('[Service Worker] Failed to register:', error);
    }
  } else {
    console.warn('[Service Worker] not available in this browser');
  }

  window.addEventListener('scroll', () => {
    localStorage.setItem("mainpageScrollPosition", window.pageYOffset);
  });

  document.addEventListener('DOMContentLoaded', () => {
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

document.addEventListener('contextmenu', event => event.preventDefault());
