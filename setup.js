// setup.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Errore nella connessione al database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');

        // Creazione della tabella "users" se non esiste
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                profile_image TEXT
            )
        `, (err) => {
            if (err) {
                console.error('Errore nella creazione della tabella users:', err.message);
            } else {
                console.log('Tabella users pronta.');
            }
        });

        // Creazione della tabella "posts" se non esiste
        db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) {
                console.error('Errore nella creazione della tabella posts:', err.message);
            } else {
                console.log('Tabella posts pronta.');
            }
        });
    }
});

// Esporta la connessione al database
module.exports = db;
