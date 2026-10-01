/* 화면 모드: 저장값 > 시스템 설정. <head>에서 동기 실행해 깜박임을 막는다. */
(function () {
  try {
    var t = localStorage.getItem('ains_theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
