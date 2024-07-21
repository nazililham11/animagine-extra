export async function loadTxtList(url){
    return await fetch(url).then(data => data.text()).then(text => txtToList(text))
}
export function txtToList(txt){
    return txt.split('\n')
        .map(x => x.replaceAll('\r', '').trim())
        .filter(x => x.length > 0)
}
export function zeroLead(value, digit){
    return (
        Array(digit).fill("0").join('') + value
    ).slice(-digit)
}
export function currentDate(){
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
export function sanitaizePrompts(prompt){
    return (prompt + '')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => p.endsWith(',') ? p : p + ',')
        .join(' ')
}
export function loadExternal(url, timeout = 5000) {
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
            const style = createEl('link')
                .attrs({ 'type': 'text/css', 'rel': 'stylesheet', 'href': url })
                .get()
            style.onload = onLoadCallback
            document.head.appendChild(style)

        } else if (url.endsWith('.js')){
            const script = createEl('script').attrs({ 'defer': '', 'src': url, }).get()
            script.onload = onLoadCallback
            document.body.appendChild(script)
        }
    })
}
export function appendStyle(styleStr, parent = document.head) {
    const style = document.createElement('style')
    style.innerHTML += styleStr
    parent.appendChild(style)
    return style
}
export function inputFile(callback, accept){
    const fileInput = document.createElement('input')
    fileInput.accept = accept ?? fileInput.accept
    fileInput.type = 'file'
    fileInput.onchange = (e) => readSingleFile(e, callback)
    fileInput.click()
}
// https://stackoverflow.com/questions/3582671/how-to-open-a-local-disk-file-with-javascript
export function readSingleFile(e, callback) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => callback(e.target.result)
    reader.readAsText(file)
}
export function isMobileBrowser(){
    const phones = [
        'phone|pad|pod|iPhone|iPod|ios|iPad|Android',
        'Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec',
        'wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone',
    ].join('|').split('|')

    for (const phone of phones){
        if (navigator.userAgent.indexOf(phone) > -1) return true
    }
    return false
}
export function getTimeStr(dateStr, defaultVal = '-'){
    return toDate(dateStr)?.toTimeString().split(' ').shift() ?? defaultVal
}
export function toDate(dateStr){
    const date = new Date(dateStr)
    return (date !== "Invalid Date") && !isNaN(date) ? date : undefined
}
export function stringLimit(string, options = {}){
    let sliced = false
    if (typeof options.maxLine == 'number'
        && string.split('\n').length >= options.maxLine
    ){
        string = string.split('\n').slice(0, options.maxLine).join('\n')
        sliced = true
    }
    if (typeof options.maxCharacters == 'number'
        && string.length >= options.maxCharacters
    ){
        string = string.substr(0, options.maxCharacters)
        sliced = true
    }
    if (sliced){
        string = string +
        
         (options.endStr ?? '...')
    }

    return string
}
export function groupBy(list, groupBy){
    if (!Array.isArray(list)) list = []

    groupBy = groupBy ?? function(){}

    const result = new Map()
    for (const item of list){
        const key = groupBy(item) ?? 'Unknown'
        if (!result.has(key)) result.set(key, [])

        result.get(key).push(item)
    }
    return result
}
export function sort(list, sort_cmd){
    if (!Array.isArray(list) || list.length < 1) return []

    const [propType, propName] = sort_cmd.split(":")
    const descending = propType.startsWith('-')

    const sortDate = (a, b) => new Date(a[propName]) - new Date(b[propName])
    const sortString = (a, b) => (a[propName] + '').localeCompare(b[propName] + '')
    const sortNumber = (a, b) => (parseInt(a[propName]) || 0) - (parseInt(b[propName]) || 0)

    if (descending){
        if (propType.endsWith('num')) return list.sort((a, b) => sortNumber(b, a))
        if (propType.endsWith("date")) return list.sort((a, b) => sortDate(b, a))
        if (propType.endsWith('str')) return list.sort((a, b) => sortString(b, a))
    } else {
        if (propType.endsWith('num')) return list.sort((a, b) => sortNumber(a, b))
        if (propType.endsWith("date")) return list.sort((a, b) => sortDate(a, b))
        if (propType.endsWith('str')) return list.sort((a, b) => sortString(a, b))
    }

    return list
}

export function el(element){
    const $this = { get, attrs, styles, html, text, on, copyClassFrom, copyStyleFrom }

    function get() {
        return element
    }
    function attrs(props){
        for (const prop in props){
            element.setAttribute(prop, props[prop])
        }
        return $this
    }
    function styles(styles){
        for (const style in styles){
            element.style[style] = styles[style]
        }
        return $this
    }
    function html(value){
        element.innerHTML = value
        return $this
    }
    function text(value){
        element.innerText = value
        return $this
    }
    function on(eventKey, callback){
        element.addEventListener(eventKey, callback)
        return $this
    }
    function copyClassFrom(el){
        if (typeof el == 'string'){
            el = document.querySelector(el)
        }
        element.classList.add(...el.classList)
        return $this
    }
    function copyStyleFrom(el, styleList){
        if (typeof el == 'string'){
            el = document.querySelector(el)
        }
        const refrences = window.getComputedStyle(el)
        for (const style of styleList){
            element.style[style] = refrences[style]
        }
        return $this
    }

    return $this
}
export function createEl(tagName){
    return el(document.createElement(tagName))
}
export function queryEl(query){
    return el(document.querySelector(query))
}
export function objectExtract(obj, keys){
    const result = {}
    for (const key of keys){
        result[key] = obj[key]
    }
    return result
}