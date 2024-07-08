# Animagine Extra
Added additional features for anime image generation in Animagine's huggingface space.

# Features
- History: view and use previous parameters. It currently only stores parameters such as prompt, negative, style, quality, aspec ratio, and whether upscaled.
- Prompt Editor: The prompt area was repleaced with CodeMirror TextEditor that uses Sublime Keymap. It has feature like Hint, Move Line `Alt+Up`or`Alt+Down`, Multi curosr `Ctrl+D`, Cut/Copy Lines, etc. Read More about codemirror sublime keymap at https://codemirror.net/5/demo/sublime.html


# Limitation
- Only works on the `*.hf.space` domain. Because `huggingface.co` uses `iframe` to display spaces so script can't access the HTML DOM.

# How to Install
- Install a script manager plugin/extention on your browser, such as Tampermonkey
    + on chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en
    + on firefox: https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/
- Go to Tampermonkey Dashboard -> Utilities -> Import From Url
- Paste the script url, and hit Install

# How to Use Without Extensionion Script Manager Plugins/Extensions
If you can't install the plugin or use a mobile device. 
Go to the Animagine page, then run this script in the address bar:


**Run the Script**
```js
javascript:fetch('https://raw.githubusercontent.com/nazililham11/animagine-extra/main/animagine-extra.js').then(r=>r.text()).then(t=>{const x=document.createElement('script');x.innerText=t;document.body.append(x)})
```
**Clear Saved History / Hint**
```js
javascript:localStorage.clear()
```