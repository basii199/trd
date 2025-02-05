import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue, Filter } from 'firebase-admin/firestore';

import fs from "fs";
const serviceAccount = JSON.parse(fs.readFileSync("./private/fkexisaf-firebase-adminsdk-fbsvc-ddeb852083.json", "utf-8"));

import express from "express";
import cors from "cors";
import bodyParser from 'body-parser';

//import { jokes } from './jokes.js';

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore()

const jokesRef = db.collection('jokes')


//const snapShot = await jokesRef.get()

/* const jokeRef = jokesRef.doc('1')
const joke = await jokeRef.get()
console.log(joke.data()) */

async function getSize(){
  const snapShot = await jokesRef.get()
  return snapShot.size 
}

/* jokes.forEach((joke, i)=>{
  writeJoke(joke, i)
}) */

async function writeJoke (obj, i) {
  await jokesRef.doc(`${i}`).set(obj)
}

/* await testRef.doc('1').set({
  joke: 'funny',
  laugh: true
  }) */
 
 /* const testReadRef = db.collection('test').doc('1')
 const mydoc = await testReadRef.get()
 if(!mydoc.exists){
  console.log('No such document')
} else {
  console.log(mydoc.data())
} */


const expApp = express();

expApp.use(cors())
expApp.use(bodyParser.urlencoded( {extended: true}))

//CRUD

//CREATE JOKE

/* expApp.post("/createjoke", async (req, res)=>{
  const id = await getSize() + 1;

  const jokeData = {
    id: id,
    joke: req.body.joke,
    private: false 
  }
  await writeJoke(jokeData, id)

  console.log('joke recorded')
  res.json(jokeData)
}) */

expApp.post("/jokes/create", async (req, res) => {
  try {
    const size = await getSize();
    const id = size + 1;
    const jokeData = {
      id: id,
      joke: req.body.joke,
      private: false
    };

    await writeJoke(jokeData, id); 
    console.log("Joke recorded");
    res.json(jokeData);
  } 
  catch (error) {
    console.error("Error creating joke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//READ JOKES

expApp.get("/jokes", async (req, res) => {
  try {
    const pageSize = 5;
    const nextCursor = req.query.next || null; // Cursor for "Next"
    const prevCursor = req.query.prev || null; // Cursor for "Previous"

    let query = jokesRef.orderBy("id").limit(pageSize); // Base query

    if (nextCursor) {
      const nextSnapshot = await jokesRef.doc(nextCursor).get();
      if (nextSnapshot.exists) {
        query = query.startAfter(nextSnapshot);
      }
    } else if (prevCursor) {
      const prevSnapshot = await jokesRef.doc(prevCursor).get();
      if (prevSnapshot.exists) {
        query = query.startAt(prevSnapshot);
      }
    }

    const snapshot = await query.get();
    const jokes = snapshot.docs.map((doc) => ({ ...doc.data() }));

    const firstDoc = snapshot.docs[0];
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    res.json({
      jokes,
      next: lastDoc ? lastDoc.id : null,
      prev: firstDoc ? firstDoc.id : null,
    });
  } 
  catch (error) {
    console.error("Error fetching jokes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//UPDATE JOKES

expApp.get("/jokes/update", async (req, res) => {
  try{
    let query = jokesRef.where("private", "==", false)
    const ss = await query.get()

    if (ss.empty) {
      return res.status(404).json({ message: "No jokes found" });
    }
  
    const jokes = ss.docs.map(doc=> doc.data())
    res.json(jokes)
  }
  catch (error) {
    console.error("Error fetching jokes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
})

expApp.put("/jokes/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const jokeRef = jokesRef.doc(`${id}`);

    const ss = await jokeRef.get();

    if (!ss.exists) {
      return res.status(404).json({ message: "Joke not found" });
    }

    const updatedJoke = {
      ...ss.data(),
      joke: req.body.joke || ss.data().joke,
      private: req.body.private ?? ss.data().private,
    };

    await jokeRef.update(updatedJoke);

    res.json({ message: "Joke updated successfully", joke: updatedJoke });
  } catch (error) {
    console.error("Error updating joke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

expApp.delete("/jokes/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const jokeRef = jokesRef.doc(id);

    const ss = await jokeRef.get();

    if (!ss.exists || ss.data().private === true) {
      return res.status(404).json({ message: "Joke not found or not editable" });
    }

    await jokeRef.delete();

    res.json({ message: "Joke deleted successfully" });
  } catch (error) {
    console.error("Error deleting joke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

expApp.listen(4000, ()=>{
  console.log('Server running on port 4000')
})

export default expApp;