/**
 * Module dependencies.
 */
var express = require('express');
var app = express();
var path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use('/node_modules', express.static(path.join(__dirname, '../node_modules/')));
app.use(express.static(path.join(__dirname, 'app')));
app.use('/node_modules', express.static(path.join(__dirname, '/node_modules/')));
app.use(express.static(path.join(__dirname, 'dist')));

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
