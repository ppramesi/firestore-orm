import { getStorage, ref, getDownloadURL } from "firebase/storage"
import { initializeApp } from "firebase/app"
import { doc, getDoc, addDoc, getDocs, updateDoc, getFirestore, collection, query, onSnapshot } from 'firebase/firestore'
import Firestorage from "../types/Firestorage.js"
// import { capitalizeFirstLetter } from '../utils/index.js'

class FirestoreOrm{
    constructor(firebaseConfig, collectionConfig){
        this.firebaseConfig = firebaseConfig
        this.collectionConfig = collectionConfig

        this.app = initializeApp(this.firebaseConfig)
        this.db = getFirestore(this.app)
        this.storage = getStorage(this.app)

        this.collections = Object.keys(this.collectionConfig).reduce((acc, collConfig) => {
            acc[collConfig] = {
                collection: collection(this.db, collConfig),
                functions: {}
            }
            this[collConfig] = {
                functions: {}
            }
            return acc
        }, {})

        this.buildFetchFunctions()
        this.buildUpdateFunctions()
        this.buildDeleteFunctions()
        this.buildCreateFunctions()
        this.buildOnSnapshotRegistrar()
    }

    buildOnSnapshotRegistrar(){
        Object.keys(this.collections).forEach((collectionName) => {
            const registrarFunctionName = 'registerOnSnapshot'
            const registrarFunction = function(func, error, queries = []){
                let q
                if(queries.length > 0){
                    q = query(this.collections[collectionName].collection, ...queries)
                }else{
                    q = this.collections[collectionName].collection
                }

                return onSnapshot(q, func, error)
            }.bind(this)
            FirestoreOrm.definePropertyFunction(registrarFunctionName, this.collections[collectionName].functions, registrarFunction)
            FirestoreOrm.definePropertyFunction(registrarFunctionName, this[collectionName].functions, registrarFunction)
        })
    }

    buildCreateFunctions(){
        Object.keys(this.collections).forEach((collectionName) => {
            const createFunctionName = 'create'
            const createFunction = async function(data){
                const docRef = collection(this.db, collectionName)
                const procData = Object.keys(this.collectionConfig[collectionName]).reduce((acc, field) => {
                    if(data[field] !== undefined && data[field] !== null){
                        acc[field] = data[field]
                    }
                    return acc
                }, {})
                return new Promise((resolve, reject) => {
                    addDoc(docRef, procData).then((docRef) => {
                        resolve(docRef.id)
                    })
                    .catch(reject)
                })
            }.bind(this)
            FirestoreOrm.definePropertyFunction(createFunctionName, this.collections[collectionName].functions, createFunction)
            FirestoreOrm.definePropertyFunction(createFunctionName, this[collectionName].functions, createFunction)
        })
    }

    buildDeleteFunctions(){
        Object.keys(this.collections).forEach((collectionName) => {
            const deleteByIdFunctionName = 'deleteById'
            const deleteByIdFunction = async function(id, data){
                const docRef = doc(this.db, collectionName, id)

                return new Promise((resolve, reject) => {
                    deleteDoc(docRef).then((updt) => {
                        resolve(true)
                    })
                    .catch(reject)
                })
            }.bind(this)
            FirestoreOrm.definePropertyFunction(deleteByIdFunctionName, this.collections[collectionName].functions, deleteByIdFunction)
            FirestoreOrm.definePropertyFunction(deleteByIdFunctionName, this[collectionName].functions, deleteByIdFunction)
        })
    }

    buildUpdateFunctions(){
        Object.keys(this.collections).forEach((collectionName) => {
            const updateByIdFunctionName = 'updateById'
            const updateByIdFunction = async function(id, data){
                const docRef = doc(this.db, collectionName, id)

                return new Promise((resolve, reject) => {
                    updateDoc(docRef, { ...data }).then((updt) => {
                        resolve(true)
                    })
                    .catch(reject)
                })
            }.bind(this)
            FirestoreOrm.definePropertyFunction(updateByIdFunctionName, this.collections[collectionName].functions, updateByIdFunction)
            FirestoreOrm.definePropertyFunction(updateByIdFunctionName, this[collectionName].functions, updateByIdFunction)
        })
    }

    buildFetchFunctions(){
        Object.keys(this.collections).forEach((collectionName) => {
            const checkByIdFunctionName = 'checkById'
            const checkByIdFunc = async function(id){
                const docRef = doc(this.db, collectionName, id)
                const docSnap = await getDoc(docRef)
                return docSnap.exists()
            }.bind(this)

            const checkByQueryFunctionName = 'checkByQuery'
            const checkByQueryFunc = async function(queries){
                const snapshot = await getDocs(query(this.collections[collectionName].collection, ...queries))
                return !snapshot.empty
            }.bind(this)

            // const capitalized = capitalizeFirstLetter(collectionName)
            const fetchByIdFunctionName = 'fetchById'
            const fetchByIdFunc = async function(id){
                const docRef = doc(this.db, collectionName, id)
                const docSnap = await getDoc(docRef)
                const data = docSnap.data()
                const fields = Object.keys(this.collectionConfig[collectionName])
                fields.forEach((field) => {
                    if(this.collectionConfig[collectionName][field].type == Firestorage && /^gs\:\/\//.test(data[field])){
                        toResolveKeys.push(field)
                        toResolve.push(getDownloadURL(ref(this.storage, data[field])))
                    }
                })
                if(toResolve.length > 0){
                    const urls = await Promise.all(toResolve)
                    toResolveKeys.forEach((fieldName, idx) => {
                        data[fieldName] = urls[idx]
                    })
                }
                return data
            }.bind(this)

            const fetchQueryFunctionName = 'fetchQuery'
            const fetchQueryFunction = async function(queries){
                const snapshot = await getDocs(query(this.collections[collectionName].collection, ...queries))
                const promises = []
                const objs = []
                snapshot.forEach((doc) => {
                    objs.push(doc)
                })
                for(let i = 0; i < objs.length; i++){
                    promises.push(new Promise(async (resolve, reject) => {
                        const data = objs[i].data()
                        data.id = objs[i].id
                        const toResolveKeys = []
                        const toResolve = []
                        const fields = Object.keys(this.collectionConfig[collectionName])
                        fields.forEach((field) => {
                            if(this.collectionConfig[collectionName][field].type == Firestorage && /^gs\:\/\//.test(data[field])){
                                toResolveKeys.push(field)
                                toResolve.push(getDownloadURL(ref(this.storage, data[field])))
                            }
                        })
                        if(toResolve.length > 0){
                            const urls = await Promise.all(toResolve)
                            toResolveKeys.forEach((fieldName, idx) => {
                                data[fieldName] = urls[idx]
                            })
                            resolve(data)
                        }else{
                            resolve(data)
                        }
                    }))
                }
                return await Promise.all(promises)
            }.bind(this)

            const fetchFunctionName = 'fetch'
            const fetchFunction = async function(){
                const snapshot = await getDocs(this.collections[collectionName].collection)
                const promises = []
                const objs = []
                snapshot.forEach((doc) => {
                    objs.push(doc)
                })
                for(let i = 0; i < objs.length; i++){
                    promises.push(new Promise(async (resolve, reject) => {
                        const data = objs[i].data()
                        data.id = objs[i].id
                        const toResolveKeys = []
                        const toResolve = []
                        const fields = Object.keys(this.collectionConfig[collectionName])
                        fields.forEach((field) => {
                            if(this.collectionConfig[collectionName][field].type == Firestorage && /^gs\:\/\//.test(data[field])){
                                toResolveKeys.push(field)
                                toResolve.push(getDownloadURL(ref(this.storage, data[field])))
                            }
                        })
                        if(toResolve.length > 0){
                            const urls = await Promise.all(toResolve)
                            toResolveKeys.forEach((fieldName, idx) => {
                                data[fieldName] = urls[idx]
                            })
                            resolve(data)
                        }else{
                            resolve(data)
                        }
                    }))
                }
                return await Promise.all(promises)
            }.bind(this)

            FirestoreOrm.definePropertyFunction(checkByIdFunctionName, this.collections[collectionName].functions, checkByIdFunc)
            FirestoreOrm.definePropertyFunction(checkByQueryFunctionName, this.collections[collectionName].functions, checkByQueryFunc)
            FirestoreOrm.definePropertyFunction(fetchByIdFunctionName, this.collections[collectionName].functions, fetchByIdFunc)
            FirestoreOrm.definePropertyFunction(fetchFunctionName, this.collections[collectionName].functions, fetchFunction)
            FirestoreOrm.definePropertyFunction(fetchQueryFunctionName, this.collections[collectionName].functions, fetchQueryFunction)

            FirestoreOrm.definePropertyFunction(checkByIdFunctionName, this[collectionName].functions, checkByIdFunc)
            FirestoreOrm.definePropertyFunction(checkByQueryFunctionName, this[collectionName].functions, checkByQueryFunc)
            FirestoreOrm.definePropertyFunction(fetchByIdFunctionName, this[collectionName].functions, fetchByIdFunc)
            FirestoreOrm.definePropertyFunction(fetchFunctionName, this[collectionName].functions, fetchFunction)
            FirestoreOrm.definePropertyFunction(fetchQueryFunctionName, this[collectionName].functions, fetchQueryFunction)
        })
    }

    static definePropertyFunction(name, obj, func){
        Object.defineProperty(obj, name, {
            value: func,
            writable: false,
            enumerable: false
        })
    }
}

export default FirestoreOrm