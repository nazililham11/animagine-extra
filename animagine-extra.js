// ==UserScript==
// @name         Animagine Extra
// @namespace    https://github.com/nazililham11/animagine-extra
// @version      0.1.3
// @description  Additional features for Animagine Space
// @author       nazililham11
// @downloadURL  https://raw.githubusercontent.com/nazililham11/animagine-extra/main/animagine-extra.js
// @updateURL    https://raw.githubusercontent.com/nazililham11/animagine-extra/main/animagine-extra.js
// @match        https://cagliostrolab-animagine-xl-3-1.hf.space/*
// @grant        none
// ==/UserScript==

(function(){

    const MAX_VISIBLE_HINTS = 100
    const HINTS_URL = [
        'https://huggingface.co/spaces/cagliostrolab/animagine-xl-3.1/raw/main/wildcard/characterfull.txt',
    ]

    const MAX_SAVED_HISTORY = 250

    const CM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/'

    const EDITOR_CONFIG = {
        lineNumbers: true,
        styleActiveLine: true,
        lineWrapping: true,
        minLines: 15,
        viewportMargin: 15,
        keyMap: 'sublime',
        theme: 'material',
        addons: [
            CM_CDN + 'keymap/sublime.min.js',
            CM_CDN + 'theme/material.min.css',
            CM_CDN + 'addon/search/searchcursor.min.js',
            CM_CDN + 'addon/hint/show-hint.min.css',
            CM_CDN + 'addon/hint/show-hint.min.js',
        ]
    }


    const animagine = Animagine()

    animagine.onPageLoaded(() => main())


    async function main(){

        const editor = Editor(EDITOR_CONFIG)
        await editor.render(animagine.element.prompt)

        editor.getCodemirror().on('keyup', () => {
            animagine.prompt.value = sanitaizePrompts(editor.getCodemirror().getValue())
        })
        editor.getCodemirror().addKeyMap({ 
            'Ctrl-Enter': () => animagine.generate()
        })
        animagine.onRefreshUI(() => {
            editor.getCodemirror().setValue(animagine.prompt.value ?? '')
            editor.getCodemirror().save()

            setTimeout(() => {
                editor.getCodemirror().focus()
                editor.getCodemirror().refresh()
            }, 0);
        }) 

        const textareaStyles = window.getComputedStyle(animagine.element.prompt)
        const editorElement = editor.getCodemirror().getWrapperElement()
        editorElement.style.background = textareaStyles.background
        editorElement.style.color = textareaStyles.color
        editorElement.style.borderRadius = textareaStyles.borderRadius

        const editorScrollElement = editor.getCodemirror().getScrollerElement()
        editorScrollElement.setAttribute('style', 'overflow-x: auto!important;')


        

        let hints = []
        function appendHints(_hints){
            hints = hints.concat(_hints)
            // remove duplicate
            hints = [ ...new Set(hints) ]

            localStorage.setItem('hints', hints.join('\n'))
            editor?.useHints(hints, MAX_VISIBLE_HINTS)
        }

        const localHint = localStorage.getItem('hints')
        if (localHint){
            appendHints(txtToList(localHint))
        } 
        if (HINTS_URL.length) {
            for (const url of HINTS_URL){
                appendHints(await loadTxtList(url))
            }
        }
        console.log('used hints,', hints.length, 'length')




        const historyView = PromptHistoryView()
        historyView.itemOnClick((data) => {
            console.log('selected history', data)
            animagine.fillInputs(data)
            animagine.refreshUI()
        })
        historyView.hide()
        document.body.prepend(historyView.container)
        document.body.style.position = 'relative'

        const historyBtn = animagine.createButton()
        historyBtn.innerText = 'History'
        historyBtn.onclick = () => historyView.show()

        const importBtn = animagine.createButton()
        importBtn.innerText = 'Import Hint'
        importBtn.onclick = () => {
            inputFile((text) => {
                appendHints(txtToList(text))
                console.log('loaded hints,', hints.length, 'length total')
            }, '.txt')
        }

        animagine.applyCustomUI()
        animagine.refreshUI()




        // history data example
        // {
        //    "2024-07-06 15:07:28:391" : {
        //        "aspec_ratio"     : "896 x 1152"
        //        "negative_prompt" : "low quality"
        //        "prompt"          : "1girl"
        //        "quality"         : "Cinematic"
        //        "style"           : "Heavy v3.1"
        //        "upscaler"        : false
        //    }
        // }

        const localCollection = LocalCollection('history', MAX_SAVED_HISTORY)

        const itemsObj = localCollection.get()
        const itemsArr = Object.keys(itemsObj).sort()
            .map(key => ({ ...itemsObj[key], date: key}))
            
        if (itemsArr.length > 0){
            itemsArr.forEach(item => historyView.insert(item))
            animagine.fillInputs(itemsArr.pop())
        }

        animagine.refreshUI()

        function insertNewHistory(data){
            const key = currentDate()

            localCollection.insert(key, data)
            localCollection.save()
            historyView.insert({ ...data, date: key })
        }

        animagine.onGenerate(() => {
            animagine.prompt.value = editor.getCodemirror().getValue()

            const { 
                prompt, negative_prompt, quality, 
                style, aspec_ratio, upscaler 
            } = animagine.readInputs()

            insertNewHistory({ 
                prompt, negative_prompt, quality, 
                style, aspec_ratio, upscaler
            })
        })

    }

    function Animagine(){

        let defaultValue = {}
        let refreshCallback = function(){}
        const element = {}
        const props = {
            prompt            : gradio_config.components[7].props,
            negative_prompt   : gradio_config.components[8].props,
            quality           : gradio_config.components[16].props,
            style             : gradio_config.components[11].props,
            aspec_ratio       : gradio_config.components[19].props,
            upscaler          : gradio_config.components[27].props,
            upscaler_strength : gradio_config.components[29].props,
            upscaler_value    : gradio_config.components[30].props,
            sampler           : gradio_config.components[34].props,
            seed              : gradio_config.components[37].props,
            randomize_seed    : gradio_config.components[38].props,
            guidance_scale    : gradio_config.components[42].props,
            steps             : gradio_config.components[43].props,
        }

        function bindUI(){
            element.prompt   = el('#component-8 textarea')
            element.generate = el('#component-49')
        }
        function applyCustomUI(){
            el(".gradio-container").style['max-width'] = '100%'
            el("#component-0").style.padding = '0'
            el("#component-0").style['max-width'] = '100%'
            // el("#component-5").style['flex-grow'] = '3'
            el('#component-50').firstChild.style['z-index'] = 80
        }
        function refreshUI(){
            // switch tab to re render the ui :)
            el('#component-15-button').click()
            setTimeout(() => {
                el('#component-6-button').click()
                refreshCallback()
            }, 200)
        }
        function onRefreshUI(callback){
            refreshCallback = callback
        }
        function fillInputs(data, defaultIfNull = false){
            for (const key in props){
                if (!Object.hasOwn(data, key) && defaultIfNull) {
                    props[key].value = defaultValue[key]
                } else if (Object.hasOwn(data, key)) {
                    props[key].value = data[key]
                }
            }
        }
        function readInputs(){
            const result = {}
            for (const key in props){
                result[key] = props[key].value
            }
            return result
        }
        function onPageLoaded(callback){
            const scan = setInterval(() => {
                if (!el("#component-0")) return 
                if (typeof gradio_config != 'object') return 

                clearInterval(scan)
                defaultValue = readInputs()
                bindUI()
                callback()
            }, 100)
        }
        function generate(){
            element.generate.click()
        }
        function onGenerate(callback){
            element.generate.addEventListener('click', callback)
        }
        function createButton(){
            const btn = document.createElement('button')
            // Copy button styles
            const btnStyleRef = el("#component-49")
            btn.classList.add(...btnStyleRef.classList)

            el('#component-5').append(btn)
            return btn
        }

        return {
            ...props, defaultValue, element,

            applyCustomUI, refreshUI, onRefreshUI,
            fillInputs, readInputs, 
            onPageLoaded, 
            generate, onGenerate,
            createButton, 
        }
    }
    function LocalCollection(path, limit = 250){
        let collection = {}

        function save(){
            localStorage.setItem(path, JSON.stringify(collection))
        }
        function insert(key, data) {
            if (Object.hasOwn(collection, key)) return
            collection[key] = data
            limitCollection(limit)
        }
        function limitCollection(limit = 250){
            do {
                let keys = Object.keys(collection).sort()
                if (keys.length >= limit){
                    delete collection[keys.shift()]
                    continue   
                }
            } while (false)
        }
        function get(){
            collection = JSON.parse(localStorage.getItem(path) ?? '{}')
            return collection
        }
        function clear(){
            collection = {}
            save()
        }

        return { collection, save, insert, get, limitCollection, clear }
    }
    function PromptHistoryView(){
        styles`
            .history-container.hidden { display: none; }
            .history-container {
                position: absolute;
                z-index: 90;
                display: grid;
                height: 100%;
                min-height: 100vh;
                width: 100%;
                max-width: 100%;
                grid-template-columns: repeat(1, minmax(0, 1fr));
                grid-auto-rows: min-content;
                gap: 2rem;
                background-color: rgb(0 0 0 / 0.75);
                padding: 2rem;
                font-size: 0.75rem;
                line-height: 1rem;
                color: rgb(255 255 255);
                backdrop-filter: blur(8px);
                box-sizing: border-box;
            }
            @media (min-width: 640px) {
                .history-container { 
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (min-width: 768px) {
                .history-container {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }
            @media (min-width: 1024px) {
                .history-container {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
            }
            .history-item {
                display: flex;
                cursor: pointer;
                flex-direction: column;
                background-color: rgb(255 255 255 / 0.05);
                padding: 1rem;
                gap: 0.5rem;
            }
            .history-item:hover { background-color: rgb(255 255 255 / 0.1); }
            .history-item .info, .history-item .negative { opacity: 0.75; }
            .negative { color: rgb(239 68 68 / 0.75); }
            .history-container p { margin: 0; }
            .history-container .date-header {
                grid-column: 1 / -1;
                font-size: 1rem;
                line-height: 1.5rem;
                font-weight: 600;
            }
        `

        const container = document.createElement('div')
        container.setAttribute('class', 'history-container')
        container.onclick = () => container.classList.toggle('hidden', true)

        let onClick = function(){}

        const show = () => container.classList.toggle('hidden', false)
        const hide = () => container.classList.toggle('hidden', true)
        const itemOnClick = callback => onClick = callback

        let dateCount = 0
        let prevDateEl = null
        let prevDateStr = ''
        function insertDateHeader(date){
            const dateStr = new Date(date).toDateString()

            if (prevDateStr != dateStr){
                const dateEl = document.createElement('div')
                dateEl.setAttribute('class', 'date-header')
                dateEl.innerText = dateStr + ' (1)'
                container.prepend(dateEl)

                dateCount = 1
                prevDateEl = dateEl
            } else {
                dateCount++
                prevDateEl.innerText = dateStr + ' (' + dateCount + ')'
                container.prepend(prevDateEl)
            }

            prevDateStr = dateStr
        }

        function insert(data){
            const timeStr = new Date(data.date).toTimeString().split(' ').shift()
            const item = document.createElement('div')

            item.setAttribute('class', 'history-item')
            item.onclick = () => onClick(data)
            item.innerHTML = `
                <div class="info">
                    <span>${timeStr}</span> | 
                    <span>${data.aspec_ratio}</span> | 
                    <span>${data.style}</span> | 
                    <span>${data.quality}</span> | 
                    <span>${data.upscaler ? 'Upscaled':'Normal'}</span>
                </div>
                <p class="positive">${(data.prompt + '').replaceAll('\n', '<br>')}</p>
                <p class="negative">${data.negative_prompt}</p>
            `
            container.prepend(item)

            insertDateHeader(data.date)
        }

        function clear(){
            container.innerHTML = ''
            dateCount = 0
            prevDateEl = null
            prevDateStr = ''
        }

        return { container, insert, show, hide, itemOnClick, clear }
    }
    function Editor(config){

        const CM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/'

        let addons = [
            CM_CDN + 'addon/search/searchcursor.min.js',
            CM_CDN + 'addon/hint/show-hint.min.css',
            CM_CDN + 'addon/hint/show-hint.min.js',
            ...(config.addons ?? [])
        ]

        let codemirror, hints, limit
        let libsLoaded = loadLibs()
        
        const isMobile = isMobileBrowser()

        const defaultConfig = {
            lineNumbers: true,
            indentUnit: 4,
            extraKeys: { 
                'Alt-Up': 'swapLineUp',
                'Alt-Down': 'swapLineDown',
            },
            styleActiveLine: true,
            lineWrapping: true,
            minLines: 50,
            viewportMargin: 50
        }

        if (config.addons){
            delete config.addons
        }

        config = { ...defaultConfig,  ...(config ?? {}) }
        
        async function render(element){
            await libsLoaded

            if (element.type === 'textarea'){
                codemirror = CodeMirror.fromTextArea(element, config)
            } else {
                const textarea = document.createElement('textarea')
                element.append(textarea)
                codemirror = CodeMirror.fromTextArea(textarea, config)
            }    
        }

        async function loadLibs(){

            await Promise.all([
                loadExternal(CM_CDN + 'codemirror.min.js'),
                loadExternal(CM_CDN + 'codemirror.min.css'),
            ])

            const libs = addons.map(lib => loadExternal(lib))
            await Promise.all(libs)

            return true
        }

        // https://stackoverflow.com/questions/32165851/how-to-enable-code-hinting-using-codemirror
        function showHints(){
            if (!hints || hints.length < 1) return

            CodeMirror.showHint(codemirror, () => {

                let cursor = codemirror.getCursor()
                let line = codemirror.getLine(cursor.line)
                let start = cursor.ch, end = cursor.ch

                while (start > 0 && /\w/.test(line.charAt(start - 1))) --start
                while (end < line.length && /\w/.test(line.charAt(end))) ++end

                const word = line.substring(start, end)
                const list = hints.filter(item => (
                        item.replaceAll(' ', '').indexOf(word) >= 0
                    ))
                    .sort((a, b) => {
                        const a_nospace = a.replaceAll(' ', '')
                        const b_nospace = b.replaceAll(' ', '')

                        // Exact check
                        if (b === word) return 4
                        if (a === word) return -4

                        // Same character start
                        if (b_nospace.startsWith(word)) return 3
                        if (a_nospace.startsWith(word)) return -3

                        // Has exact word
                        if (b.split(' ').indexOf(word) > -1) return 2
                        if (a.split(' ').indexOf(word) > -1) return -2

                        // Include word
                        if (b_nospace.indexOf(word) > -1) return 1
                        if (a_nospace.indexOf(word) > -1) return -1

                        // Nothing match
                        return 0
                    }).slice(0, limit)

                return { 
                    list: list,
                    from: CodeMirror.Pos(cursor.line, start),
                    to: CodeMirror.Pos(cursor.line, end)
                }
            })
        }

        function useHints(newHints, newLimit = 100){
            
            if (!hints) {            
                let style = `.CodeMirror-hints { z-index: 100!important; }`
    
                if (isMobile){
                    style += `
                        .CodeMirror-hint {
                            padding-top: 1ch;
                            padding-bottom: 1ch;
                            border-bottom: 1px solid black;    
                        }
                    `
                    codemirror.on('change', (editor, changes) => {
                        const key = changes.text?.pop()
                        if (changes.origin !== '+input') return
                        if (editor.state.completionActive) return 
                        if (key.toString().trim().length !== 1) return
                            
                        showHints()
                    })
    
                } else {
                    // https://stackoverflow.com/questions/13744176/codemirror-autocomplete-after-any-keyup
                    codemirror.on('keyup', (editor, event) => {    
                        if (editor.state.completionActive) return 
                        if (event.key.toString().trim().length !== 1) return
    
                        showHints()
                    })
                }
    
                codemirror.addKeyMap({
                    'Ctrl-Space': () => showHints()
                })
    
                styles(style)
            }

            hints = newHints
            limit = newLimit
        }

        function getCodemirror(){
            return codemirror
        }

        return {
            getCodemirror, showHints, useHints, loadLibs, render
        }
    }


    async function loadTxtList(url){
        return await fetch(url).then(data => data.text()).then(text => txtToList(text))
    }
    function txtToList(txt){
        return txt.split('\n')
            .map(x => x.replaceAll('\r', '').trim())
            .filter(x => x.length > 0)
    }
    function zeroLead(value, digit){
        return (
            Array(digit).fill("0").join('') + value
        ).slice(-digit)
    }
    function currentDate(){
        const date = new Date()

        const dateStr = [
            date.getFullYear(),
            zeroLead((date.getMonth() + 1), 2),
            zeroLead(date.getDate(), 2) 
        ].join('-') 

        const timeStr = [
            zeroLead(date.getHours(), 2),
            zeroLead(date.getMinutes(), 2),
            zeroLead(date.getSeconds(), 2),
            date.getMilliseconds()
        ].join(':')

        return dateStr + " " + timeStr
    }
    function sanitaizePrompts(prompt){
        return (prompt + '')
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => p.endsWith(',') ? p : p + ',')
            .join(' ')
    }
    function loadExternal(url, timeout = 5000) {
        return new Promise((resolve, reject) => {

            // https://stackoverflow.com/questions/32461271/nodejs-timeout-a-promise-if-failed-to-complete-in-time
            const timer = setTimeout(() => {
                reject(new Error(`load ${url.split('/').pop()} timed out after ${timeout} ms`))
            }, timeout)

            const onLoadCallback = (e) => {
                clearTimeout(timer)
                resolve(e)
            }

            if (url.endsWith('.css')){
                const el = document.createElement('link')
                el.setAttribute('type', 'text/css')
                el.setAttribute('rel', 'stylesheet')
                el.setAttribute('href', url)
                el.onload = onLoadCallback

                document.head.appendChild(el)

            } else if (url.endsWith('.js')){
                const el = document.createElement('script')
                el.setAttribute('defer', '')
                el.setAttribute('src', url)
                el.onload = onLoadCallback

                document.body.appendChild(el)
            }
        })
    }
    function styles(styleStr) {
        const style = document.createElement('style')
        style.innerHTML += styleStr
        document.head.appendChild(style)
    }
    function inputFile(callback, accept){
        const fileInput = document.createElement('input')
        fileInput.accept = accept ?? fileInput.accept
        fileInput.type = 'file'
        fileInput.onchange = (e) => readSingleFile(e, callback)
        fileInput.click()
    }
    // https://stackoverflow.com/questions/3582671/how-to-open-a-local-disk-file-with-javascript
    function readSingleFile(e, callback) {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => callback(e.target.result)
        reader.readAsText(file)
    }
    function el(query) {
        return document.querySelector(query)
    }
    function isMobileBrowser(){
        const phones = 'phone|pad|pod|iPhone|iPod|ios|iPad|Android' +
            'Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec' +
            'wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone'
            .split('|')
        
        for (const phone of phones){
            if (navigator.userAgent.indexOf(phone) > -1) return true
        }
        return false
    }
})()