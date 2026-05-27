(function () {
  var ta = document.getElementById('md');
  ta.focus(); ta.select();

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  // Auto-copy on load
  navigator.clipboard.writeText(ta.value).then(function () {
    showToast('Copied to clipboard!');
  }).catch(function () {});

  var _uid = localStorage.getItem('_md_uid');
  if (!_uid) { _uid = crypto.randomUUID(); localStorage.setItem('_md_uid', _uid); }

  function ph(event, props) {
    var key = window.__PH_KEY;
    var host = window.__PH_HOST;
    if (!key) return;
    fetch(host + '/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event: event,
        distinct_id: _uid,
        properties: Object.assign({ $current_url: location.href }, props)
      })
    }).catch(function () {});
  }

  document.getElementById('copy').addEventListener('click', function () {
    navigator.clipboard.writeText(ta.value).then(function () {
      showToast('Copied!');
      ph('copy_clicked', { char_count: ta.value.length });
    });
  });

  document.getElementById('share').addEventListener('click', function () {
    var base = location.origin + location.pathname;
    var shareUrl = base + '?utm_source=url-to-markdown&utm_medium=share&utm_campaign=share-button';
    navigator.clipboard.writeText(shareUrl).then(function () {
      showToast('Link copied!');
      ph('share_clicked', { utm_url: shareUrl });
    });
  });
})();
