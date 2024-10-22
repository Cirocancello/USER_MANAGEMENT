const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');


// Importa il database configurato in setup.js
const db = require('./setup');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configura il middleware di sessione
app.use(session({
    secret: 'your-secret-key', // Scegli una chiave segreta
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Imposta su true se stai usando HTTPS
}));

// Imposta il motore di visualizzazione EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route per la registrazione
app.get('/register', (req, res) => {
    try {
        res.render('register');
    } catch (error) {
        console.log(path.join(__dirname, 'views'));
        console.error('Errore durante il rendering della vista:', error);
        res.status(500).send('Errore interno del server');
    }
});

// Registrazione
app.post('/register', upload.single('profile_image'), async (req, res) => {
    const { username, email, password } = req.body;
    const profileImage = req.file ? req.file.filename : null; // Ottieni il nome del file caricato

    if (!password) {
        return res.status(400).send('Password is required');
    }

    try {
        // Cifra la password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserisci un nuovo utente nel database
        db.run(`INSERT INTO users (username, email, password, profile_image) VALUES (?, ?, ?, ?)`,
            [username, email, hashedPassword, profileImage], function (err) {
                if (err) {
                    console.error(err.message);
                    res.send('Errore durante la registrazione');
                } else {
                    res.redirect('/login'); // Reindirizza alla pagina di login dopo la registrazione
                }
            });
    } catch (err) {
        console.error('Errore durante la cifratura della password:', err);
        res.status(500).send('Errore durante la registrazione');
    }
});



// Route per la pagina di login
app.get('/login', (req, res) => {
    res.render('login'); // Assicurati che ci sia un file login.ejs nella cartella views
});

// Route per gestire il login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Cerca l'utente nel database
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) {
            console.error('Errore durante la query del database:', err.message);
            res.status(500).send('Errore durante il login');
        } else if (!user) {
            // Se l'utente non esiste, ritorna "Credenziali non valide"
            console.log('Utente non trovato');
            res.status(400).send('Credenziali non valide');
        } else {
            // Confronta la password inserita con quella hash salvata nel database
            try {
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    console.log('Accesso riuscito');
                    res.redirect(`/profile/${user.id}`);
                } else {
                    console.log('Password errata');
                    res.status(400).send('Credenziali non valide');
                }
            } catch (err) {
                console.error('Errore durante il confronto della password:', err.message);
                res.status(500).send('Errore durante il login');
            }
        }
    });
});



// Logout
app.post('/logout', (req, res) => {
    // Qui puoi gestire la logica per il logout, ad esempio rimuovendo la sessione
    req.session = null; // Se usi sessioni, questo rimuove la sessione dell'utente
    res.redirect('/login'); // Reindirizza alla pagina di login
});


// Profilo utente
app.get('/profile/:id', (req, res) => {
    const userId = req.params.id; // Assicurati che userId venga definito qui

    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) {
            console.error(err.message);
            return res.send('Utente non trovato');
        }

        // Ora userId è definito e può essere utilizzato
        db.all('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, posts) => {
            if (err) {
                console.error(err);
                return res.send('Errore durante il caricamento dei post');
            }
            // Renderizza la pagina del profilo con l'utente e i post
            res.render('profile', { user, posts });
        });
    });
});


// Aggiornamento profilo
app.post('/update-profile/:id', upload.single('profile_image'), (req, res) => {
    const userId = req.params.id;
    const { username, email } = req.body;
   
    const profileImage = req.file ? req.file.filename : null;

    if (profileImage) {
        db.run(`UPDATE users SET username = ?, email = ?, profile_image = ? WHERE id = ?`,
            [username, email, profileImage, userId], (err) => {
                if (err) {
                    console.error(err.message);
                    res.send('Errore durante l\'aggiornamento del profilo');
                } else {
                    res.redirect(`/profile/${userId}`);
                }
            });
    } else {
        db.run(`UPDATE users SET username = ?, email = ? WHERE id = ?`,
            [username, email, userId], (err) => {
                if (err) {
                    console.error(err.message);
                    res.send('Errore durante l\'aggiornamento del profilo');
                } else {
                    res.redirect(`/profile/${userId}`);
                }
            });
    }
});


// Creazione di un post
app.post('/create-post/:id', (req, res) => {
    const userId = req.params.id;
    const { content } = req.body;

    db.run(`INSERT INTO posts (user_id, content) VALUES (?, ?)`, [userId, content], (err) => {
        if (err) {
            console.error(err.message);
            res.send('Errore durante la creazione del post');
        } else {
            res.redirect(`/profile/${userId}`);
        }
    });
});

// Cancellazione account
app.post('/delete-account/:id', (req, res) => {
    const userId = req.params.id;

    db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
        if (err) {
            console.error(err.message);
            res.send('Errore durante la cancellazione dell\'account');
        } else {
            res.redirect('/register');
        }
    });
});


// Avvia il server
app.listen(3000, () => {
    console.log('Server avviato sulla porta 3000');
});
