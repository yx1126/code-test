const s = document.createElement("script");
s.src = chrome.runtime.getURL("xhr.js");
// s.onload = function () {
//     this.remove();
// };

(document.head || document.documentElement).appendChild(s);
