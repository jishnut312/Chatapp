const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ✅ Connect SQLite (creates chat.db file if not exists)
const db = new sqlite3.Database("./chat.db", (err) => {
  if (err) console.error("❌ DB connection error:", err.message);
  else console.log("✅ Connected to SQLite database");
});

// ✅ Create messages table
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT,
  text TEXT,
  time DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ✅ Socket events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send last 20 messages
  db.all("SELECT * FROM messages ORDER BY time ASC LIMIT 20", [], (err, rows) => {
    if (!err) socket.emit("load_messages", rows);
  });

  // Receive and save message
  socket.on("send_message", (data) => {
    const { user, text } = data;
    db.run("INSERT INTO messages (user, text) VALUES (?, ?)", [user, text], function (err) {
      if (!err) {
        const newMsg = { id: this.lastID, user, text, time: new Date() };
        io.emit("receive_message", newMsg);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ✅ Start server
server.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
