#!/usr/bin/env -S deno run --allow-read --allow-write
const data = await Deno.readTextFile('./data/data.json')
const js = await Deno.readTextFile('./index.js')

const str = 'const json = ' + data + ';' + js

await Deno.writeTextFile('./dist.js', str)
