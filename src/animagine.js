import { queryEl } from './utils'

export function Animagine(){

    let defaultValue = {}
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

    let onRefreshUiCallback = function(){}
    function on(eventKey, callback){
        if (eventKey === 'load') onPageLoaded(callback)
        else if (eventKey === 'refreshUI') onRefreshUiCallback = callback
        else if (eventKey === 'generate') element.generate.addEventListener('click', callback)
    }
    function bindUI(){
        element.txtToImgTab = queryEl('#component-5').get()
        element.prompt      = queryEl('#component-8 textarea').get()
        element.generate    = queryEl('#component-49').get()
    }
    function applyCustomUI(){
        queryEl('body').styles({ position: 'relative' })
        queryEl(".gradio-container").styles({ 'max-width': '100%' })
        queryEl("#component-0").styles({ 'padding': '0', 'max-width': '100%' })
        // queryEl("#component-5").styles({ 'flex-grow': '3' })
        queryEl('#component-50 :first-child').styles({ 'z-index': 80 })
        queryEl('#title span').styles({
            'padding': '1rem 2rem',
            'color': 'var(--body-text-color)',
            'display': 'block',
            'width': '100%'
        })
    }
    function refreshUI(){
        // switch tab to re render the ui :)
        queryEl('#component-15-button').get().click()
        setTimeout(() => {
            queryEl('#component-6-button').get().click()
            onRefreshUiCallback()
        }, 200)
    }
    function fillInputs(data, defaultIfNull = false){
        for (const key in props){
            if (!(key in data) && defaultIfNull) {
                props[key].value = defaultValue[key]
            } else if (key in data) {
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
            if (!document.querySelector("#component-0")) return
            if (typeof gradio_config != 'object') return

            clearInterval(scan)
            defaultValue = readInputs()
            bindUI()
            callback()
        }, 1)
    }
    function generate(){
        element.generate.click()
    }
    function toggleDarkMode(state){
        const isDark = document.body.classList.contains('dark')
        state = state ?? !isDark
        document.body.classList.toggle('dark', state)
        refreshUI()
        applyCustomUI()
    }
    return {
        ...props, defaultValue, element,
        on, applyCustomUI, refreshUI, fillInputs, readInputs, generate, toggleDarkMode
    }
}