#!/usr/bin/env -S deno run --allow-net --allow-write

const [UnicodeData, Blocks, Scripts, ScriptExtensions, PropertyValueAliases] =
    await Promise.all([
        'https://www.unicode.org/Public/15.0.0/ucd/UnicodeData.txt',
        'https://www.unicode.org/Public/15.0.0/ucd/Blocks.txt',
        'https://www.unicode.org/Public/15.0.0/ucd/Scripts.txt',
        'https://www.unicode.org/Public/15.0.0/ucd/ScriptExtensions.txt',
        'https://www.unicode.org/Public/15.0.0/ucd/PropertyValueAliases.txt',
    ].map(url => fetch(url).then(res => res.text())))

const parse = str => str
    .split('\n')
    .map(l => l.split('#')[0].split(';').map(x => x.trim()))
    .filter(a => a[0])

const result = {
    UnicodeData: UnicodeData
        .split('\n')
        .map(l => l.split('#')[0].split(';').slice(0, 3)),
    Blocks: parse(Blocks),
    Scripts: parse(Scripts),
    ScriptExtensions: parse(ScriptExtensions),
    PropertyValueAliases: parse(PropertyValueAliases),
}

await Deno.writeTextFile('./data.json', JSON.stringify(result))
