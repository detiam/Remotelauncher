function lang_reload() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'reloadLang'
    });
  } else {
    location.reload();
  }
}

function Mainpage_js() {
  $('.panel-collapse')
    .on('show.bs.collapse', function () {
      $(this).siblings('.panel-heading').addClass('active');
    })
    .on('hide.bs.collapse', function () {
      delZoominclass();
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
    lang_reload();
  });
}

window.addEventListener('beforeunload', () => {
  if (document.title == flaskStr.get("i18n_picviewTitle")) {
    localStorage.setItem("ScrollPositionPicview", window.pageYOffset);
  } else {
    localStorage.setItem("ScrollPositionMainpage", window.pageYOffset);
  }
});

window.addEventListener('load', () => {
  scrollToPage('ScrollPositionMainpage')
});
