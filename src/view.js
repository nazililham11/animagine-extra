import { appendStyle, stringLimit, groupBy, getTimeStr, sort, createEl } from './utils'

export async function App(){

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

    function on(eventKey, callback) {
        if (eventKey === 'itemOnClick') itemOnClickCallback = callback
    }
    function itemOnClick(data){
        data['usage'] = (data['usage'] ?? 0) + 1
        itemOnClickCallback(data)
    }
    function show(){
        container.classList.toggle('hidden', false)
        searchBoxFocus()
    }
    function hide(){
        container.classList.toggle('hidden', true)
    }
    function setHistory(historyList) {
        Data.historyList = historyList
        renderHistory()
    }
    function addHistory(history) {
        Data.historyList.push(history)
        renderHistory()
    }

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
            sortCmd = (isAscending ? '' : '-') + sortCmd
            result = sort(result, sortCmd)
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

    const Header = {
        setup(){
            const search = ref(null)
            const onExit = () => hide()
            const onSearch = () => renderHistory(null, null, null, search.value.value)
            const onReset = () => renderHistory('date', null, 'date', '')
            const sortOnChange = (propKey) => renderHistory(propKey, null, null, null)
            const groupOnChange = (propKey) => renderHistory(null, null, propKey, null)
            const ascendingOnChange = (state) => renderHistory(null, state, null, null)
            const sortChoices = sortByChoices
            const groupChoices = groupByChoices

            searchBoxFocus = () => search.value.focus()

            return {
                search, sortChoices, groupChoices,
                onSearch, onReset , onExit, sortOnChange, groupOnChange, ascendingOnChange
            }
        },
        template: `
            <div class="header">
                <select @change="e => sortOnChange(e.target.value)">
                    <option v-for="_sort of sortChoices" :key="_sort" :value="_sort">
                        {{ _sort.split(':').pop() }}
                    </option>
                </select>
                <select @change="e => groupOnChange(e.target.value)">
                    <option v-for="_group of groupChoices" :key="_group" :value="_group">
                        {{ _group }}
                    </option>
                </select>
                <label style="display: flex;">
                    <input type="checkbox" @change="e => ascendingOnChange(e.target.checked)">
                    <span>ASC</span>
                </label>
                <input type="text" ref="search" placeholder="Search" @keyup.enter="onSearch">
                <button @click="onSearch">Search</button>
                <button @click="onReset">Reset</button>
                <button @click="onExit">Exit</button>
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
            <div class="history-item" @click="e => e.stopImmediatePropagation() || onClick()">
                <div class="params">
                    <span>{{ timeStr }}</span>
                    <span>{{ data.aspec_ratio }}</span>
                    <span>{{ data.style }}</span>
                    <span>{{ data.quality }}</span>
                    <span>{{ data.upscaler ? 'Upscaled' : 'Normal' }}</span>
                    <span v-show="data.usage">{{ data.usage }}</span>
                </div>
                <p class="positive" v-html="prompt"/>
                <p class="negative" v-html="negative_prompt"/>
            </div>
        `
    }

    const HistoryView = {
        setup(){
            const historyList = computed(() => Data.showedHistory)
            const onExit = () => hide()
            return { historyList, onExit }
        },
        components: { HistoryItem, Header },
        template: `
            <div class="history-container"
                @click="e => e.target.classList.contains('history-container') && onExit()">
                <Header/>
                <template v-for="_group of historyList" :key="_group.title">
                    <div class="group-header" v-show="(_group.title + '').length"
                        @click="_group.hide = !(_group.hide === true)">
                        {{ _group.hide ? '>' : '|' }} {{ _group.title }} ({{ _group.data.length }})
                    </div>
                    <template v-for="_history of _group.data" :key="_history.date">
                        <HistoryItem :data="_history" v-show="!_group.hide"/>
                    </template>
                </template>
            </div>
        `
    }

    const App = {
        components: { HistoryView },
        template : `<HistoryView/>`
    }

    // TODO: make better styling or use css framworks that doesnt overlap with gradio style
    const style = `
        .app-container.hidden { display: none; }
        .app-container {
            position: absolute;
            z-index: 90;
            height: auto;
            min-height: 100%;
            width: 100%;
            max-width: 100%;
            background-color: rgb(0 0 0 / 0.85);
            padding: 2rem;
            box-sizing: border-box;
        }
        .app-container button {
            text-wrap: nowrap;
        }
        /* Container */
        .history-container.hidden {
            display: none;
        }
        .history-container {
            display: grid;
            height: auto;
            width: 100%;
            grid-template-columns: repeat(1, minmax(0, 1fr));
            grid-auto-rows: min-content;
            gap: 2rem;
            font-size: 0.75rem;
            line-height: 1rem;
            color: rgb(255 255 255);
            backdrop-filter: blur(8px);
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
        @media (min-width: 1536px) {
            .history-container {
                grid-template-columns: repeat(5, minmax(0, 1fr));
            }
        }

        /* Container's item */
        .history-container .tab-container {
            grid-column: 1 / -1;
            display: flex;
            gap: 1rem;
        }
        .history-container .header input {
            width: 100%;
        }
        .history-container .header {
            display: flex;
            width: 100%;
            grid-column: 1 / -1;
            gap: 1rem;
        }
        .history-container .group-header {
            grid-column: 1 / -1;
            font-size: 1rem;
            line-height: 1.5rem;
            font-weight: 600;
        }
        .history-container .history-item:hover {
            background-color: rgb(255 255 255 / 0.1);
        }
        .history-container .history-item {
            display: flex;
            cursor: pointer;
            flex-direction: column;
            background-color: rgb(255 255 255 / 0.05);
            padding: 1rem;
            gap: 0.5rem;
        }

        /* Item */
        .history-item p {
            margin: 0;
        }
        .history-item .negative {
            color: rgb(239 68 68 / 0.75);
        }
        .history-item .params, .history-item .negative {
            opacity: 0.75;
            text-wrap: wrap;
            max-width: 100%;
        }
        .history-item .params {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: start;
            justify-items: start;
        }

        .history-item .params span {
            text-align: center;
            padding: 0 1ch;
            background-color: rgb(0 0 0 / 0.5);
        }
    `
    appendStyle(style)


    const container = createEl('div').attrs({ id: 'app', class: 'app-container' }).get()
    document.body.append(container)

    createApp(App).mount('#app')


    return {
        show, hide, setHistory, addHistory, on
    }
}