'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
// strip the bank json script block so greps are not polluted
const stripped = html.replace(/<script type="application\/json" id="bank">[\s\S]*?<\/script>/, '<script type="application/json" id="bank">[]</script>');
fs.writeFileSync(path.join(DIR, '.tmp-app-stripped.html'), stripped);
const lines = stripped.split('\n');
console.log('total lines', lines.length);
// find the app script start
const start = lines.findIndex(l => l.includes('id="bank"'));
console.log('bank at line', start + 1);
for (let i = start; i < lines.length; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
