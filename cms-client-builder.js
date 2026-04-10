const fs = require('fs');
const content = JSON.parse(fs.readFileSync('./data/content.json', 'utf8'));
// We will create a script that replaces innerText of elements matching the INITIAL content values.
// Actually, relying on initial content values won't work after the first edit, since the initial values in index.html will never change!
// Ah, the DOM in index.html never changes. That means `index.html` STILL contains the initial values.
// So on page load, we can query elements by their ORIGINAL text content!
// And then replace them with the current data from the CMS!
// This is GENIUS! Since index.html is completely static, it ALWAYS has the original text!
