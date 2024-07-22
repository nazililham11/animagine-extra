
import { Animagine } from './animagine'
import * as Firebase from './firebase'
import { LocalCollection } from './local-collection'
import {
    loadTxtList, txtToList, currentDate, sanitaizePrompts, inputFile, createEl, el, objectExtract, loadExternal
} from './utils'
import { App as HistoryView } from './view'
import { Editor } from './editor'


// 
// Config
// 

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

// usage : how many data clicked on history
// datetime : used as primary key
const STORED_HISTORY_PROPS = 'prompt|negative_prompt|quality|style|aspec_ratio|upscaler|usage'.split('|')


// 
// Main
// 


const animagine = Animagine()
animagine.on('load', () => main())

async function main(){

    //
    // Local history data
    //
    // history data stored in key value pair format with datetime as primary key
    //
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


    //
    // Firebase
    //

    let historyCollection
    function firebaseInsertHistory(){}
    function firebaseUpdateHistory(){}

    async function initFirebase(){
        const firebaseCred = localStorage.getItem('firebase')
        await Firebase.initFirebase(JSON.parse(firebaseCred))

        historyCollection = await Firebase.initCollection('/animagine/history/', {
            limit: MAX_SAVED_HISTORY,
            onChildAdded: (data) => {
                if (data.key in localCollection.get()) {
                    localCollection.get()[data.key] = data.val()
                } else {
                    localCollection.insert(data.key, data.val()).save()
                }
                notifyHistoryChanged()
            }
        })
        // update method
        firebaseInsertHistory = (key, data) => {
            historyCollection.insert(key, data)
            console.log('saved to firebase', key)
        }
        firebaseUpdateHistory = (key, data) => {
            historyCollection.update(key, data)
            console.log('updated to firebase', key, data)
        }
    }


    //
    // TextEditor
    //

    const editor = Editor(EDITOR_CONFIG)
    await editor.render(animagine.element.prompt)

    editor.getCodemirror().on('keyup', () => {
        animagine.prompt.value = sanitaizePrompts(editor.value())
    })
    editor.getCodemirror().addKeyMap({
        'Ctrl-Enter': () => animagine.generate()
    })



    //
    // Hints
    //

    let hints = []
    function appendHints(_hints){
        hints = hints.concat(_hints)
        // remove duplicate
        hints = [ ...new Set(hints) ]

        localStorage.setItem('hints', hints.join('\n'))
        editor?.updateHints(hints, MAX_VISIBLE_HINTS)
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


    //
    // History View
    //

    const historyView = await HistoryView()
    historyView.on('itemOnClick', (data) => {
        console.log('selected history', data)

        historyView.hide()
        editor.set(data.prompt)

        animagine.fillInputs(data)
        animagine.refreshUI()

        localCollection.get()[data.date].usage = data.usage
        localCollection.save()

        firebaseUpdateHistory(data.date, objectExtract(data, STORED_HISTORY_PROPS))
    })


    //
    // Adjusting animagine UI / behavior with the extra features
    //

    const historyBtn = createEl('button')
        .text('History')
        .copyClassFrom(animagine.element.generate)
        .on('click', () => historyView.show())
        .get()

    const importHintsBtn = createEl('button')
        .text('Import Hint (*.txt)')
        .copyClassFrom(animagine.element.generate)
        .on('click', () => inputFile((text) => appendHints(txtToList(text)), '.txt'))
        .get()

    const importCredBtn = createEl('button')
        .text('Import Firebase cred (*.json)')
        .copyClassFrom(animagine.element.generate)
        .on('click', () => inputFile((data) => {
            const fbCred = JSON.parse(data)
            console.log('loaded firebase cred,', fbCred)
            localStorage.setItem('firebase', JSON.stringify(fbCred))
            initFirebase()
        }, '.json'))
        .get()

    const toggleThemeBtn = createEl('button')
        .text('Toggle Theme')
        .copyClassFrom(animagine.element.generate)
        .on('click', () => animagine.toggleDarkMode())
        .get()


    animagine.element.txtToImgTab.append(historyBtn)
    animagine.element.txtToImgTab.append(importHintsBtn)
    animagine.element.txtToImgTab.append(importCredBtn)
    animagine.element.txtToImgTab.append(toggleThemeBtn)


    animagine.on('generate', () => {
        const key = currentDate()
        const data = objectExtract(animagine.readInputs(), STORED_HISTORY_PROPS)
        data.prompt = editor.value()

        localCollection.insert(key, data).save()
        firebaseInsertHistory(key, data)
        notifyHistoryChanged()
    })

    animagine.on('refreshUI', () => {
        editor.set(animagine.prompt.value ?? '')
        animagine.prompt.value = sanitaizePrompts(animagine.prompt.value)

        historyView.setDarkMode(animagine.isDarkMode())

        // Adjust editor style with animagine theme
        el(editor.getCodemirror().getScrollerElement()).styles({'overflow-x': 'auto!important'})
        el(editor.getCodemirror().getWrapperElement())
            .copyStyleFrom(animagine.element.prompt,['background', 'color', 'borderRadius'])

        setTimeout(() => {
            editor.getCodemirror().focus()
            editor.getCodemirror().refresh()
        }, 0)
    })



    function notifyHistoryChanged(){
        const itemsObj = localCollection.get()
        const itemsArr = Object.keys(itemsObj).sort().map(key => ({ ...itemsObj[key], date: key}))

        if (itemsArr.length < 1) return

        historyView.setHistory(itemsArr)

        if (animagine.prompt.value.length < 1){
            animagine.fillInputs(itemsArr[0])
        }
    }

    initFirebase()
    notifyHistoryChanged()

    animagine.applyCustomUI()
    animagine.refreshUI()

}