import { stringLimit, groupBy, getTimeStr, sort, createEl, el, appendStyle, loadExternal } from './utils'

// 
// History View
// 

export async function App(){

    loadExternal('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css')

    const VUE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.32/vue.esm-browser.min.js'
    const { createApp, ref, computed, reactive } = await import(VUE_CDN)
    const MAX_VISIBLE_HISTORY = 500

    const Data = reactive({
        historyList: [],
        showedHistory: {},
    })

    const groupByChoices = 'date|usage|aspec_ratio|quality|style|upscale|-'.split('|')
    const sortByChoices = 'date:date|num:usage|str:aspec_ratio|str:quality|str:style|str:upscale'.split('|')

    let searchBoxFocus = function(){}
    let itemOnClickCallback = function(){}


    let currentSortCmd = sortByChoices[0]
    let currentIsAscending = false
    let currentGroupBy = groupByChoices[0]
    let currentSearchBy = ''
    function renderHistory(sortCmd, isAscending, groupKey, keywords){
        sortCmd = currentSortCmd = sortCmd ?? currentSortCmd
        isAscending = currentIsAscending = isAscending ?? currentIsAscending
        keywords = currentSearchBy = keywords ?? currentSearchBy
        groupKey = currentGroupBy = groupKey ?? currentGroupBy

        let result = Data.historyList
        if (keywords && keywords.length > 0){
            keywords = keywords.toLowerCase()
            result = result.filter(h => {
                const payload = Object.values(h).join(' , ').toLowerCase()
                for (const keyword of keywords.split(' ')){
                    if (payload.indexOf(keyword) == -1) return false
                }
                return true
            })
        }
        if (sortCmd){
            result = sort(result, (isAscending ? '' : '-') + sortCmd)
        }

        result = result.slice(0, MAX_VISIBLE_HISTORY)

        if (groupKey === 'date') {
            result = groupBy(result, (data) => new Date(data.date).toDateString())
        } else if (typeof groupKey == 'string'
            && groupByChoices.indexOf(groupKey) > -1
            && groupKey !== '-'
        ) {
            result = groupBy(result, (data) => data[groupKey])
        } else {
            result = groupBy(result, () => ' ')
        }

        Data.showedHistory =  Array.from(result.entries()).map(([key, value]) => {
            return { title: key, hide: false, data: value}
        });
    }

    const Dropdown = {
        props: ['items', 'label'],
        emits: ['onChange'],
        template: `
            <label class="col">
                <small class="text-secondary text-small">{{ label }}</small>
                <select class="form-control form-control-sm"
                    @change="e => $emit('onChange', e.target.value)">
                    <option v-for="_item of items" :key="_item.value" :value="_item.value">
                        {{ _item.title }}
                    </option>
                </select>
            </label>
        `
    }

    const Header = {
        setup(){
            const search = ref(null)
            const onExit = () => hide()
            const onSearch = () => renderHistory(null, null, null, search.value.value)
            const onReset = () => renderHistory(sortByChoices[0], false, groupByChoices[0], '')
            const sortOnChange = (sortCmd) => renderHistory(sortCmd, null, null, null)
            const groupOnChange = (propKey) => renderHistory(null, null, propKey, null)
            const ascendingOnChange = (state) => renderHistory(null, state, null, null)
            const sortChoices = sortByChoices.map(s => ({ title: s.split(':').pop(), value: s }))
            const groupChoices = groupByChoices.map(s => ({ title: s, value: s }))

            searchBoxFocus = () => search.value.focus()

            return {
                search, sortChoices, groupChoices,
                onSearch, onReset , onExit, sortOnChange, groupOnChange, ascendingOnChange
            }
        },
        components: { Dropdown },
        template: `
            <div class="row m-0 g-3 w-100">
                <div class="col-sm-6 col-12 row align-items-end gap-sm-3 gap-2">
                    <label class="col-auto form-check form-switch my-auto d-flex
                            flex-column align-items-end text-secondary text-small">
                        Asc
                        <input class="form-check-input" type="checkbox"
                            @change="e => ascendingOnChange(e.target.checked)">
                    </label>
                    <Dropdown label="Sort By" :items="sortChoices" @onChange="sortOnChange"/>
                    <Dropdown label="Group By" :items="groupChoices" @onChange="groupOnChange"/>
                </div>

                <div class="col-sm-6 col-12 d-flex align-items-end gap-sm-3 gap-2">
                    <input type="text" class="form-control form-control-sm flex-fill"
                        ref="search" placeholder="Search" @keyup.enter="onSearch">
                    <button class="btn btn-sm btn-outline-primary" @click="onSearch">Search</button>
                    <button class="btn btn-sm btn-outline-primary" @click="onReset">Reset</button>
                    <button class="btn btn-sm btn-outline-primary" @click="onExit">Exit</button>
                </div>
            </div>
        `
    }

    const HistoryItem = {
        props: ['data'],
        setup(props){
            const timeStr = getTimeStr(props.data.date)
            const onClick = () => itemOnClick(props.data)

            const limitOpt = { maxLine: 5, maxCharacters:  300 }
            const parsePrompt = (str) => stringLimit(str, limitOpt).replaceAll('\n', '<br>')

            const prompt = parsePrompt(props.data.prompt)
            const negative_prompt = parsePrompt(props.data.negative_prompt)

            return { onClick, limitOpt, timeStr, prompt, negative_prompt }
        },
        template: `
            <button class="card position-relative p-0 btn btn-link 
                    text-decoration-none history-item"
                @click="e => e.stopImmediatePropagation() || onClick()">
                <div class="card-header">
                    <small class="me-1 mb-1 badge border">{{ timeStr }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.aspec_ratio }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.style }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.quality }}</small>
                    <small class="me-1 mb-1 badge border border-success"
                        v-show="data.upscaler">Upscaled</small>
                </div>
                <div class="card-body d-flex flex-wrap">
                    <p class="text-small text-start" v-html="prompt"/>
                    <p class="text-small text-start text-danger" v-html="negative_prompt"/>
                </div>
                <span class="position-absolute top-0 start-100
                        translate-middle badge rounded-pill bg-danger"
                    v-show="data.usage">
                    {{ data.usage }}
                </span>
            </button>
        `
    }

    const HistoryList = {
        setup(){
            const historyList = computed(() => Data.showedHistory)
            const onExit = () => hide()
            return { historyList, onExit }
        },
        components: { HistoryItem },
        template: `
            <template v-for="_group of historyList" :key="_group.title">
                <button class="col-12 text-start mt-4 text-base btn btn-link 
                        text-decoration-none fs-5 border-bottom"
                    v-show="(_group.title + '').length"
                    @click="_group.hide = !_group.hide">
                    {{ _group.hide ? '&#x25B8;' : '&#x25BE;' }}
                    {{ _group.title }} ({{ _group.data.length }})
                </button>
                <div class="col-lg-3 col-md-4 col-sm-6 col-12" v-show="!_group.hide"
                    v-for="_history of _group.data" :key="_history.date">
                    <HistoryItem :data="_history" />
                </div>
            </template>
        `
    }

    const App = {
        components: { HistoryList, Header },
        template : `
            <div class="modal-dialog modal-fullscreen modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <Header/>
                    </div>
                    <div class="modal-body">
                        <div class="row g-4">    
                            <HistoryList/>
                        </div>
                    </div>
                </div>
            </div>
        `
    }


    const container = createEl('div').attrs({ id: 'app', class: 'modal' }).get()

    document.body.append(container)

    createApp(App).mount('#app')

    appendStyle(`
        .history-item:hover {
            border-color: rgba(var(--bs-primary-rgb),var(--bs-border-opacity))!important;
        }
        .text-base { color: var(--bs-body-color); }
        .text-small { font-size: .75em; }
    `)


    function on(eventKey, callback) {
        if (eventKey === 'itemOnClick') itemOnClickCallback = callback
    }
    function itemOnClick(data){
        data['usage'] = (data['usage'] ?? 0) + 1
        itemOnClickCallback(data)
    }
    function show(){
        container.classList.toggle('d-block', true)
        searchBoxFocus()
    }
    function hide(){
        container.classList.toggle('d-block', false)
    }
    function setHistory(historyList) {
        Data.historyList = historyList
        renderHistory()
    }
    function addHistory(history) {
        Data.historyList.push(history)
        renderHistory()
    }
    function setDarkMode(state) {
        el(container).attrs({ 'data-bs-theme' : state ? 'dark' : 'light' })
    }

    return {
        show, hide, setHistory, addHistory, on, setDarkMode
    }
}