/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Load Firebase Service Account Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(bodyParser.json());

const collectionName = 'items'; // Change this to your Firestore collection name

// ✅ Create (POST) - Add a new item
app.post('/items', async (req, res) => {
  try {
    const { name, image, description, comments, subtitle } = req.body;
    const newItem = { name, image, description, comments, subtitle, createdAt: admin.firestore.Timestamp.now() };

    const docRef = await db.collection(collectionName).add(newItem);
    res.status(201).json({ id: docRef.id, message: 'Item added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Read (GET) - Get all items
app.get('/items', async (req, res) => {
  try {
    const snapshot = await db.collection(collectionName).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Read (GET) - Get a single item by ID
app.get('/items/:id', async (req, res) => {
  try {
    const doc = await db.collection(collectionName).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update (PUT) - Edit an item
app.put('/items/:id', async (req, res) => {
  try {
    const { name, image, description, comments, subtitle } = req.body;
    const updateData = { name, image, description, comments, subtitle, updatedAt: admin.firestore.Timestamp.now() };

    await db.collection(collectionName).doc(req.params.id).update(updateData);
    res.status(200).json({ message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/items/:id/like", async (req, res) => {
  const { id } = req.params;
  const itemRef = db.collection("items").doc(id);

  try {
    await itemRef.update({ likes: admin.firestore.FieldValue.increment(1) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/items/:id/comment", async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const itemRef = db.collection("items").doc(id);

  try {
    await itemRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(comment),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Delete (DELETE) - Remove an item
app.delete("/items/:itemId/comments/:commentIndex", async (req, res) => {
  try {
    const { itemId, commentIndex } = req.params;

    const itemRef = db.collection("items").doc(itemId);
    const itemSnap = await itemRef.get();

    if (!itemSnap.exists) {
      return res.status(404).json({ error: "Item not found" });
    }

    let itemData = itemSnap.data();

    // Check if the comment index exists
    if (commentIndex < 0 || commentIndex >= itemData.comments.length) {
      return res.status(400).json({ error: "Invalid comment index" });
    }

    // Remove the comment at the given index
    itemData.comments.splice(commentIndex, 1);

    await itemRef.update({ comments: itemData.comments });

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Error deleting comment" });
  }
});


// ✅ Root Route
app.get('/', (req, res) => {
  res.send('Backend is running! 🚀');
});

// ✅ Start Server
exports.api = functions.https.onRequest(app);
