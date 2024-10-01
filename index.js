const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Initialize express app
const app = express();
const PORT = 3000;

// Middleware
// Increase the limit to 10mb or as needed
app.use(bodyParser.json({ limit: '10mb' })); // For application/json
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true })); // For application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Initialize SQLite database
const dbPath = path.join(__dirname, "data", "tracker.db");
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clothes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT,
        color TEXT,
        color_name TEXT,
        location_id INTEGER,
        last_used DATE,
        image TEXT,  -- Add the image column here
        FOREIGN KEY (location_id) REFERENCES locations(id)
    )`);
});

// Endpoints

// 1. Add a new location
app.post("/locations", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Location name is required" });
  }
  db.run(`INSERT INTO locations (name) VALUES (?)`, [name], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
});

app.post("/types", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "type name is required" });
  }
  db.run(`INSERT INTO types (name) VALUES (?)`, [name], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
});

// 2. Get all locations
app.get("/locations", (req, res) => {
  db.all(`SELECT * FROM locations`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get("/types", (req, res) => {
  db.all(`SELECT * FROM types`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 3. Add a new clothing item
app.post("/clothes", (req, res) => {
  const { name, type, color, color_name, location_id, last_used, image } =
    req.body; // Added image
  db.run(
    `INSERT INTO clothes (name, type, color, color_name, location_id, last_used, image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, type, color, color_name, location_id, last_used, image],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// 4. Get all clothes
app.get("/clothes", (req, res) => {
  const query = `
        SELECT clothes.id, clothes.name, types.name AS type, clothes.color, clothes.color_name, clothes.last_used, clothes.image, locations.name AS location_name
        FROM clothes
        JOIN locations ON clothes.location_id = locations.id
        JOIN types ON clothes.type = types.id
    `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 5. Get clothes by location
app.get("/clothes/location/:location_id", (req, res) => {
  const { location_id } = req.params;
  db.all(
    `SELECT * FROM clothes WHERE location_id = ?`,
    [location_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// 6. Update a clothing item
app.put("/clothes/:id", (req, res) => {
  const { id } = req.params;
  const { name, type, color, location_id, last_used, image } = req.body; // Fields to update

  // Initialize an array to hold the fields to update and their corresponding values
  const fields = [];
  const values = [];

  // Check each field and add it to the query if it's provided
  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (type !== undefined) {
    fields.push("type = ?");
    values.push(type);
  }
  if (color !== undefined) {
    fields.push("color = ?");
    values.push(color);
  }
  if (location_id !== undefined) {
    fields.push("location_id = ?");
    values.push(location_id);
  }
  if (last_used !== undefined) {
    fields.push("last_used = ?");
    values.push(last_used);
  }
  if (image !== undefined) {
    fields.push("image = ?");
    values.push(image);
  }

  // If no fields are provided, respond with an error
  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  // Append the id to the values array for the WHERE clause
  values.push(id);

  // Build the SQL query
  const sql = `UPDATE clothes SET ${fields.join(", ")} WHERE id = ?`;

  // Execute the query
  db.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Clothing item updated successfully" });
  });
});

// 7. Delete a clothing item
app.delete("/clothes/:id", (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM clothes WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Clothing item deleted successfully" });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
