// save as convert.js
import fs from 'fs';
import china from './china.js'
fs.writeFileSync('./china.json', JSON.stringify(china, null, 2))
