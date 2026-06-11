const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // if available, or initialize default
// Wait, we don't have serviceAccountKey.json readily available for a script.
