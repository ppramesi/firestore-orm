import FirestoreOrm from "../orm/FirestoreOrm.js";
import Firestorage from "../types/Firestorage.js";
import { where } from "firebase/firestore"
import assert from 'assert'

const config = {
    apiKey: 'AIzaSyAKFKANEl25fzDYPCddBqMUlmnMiM5LFDk',
    authDomain: 'gift-of-indonesia.firebaseapp.com',
    projectId: 'gift-of-indonesia',
    storageBucket: 'gift-of-indonesia.appspot.com',
    messagingSenderId: '500343826350',
    appId: '1:500343826350:web:073bd69dfe7437b5d64a3f',
    measurementId: 'G-8DPQ0VWLYQ'
}

const collection = {
    recipes: {
        description: {
            type: String
        },
        image: {
            type: Firestorage
        },
        ingredients: {
            type: Array
        },
        text: {
            type: String
        },
        title: {
            type: String
        },
        tags: {
            type: Array
        }
    },
    spices: {
        description: {
            type: String
        },
        image: {
            type: Firestorage
        },
        name: {
            type: String
        },
        price: {
            type: Number
        }
    },
    connections: {
        identifier: {
            type: String
        },
        open: {
            type: Number
        }
    }
}
const orm = new FirestoreOrm(config, collection);

describe('Api', function(){
    it('fetch', async function(){
        const fetched = await orm.collections.recipes.functions.fetch()
        console.log(fetched)
        assert.notEqual(fetched.length, 0)

        const promises = fetched.reduce((acc, v) => {
            for(let i = 0; i < Math.floor(Math.random() * 5 + 3); i++){
                acc.push(orm.collections.recipes.functions.create(v))
            }
            return acc
        }, [])

        console.log(await Promise.all(promises))
    })
})