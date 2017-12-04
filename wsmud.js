setTimeout(function() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = chrome.extension.getURL('script/addon.js');
    document.head.appendChild(script);
}, 1000);