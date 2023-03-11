navigator.serviceWorker.register("dummy-sw.js");

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