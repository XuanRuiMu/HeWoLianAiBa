try {
  var 已存主题 = localStorage.getItem('主题');
  if (已存主题 === '浅色') document.documentElement.setAttribute('data-theme', 'light');
  else if (已存主题 === '暗色') document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}
