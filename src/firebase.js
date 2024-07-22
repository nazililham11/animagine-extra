// 
// Firebase
// 

var FirebaseApp, FirebaseDB
var app, database

export async function loadLibs(){
    FirebaseApp = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js')
    FirebaseDB = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js')
}
// TODO: make proper connection checking
export function isConnected(){
    return typeof app !== 'undefined' && typeof database !== 'undefined'
}
export function isLibsLoaded(){
    return typeof FirebaseApp !== 'undefined' && typeof FirebaseDB !== 'undefined'
}
export async function initFirebase(config){

    if (typeof config != 'object') return
    if (Object.keys(config) < 3) return
    if (isConnected()) return

    if (!isLibsLoaded()) await loadLibs()

    try {
        app = FirebaseApp.initializeApp(config)
        database = FirebaseDB.getDatabase(app)
        console.log('connected to firebase')
    } catch (e) {
        console.log(e)
    }
}
export async function initCollection(path, options){
    if (!isConnected()) return

    const limit = options.limit ?? 100
    const onlyOnce = options.onlyOnce ?? true

    const onChange = options.onChange ?? function(){}
    const onChildAdded = options.onChildAdded ?? function(){}

    const collectionRef = FirebaseDB.ref(database, path)
    const lastHistory = FirebaseDB.query(collectionRef, FirebaseDB.limitToLast(limit))

    FirebaseDB.onValue(lastHistory, snapshot => onChange(snapshot), { onlyOnce })
    FirebaseDB.onChildAdded(lastHistory, data => onChildAdded(data))

    function insert(key, data){
        const collectionRef = FirebaseDB.ref(database, path + key)
        FirebaseDB.set(collectionRef, data)
    }

    function update(key, data){
        const itemRef = FirebaseDB.ref(database, path + key)
        FirebaseDB.update(itemRef, data)
    }

    return { insert, update }
}