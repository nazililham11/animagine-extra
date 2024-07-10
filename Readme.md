# Animagine Extra
Additional features for Animagine's huggingface space.

## Features
- **History :** view and use previous parameters. It currently only stores parameters such as prompt, negative, style, quality, aspec ratio, and whether upscaled.
- **Prompt Editor :** The prompt area was repleaced with CodeMirror TextEditor that uses Sublime Keymap. It has feature like Hint, Move Line `Alt+Up`or`Alt+Down`, Multi curosr `Ctrl+D`, Cut/Copy Lines, etc. Read More about codemirror sublime keymap at https://codemirror.net/5/demo/sublime.html
- **Prompt Hints :** Very useful especially on booru-style prompts. You can use your own hint by importing a `.txt` file containing hint separated by lines, or by putting the file url in the `HINTS_URL`


## Limit
- Only works on the `*.hf.space` domain. Because `huggingface.co` uses `iframe` to display spaces so script can't access the HTML DOM.

## Usage

### Using Userscript Plugins
- Install a userscript plugin/extention on your browser, such as Tampermonkey
    + on chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en
    + on firefox: https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/
- Go to Tampermonkey Dashboard -> Utilities -> Import From Url
- Paste the script url, and hit Install
```
https://raw.githubusercontent.com/nazililham11/animagine-extra/main/animagine-extra.js
```


### Without Userscript Plugins
In case you can't install the userscript plugin or using mobile device. 

Go to the Animagine page, then run this script in the address bar:

**Note: Some browsers remove the `javascript:` part after you paste the script in address bar.**

```js
javascript:fetch('https://raw.githubusercontent.com/nazililham11/animagine-extra/main/animagine-extra.js').then(r=>r.text()).then(t=>{const x=document.createElement('script');x.innerHTML=t;document.body.append(x)})
```

#### Clear Saved History / Hint
```js
javascript:localStorage.clear()
```