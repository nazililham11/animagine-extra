export function LocalCollection(path, limit = 250){
    let collection = JSON.parse(localStorage.getItem(path) ?? '{}')
    const $this = { save, insert, get, clear }

    function save(){
        localStorage.setItem(path, JSON.stringify(collection))
        return $this
    }
    function insert(key, data) {
        if (key in collection) return

        collection[key] = data
        limitCollection()
        return $this
    }
    function limitCollection(){
        do {
            let keys = Object.keys(collection).sort()
            if (keys.length >= limit){
                if (collection[keys.shift()].usage) continue
                delete collection[keys.shift()]
                continue
            }
        } while (false)

        return $this
    }
    function get(key){
        if (typeof key == 'undefined') return collection
        return collection[key]
    }
    function clear(){
        collection = {}
        save()

        return $this
    }

    return $this
}