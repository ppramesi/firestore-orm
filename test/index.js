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
    testing: {
        test: {
            type: String
        },
        hello: {
            type: String
        }
    }
}
const orm = new FirestoreOrm(config, collection);

describe('Api', function(){
    it('fetch', async function(){
        const fetched = await orm.collections.testing.functions.create({ hello: 'hi', test: 'hoha' })
        console.log(fetched)
        assert.notEqual(fetched.length, 0)
    })
})