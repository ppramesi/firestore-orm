import { getStorage, ref, getDownloadURL } from "firebase/storage"
import { initializeApp } from "firebase/app"
import { doc, getDoc, getDocs, updateDoc, getFirestore, collection, query, onSnapshot } from 'firebase/firestore'
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
        })
    }

    buildCreateFunctions(){

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
        })
    }

    buildFetchFunctions(){
        Object.keys(this.collections).forEach((collectionName) => {
            // const capitalized = capitalizeFirstLetter(collectionName)
            const fetchByIdFunctionName = 'fetchById'
            const fetchByIdFunc = async function(id){
                const docRef = doc(this.db, collectionName, id)
                const docSnap = await getDoc(docRef)
                const data = docSnap.data()
                const fields = Object.keys(this.collectionConfig[collectionName])
                fields.forEach((field) => {
                    if(this.collectionConfig[collectionName][field].type == Firestorage){
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
                            if(this.collectionConfig[collectionName][field].type == Firestorage){
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
                            if(this.collectionConfig[collectionName][field].type == Firestorage){
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

            FirestoreOrm.definePropertyFunction(fetchByIdFunctionName, this.collections[collectionName].functions, fetchByIdFunc)
            FirestoreOrm.definePropertyFunction(fetchFunctionName, this.collections[collectionName].functions, fetchFunction)
            FirestoreOrm.definePropertyFunction(fetchQueryFunctionName, this.collections[collectionName].functions, fetchQueryFunction)
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