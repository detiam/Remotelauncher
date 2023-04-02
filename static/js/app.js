if (location.pathname === '/') {
  navigator.serviceWorker.register('dummy-sw.js')
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });

  $(document).ready(function () {
    // 获取语言切换器组件
    const langSelector = document.getElementById("lang-selector");
    // 添加监听器，当用户选择语言时触发
    langSelector.addEventListener("change", (event) => {
      // 获取用户选择的语言
      const lang = event.target.value;
      // 将语言设置为 cookie，过期时间为一年
      document.cookie = `lang=${lang};max-age=${60 * 60 * 24 * 365}`;
      // 刷新页面，使语言生效
      location.reload();
    });
  });
}

$(document).ready(function () {
  // 保存页面collapse状态
  $('.collapse').on('hidden.bs.collapse shown.bs.collapse', function () {
    var id = this.id;
    var state = this.classList.contains('in') ? 'show' : 'hide';
    var collapseStates = JSON.parse(localStorage.getItem('collapseStates')) || {};
    collapseStates[id] = state;
    localStorage.setItem('collapseStates', JSON.stringify(collapseStates));
  });

  // 保存滚动位置到 localStorage 中
  window.addEventListener('beforeunload', function () {
    localStorage.setItem('scrollPosition', window.pageYOffset);
  });

  // 在加载时恢复页面collapse状态
  const collapseStates = JSON.parse(window.localStorage.getItem('collapseStates')) || {};
  for (var id in collapseStates) {
    var state = collapseStates[id];
    var elem = document.getElementById(id);
    if (elem) {
      if (state === 'hide') {
        //$(elem).collapse('hide');
        elem.classList.remove('in');
        $(elem).siblings('.panel-heading').removeClass('active');
      } else {
        //$(elem).collapse('show');
        elem.classList.add('in');
        $(elem).siblings('.panel-heading').addClass('active');
      }
    }
    // localStorage.removeItem('collapseStates');
  }

  // 在页面加载完成后恢复滚动位置
  const scrollPosition = window.localStorage.getItem('scrollPosition');
  if (scrollPosition !== null) {
    window.scrollTo(0, scrollPosition);
    // localStorage.removeItem('scrollPosition');
  }

  $('.panel-collapse').on('show.bs.collapse', function () {
    $(this).siblings('.panel-heading').addClass('active');
  });

  $('.panel-collapse').on('hide.bs.collapse', function () {
    delMenu()
    $(this).siblings('.panel-heading').removeClass('active');
  });
});

document.addEventListener('contextmenu', event => event.preventDefault());

function detail_reload() {
  if (window.opener.document.title == 'Picview') {
    window.opener.fullPicview()
    console.log('reload.fullPicview()')
  } else {
    window.opener.location.reload()
  }
}

function fullPicview() {
  $('#mainpage').load('picview', function () {
    document.querySelector('.picview').addEventListener('click', function() {
      location.reload();
    });
    // 在回调函数中对加载完成的元素进行操作
    document.querySelectorAll('.cover').forEach(function (element) {
      element.classList.add('fullpagecover');
      document.title = 'Picview';
      document.querySelector('meta[name="theme-color"]').setAttribute('content', "#686868");
      const picView = document.querySelector('.picview');
      picView.style.borderRadius = '5px';
      document.body.style.backgroundColor = '#686868';
      document.body.style.margin = '1em';
    });
  });
}

function openDetailWindow(id, x, y) {
  if (isNaN(id)) {
    id.preventDefault();
    var url = id.target.href;
  } else {
    var url = '/detail/' + id;
  }
  let screenWidth = window.screen.width;
  let screenHeight = window.screen.height;
  let windowWidth = x; // 新窗口的宽度
  let windowHeight = y; // 新窗口的高度
  let left = (screenWidth - windowWidth) / 2;
  let top = (screenHeight - windowHeight) / 2;
  window.open(url, "_blank",
    'width=' + windowWidth + ',height=' + windowHeight +
    ',left=' + left + ',top=' + top +
    ',toolbar=no,addressbar=no,location=no,menubar=no');
}

function addMenu(event) {
  event.target.classList.add('custom-contextmenu')
  //event.target.parentNode.setAttribute('onclick', 'return false;');
  event.target.parentNode.setAttribute('onclick',
    'event.preventDefault(); openDetailWindow(' +
    event.target.id.match(/\d+/) + ',400,600)')
}

function delMenu() {
  document.querySelectorAll('.custom-contextmenu').forEach(function (element) {
    element.classList.remove('custom-contextmenu');
    element.parentNode.removeAttribute('onclick');
  });
};

function handleMenu(event) {
  if (document.title == 'Picview') {
    openDetailWindow(event.target.id.match(/\d+/), 400, 600)
  } else {
    hasContextMenu = event.target.classList.contains('custom-contextmenu');
    delMenu()
    if (!hasContextMenu) {
      addMenu(event)
    }
  }
}

function setCursorAndTimeout(url, event, timeout) {
  var button = event.target;
  button.style.cursor = 'not-allowed';
  button.disabled = true;
  window.location.href = url;
  setTimeout(function () {
    button.disabled = false;
    button.style.cursor = 'pointer';
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
  xhr.open('POST', '/upload/' + id, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function () {
    if (xhr.status === 201 && xhr.response === 'library.jpg') {
      const imgPreview = document.getElementById('p-' + id);
      readFileFromFlask('/data/resources/' + id + '/' + xhr.response, function (content) {
        imgPreview.src = content;
        console.log('uploadUrl(): new image loaded');
      });
    } else if (xhr.response === 'icon.ico') {
      const imgPreview = document.getElementById('t-' + id);
      readFileFromFlask('/data/resources/' + id + '/' + xhr.response, function (content) {
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
  xhr.open('POST', '/upload/' + id, true);
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

/* window.addEventListener("DOMContentLoaded", async event => {
  document.querySelector("#new").addEventListener("click", newWindow);
  document.querySelector("#topleft").addEventListener("click", moveTop);
  document.querySelector("#center").addEventListener("click", moveCenter);
  document.querySelector("#resizeSmall").addEventListener("click", resizeSmall);
  document.querySelector("#resizeLarge").addEventListener("click", resizeLarge);
  document.querySelector("#browser").addEventListener("click", openBrowser);
}); */

/*
function newWindow() {
  window.open("./", "blank", "width=600,height=400")
}

function moveTop() {
  window.moveTo(0, 0);
}

function moveCenter() {
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  window.moveTo((screen.availWidth - width) / 2, (screen.availHeight - height) / 2);
}

function resizeSmall() {
  window.resizeTo(450, 300);  
}

function resizeLarge() {
  window.resizeTo(1000, 800)
}

function openBrowser() {
  location.href="https://web.dev/learn/pwa"
}

function showResult(text, append=false) {
  if (append) {
      document.querySelector("output").innerHTML += "<br>" + text;
  } else {
     document.querySelector("output").innerHTML = text;    
  }
}
*/