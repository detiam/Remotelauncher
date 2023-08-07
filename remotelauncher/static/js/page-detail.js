function detailOpener_reload() {
  if (window.opener.document.title == flaskStr.get("i18n_picviewTitle")) {
    window.opener.fullPicview('reLoad')
  } else {
    localStorage.ScrollPositionMainpage = window.opener.pageYOffset;
    window.opener.mainHTML_reload()
  }
};

function checkToResetFav() {
  const realid = $('#detailForm').attr('action').match(/\d+/)
  const newid = $('#program_id').val()
  if (realid != newid && isfavorite(realid)) {
    const favoritelist = JSON.parse(localStorage.favoritelist || '{}')
    delete favoritelist[realid]
    favoritelist[newid] = 'true'
    favSave(favoritelist)
  }
};

// 获取当前 URL 中的查询参数
const params = new URLSearchParams(window.location.search);
// 检查参数是否存在，以及其值是否符合条件
if (params.get('need_reload') === '1') {
  detailOpener_reload()
};

// https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
$(document).on('click','button#edit-program-btn',()=>{
  autosize.update(document.querySelectorAll('textarea.autosize'))
});

document.addEventListener('keydown', function (event) {
  // 如果按下的是Ctrl + S, 则触发按钮的单击事件
  if (event.ctrlKey && event.code === 'KeyS') {
    event.preventDefault(); // 防止默认的保存操作
    document.getElementById('detail-save-button').click(); // 触发按钮的单击事件
  }
  if (event.code === 'Escape') {
    // event.preventDefault();
    window.close()
  }
});

document.addEventListener('DOMContentLoaded', () => {
  autosize(document.querySelectorAll('textarea.autosize'))
  // 显示警告框
  $("#alert").fadeIn();
  // 定时隐藏警告框
  setTimeout(function () {
    $("#alert").fadeOut();
  }, 3000); // 设置5秒后自动隐藏
});