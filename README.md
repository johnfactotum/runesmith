# Runesmith

**Runesmith** is a character map application that allows you to browse and copy Unicode characters. It is similar to [gucharmap](https://wiki.gnome.org/Apps/Gucharmap).

## Features

- Browse Unicode characters by block or script (including script extensions), in grid view or list view
- Characters are color coded by general category, and characters in a script is divided by block
- Double click on a character to insert it into the text editor
- Normalize texts, change casing, and see the code point breakdown with the text editor
- Go to character by hex or decimal value, or search by name (matches full words only)
- Single page web app, works locally without a server

## Usage

Clone the repo, or download `index.html` and `dist.js`. Then open `index.html` in your browser. Alternatively, you can try the online version at https://johnfactotum.github.io/runesmith/.

### GTK app

There are two GTK wrappers, one for GTK 3 and one for GTK 4. They require GJS, libadwaita/libhandy, and WebKitGTK.

### Building

Building requires Deno. `./data/get-data.js` is used to fetch [UCD](https://www.unicode.org/ucd/) data and convert it to `./data/data.json`. To enable use without a server, this data is combined with `./index.js` into `dist.js` by `./build.js`.

## Issues

The code is quick and dirty, sort of speghetti. There are a number of obvious issues:

- Cannot configure the font
- No support for name aliases
- The UI is not responsive. No support for smaller screens.
- It's a bit slow to start. It loads all data, about 1.6 MB, at once. Though this is less of a problem if you run it locally.
- It renders all characters in a block or script; no optimizations such as lazy loading or "virtual" rendering. In practice, though, the performance seems acceptable. Firefox seem to handle it particularly well.
- Poor support for showing ranges in Han, Hangul, and Tangut. It requires an additional click when browsing by script, and it shows the wrong character name. There's no support for Unihan, either. To be fair, for Hangul, it's easy enough to use normalization to convert between precomposed syllables and decompsoed *jamo*, so it's not really an issue.
