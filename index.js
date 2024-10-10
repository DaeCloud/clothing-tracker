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

function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  db.all(`PRAGMA table_info(${tableName});`, (err, tableInfo) => {
    if (err) {
      console.error(`Error retrieving table info for ${tableName}:`, err);
      return;
    }

    const columnExists = tableInfo.some(col => col.name === columnName);
    if (!columnExists) {
      console.log(`Adding missing column ${columnName} to ${tableName}`);
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`, (err) => {
        if (err) {
          console.error(`Error adding column ${columnName} to ${tableName}:`, err);
        } else {
          console.log(`Column ${columnName} added to ${tableName}.`);
        }
      });
    }
  });
}

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
        closest_color TEXT,
        location_id INTEGER,
        last_used DATE,
        image TEXT,  -- Add the image column here
        FOREIGN KEY (location_id) REFERENCES locations(id)
    )`);

    addColumnIfNotExists("clothes", "closest_color", "TEXT");
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
  const mainColor = hexToMainColor(color);
  db.run(
    `INSERT INTO clothes (name, type, color, color_name, closest_color, location_id, last_used, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, type, color, color_name, mainColor, location_id, last_used, image],
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
        SELECT clothes.id, clothes.name, types.name AS type, clothes.color, clothes.color_name, clothes.closest_color, clothes.last_used, clothes.image, locations.name AS location_name
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

// Converts hex to RGB values
function hexToRgb(hex) {
  let bigint = parseInt(hex.slice(1), 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  return [r / 255, g / 255, b / 255]; // normalize to [0, 1]
}

// Converts RGB to XYZ
function rgbToXyz(rgb) {
  let [r, g, b] = rgb;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  return [
    (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100,
    (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100,
    (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100
  ];
}

// Converts XYZ to LAB
function xyzToLab(xyz) {
  const [x, y, z] = xyz;
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let fx = x / refX > 0.008856 ? Math.pow(x / refX, 1/3) : (7.787 * x / refX) + 16 / 116;
  let fy = y / refY > 0.008856 ? Math.pow(y / refY, 1/3) : (7.787 * y / refY) + 16 / 116;
  let fz = z / refZ > 0.008856 ? Math.pow(z / refZ, 1/3) : (7.787 * z / refZ) + 16 / 116;

  return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Calculates the Euclidean distance between two LAB colors
function colorDistanceLab(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1[0] - lab2[0], 2) +
    Math.pow(lab1[1] - lab2[1], 2) +
    Math.pow(lab1[2] - lab2[2], 2)
  );
}

// Main function
function hexToMainColor(hex) {
  // Define more refined color categories
  const primaryColors = {
    // Red variations
    Red: [53.23, 80.09, 67.20],
    Red_Light: [60, 70, 60],
    Red_Dark: [45, 85, 60],
  
    // Green variations
    Green: [46.23, -51.7, 49.9],
    Green_Light: [50, -48, 45],
    Green_Dark: [40, -55, 55],
  
    // Blue variations
    Blue: [32.3, 79.2, -107.86],
    Blue_Light: [38, 75, -100],
    Blue_Dark: [28, 83, -115],
  
    // Orange variations
    Orange: [74.9, 23.9, 78.9],
    Orange_Light: [80, 20, 70],
    Orange_Dark: [68, 28, 85],
  
    // Yellow variations
    Yellow: [97.14, -21.56, 94.48],
    Yellow_Light: [100, -18, 90],
    Yellow_Dark: [92, -25, 100],
  
    // Brown variations
    Brown: [37.18, 23.4, 18.0],
    Brown_Light: [42, 20, 20],
    Brown_Dark: [32, 25, 15],
  
    // Black variations
    Black: [0, 0, 0],
    Black_Light: [10, 0, 0],
    Black_Dark: [5, 0, 0],
  
    // White variations
    White: [100, 0, 0],
    White_Light: [98, 0, 0],
    White_Dark: [94, 0, 0],
  
    // Gray variations
    Gray: [53.58, 0, 0],
    Gray_Light: [60, 0, 0],
    Gray_Dark: [45, 0, 0],
  
    // Pink variations
    Pink: [82.91, 23.4, -8.1],
    Pink_Light: [88, 20, -5],
    Pink_Dark: [75, 25, -10],
  
    // Purple variations
    Purple: [40.85, 58.36, -36.22],
    Purple_Light: [48, 55, -30],
    Purple_Dark: [35, 60, -40]
  };
  

  let rgb = hexToRgb(hex);
  let xyz = rgbToXyz(rgb);
  let lab = xyzToLab(xyz);

  let closestColor = null;
  let minDistance = Infinity;

  // Compare the hex color to each primary color in LAB space
  for (let color in primaryColors) {
    let distance = colorDistanceLab(lab, primaryColors[color]);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  if(closestColor.includes("_")){
    // drop everything from the _
    closestColor = closestColor.split("_")[0];
  }

  return closestColor;
}

