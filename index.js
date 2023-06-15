const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// midlwares
app.use(cors());
app.use(express.json());

// ---------------------------

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  5;

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// ---------------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y1sglpm.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const usersCollection = client.db("campDb").collection("users");
    const classCollection = client.db("campDb").collection("class");
    const selectCollection = client.db("campDb").collection("select");

    // JWT TOKEN

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });
    // ------------------------------------
    // varify jwt-------

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ student: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: !user?.role };
      res.send(result);
    });

    // selected class api

    app.get("/select", async (req, res) => {
      const result = await selectCollection.find().toArray();
      res.send(result);
    });

    app.post("/select/check", async (req, res) => {
      const { userId, classId } = req.body;
      const existingSelection = await selectCollection.findOne({
        userId: userId,
        classId: classId,
      });

      if (existingSelection) {
        res.json({ selected: true });
      } else {
        res.json({ selected: false });
      }
    });

    app.post("/select", async (req, res) => {
      const selectedClass = req.body;

      // Check if the selected class already exists in the selectCollection
      const existingClass = await selectCollection.findOne({
        _id: selectedClass._id,
      });
      if (existingClass) {
        return res.json({ message: "Class already selected" });
      }

      selectCollection
        .insertOne(selectedClass)
        .then(() => {
          res.json({ message: "Class selected successfully" });
        })
        .catch((error) => {
          console.error("Error inserting document:", error);
          res.status(500).json({ message: "Failed to select class" });
        });
    });

    // users apis
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // my classes______________
    app.get("/class", async (req, res) => {
      // console.log(req.query);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // ----------------------------------

    app.get("/class", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.post("/class", async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    // ----------------------------------
    // admin api

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // --------------------------------
    // instructor api

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// ---------------------------

app.get("/", (req, res) => {
  res.send("web server is running");
});

app.listen(port, () => {
  console.log(`web server is running on port ${port}`);
});
