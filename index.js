const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuweya4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

function verifyJWT(req, res, next) {
  console.log('hitting JWT verification');
  console.log(req.headers.authorization.split(' ')[1]);
  if (!req.headers.authorization) {return res.status(401).send({error: true, message: 'unauthorized access!'})}
  jwt.verify(req.headers.authorization.split(' ')[1], process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {return res.status(403).send({error: true, message: 'unauthorized access!'})}
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("checkouts");
    app.post('/jwt', (req, res) => {
        const user = req.body;
        console.log(user);
        const token = jwt.sign({data: user}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({token});

    })
    app.get('/services', async(req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/services/:id', async (req, res) => {
      const result = await serviceCollection.findOne({_id: new ObjectId(req.params.id)});
      res.send(result);
    })
    app.get('/checkouts', verifyJWT, async (req, res) => {
      console.log(req.decoded.data.email, req.query.email);
      if (req.decoded.data.email != req.query.email) {return res.status(403).send({error: 1, message: 'forbidden access'});}
      let query = {};
      if (req.query?.email) {query = {email: req.query.email}}
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/checkouts', async(req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })
    app.delete('/checkouts/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/checkouts/:id', async(req, res) => {
      const updateData = req.body;
      console.log(updateData);
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: updateData.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})