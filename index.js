const planes = {
    BMP: 'Basic Multilingual Plane',
    SMP: 'Supplementary Multilingual Plane',
    SIP: 'Supplementary Ideographic Plane',
    TIP: 'Tertiary Ideographic Plane',
    SSP: 'Supplement­ary Special-purpose Plane',
    SPUA: 'Supplement­ary Private Use Area',
}

const getPlane = n => {
    if (n < 0x10000) return 'BMP'
    if (n < 0x20000) return 'SMP'
    if (n < 0x30000) return 'SIP'
    if (n < 0x40000) return 'TIP'
    if (n < 0xf0000) return 'SSP'
    return 'SPUA'
}

const getAliases = key => json.PropertyValueAliases
    .filter(([x]) => x === key)
    .map(x => x.slice(1))

const GC = new Map(getAliases('gc')
    .map(([x, y]) => [x, y.replaceAll('_', ' ')]))

const SC = new Map(getAliases('sc'))

const parseHex = x => parseInt(x, 16)
const parseRange = x => x.split('..').map(parseHex)
const formatHex = x => 'U+' + x.toString(16).toUpperCase().padStart(4, '0')
const titleCase = x => x?.replace(/\w\S*/g, x =>
    x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())

const ranges = []
const rangeStarts = new Map()

const map = new Map()
json.UnicodeData.forEach(([n, name, category], i, a) => {
    n = parseHex(n)
    if (/<.+, Last>/.test(name)) return
    if (/<.+, First>/.test(name)) {
        const last = a[i + 1]
        const end = parseHex(last[0])
        const rangeName = name.match(/<(.+), First>/)[1]
        ranges.push([n, end, rangeName, category])
        rangeStarts.set(n, [end, rangeName, category])
        return
    }
    map.set(n, [n, titleCase(name), category])
})

const getCodePointData = n => map.get(n)
    ?? [n, ...(ranges.find(([a, b]) => n >= a && n <= b)?.slice(2)
    ?? ['<Unassigned>', 'Cn'])]

const blocks = json.Blocks.map(([range, name]) => [parseRange(range), name])

const blockStarts = json.Blocks.map(([range, name]) =>
    [parseHex(range.split('..')[0]), name])

const scripts = {}
const extendedScripts = json.Scripts
    .concat(json.ScriptExtensions
        .map(([range, names]) => names.split(/\s/)
            .map(name => [range, SC.get(name)])).flat())

for (const [range, scriptName] of extendedScripts) {
    const name = scriptName.replaceAll('_', ' ')
    scripts[name] ??= []
    const parsedRange = parseRange(range)
    if (parsedRange.length === 1) {
        const n = parsedRange[0]
        scripts[name].push(map.get(n))
    } else {
        const [a, b] = parsedRange
        if (map.has(a)) for (let n = a; n <= b; n++) {
            const x = map.get(n)
            if (x) scripts[name].push(x)
        }
        else scripts[name].push([a])
    }
}

const groupItemsByBlock = items => {
    const results = []
    let i = -1
    for (const item of items) {
        const [n] = item
        const oldI = i
        const b = blockStarts.findLast(([m]) => n >= m, i)
        if (!b) continue
        i = b[0]
        if (i !== oldI) results.push([b[1], []])
        results.at(-1)[1].push(item)
    }
    return results
}

const codePointToScriptName = new Map()
const byScript = new Map()
for (const [name, script] of Object.entries(scripts)) {
    script.sort((a, b) => a[0] - b[0])
    for (const [n] of script) codePointToScriptName.set(n, name)
    byScript.set(name, [name, groupItemsByBlock(script)])
}

/* render characters
------------------------------------------------------------------------------*/
const renderItem = ([code, name, category]) => {
    const li = document.createElement('li')
    li.tabIndex = 0
    if (code < 0) {
        li.innerText = '…'
        li.title = name
        li.onclick = category
        return li
    }
    category ||= 'Cn'
    li.dataset.code = code
    li.dataset.name = name
    const span = document.createElement('span')
    span.innerText = String.fromCodePoint(code)
    li.append(span)
    li.title = `${formatHex(code)}\n${name}`
    li.classList.add(category)
    return li
}

const max = 1024
const renderBlock = ([name, items], hideRange) => {
    const div = document.createElement('div')
    div.classList.add('block')
    const p = document.createElement('p')
    const plane = getPlane(items[0][0])
    const span = document.createElement('span')
    span.classList.add('small', 'label')
    span.title = planes[plane]
    span.innerText = plane
    const a = document.createElement('a')
    a.href = `#${name}`
    a.addEventListener('click', e => {
        e.preventDefault()
        showBlock(name)
    })
    a.classList.add('middle')
    a.style.marginLeft = '.25em'
    a.innerText = name
    p.append(span)
    p.append(document.createTextNode(' '))
    p.append(a)
    div.append(p)
    const ul = document.createElement('ul')
    let last
    if (hideRange) for (const item of items) {
        const range = rangeStarts.get(item[0])
        if (range) {
            const a = item[0]
            const [b, name, category] = range
            if (b - a <= max)
                for (let i = a; i <= b; i++)
                    ul.append(renderItem([i, name, category]))
            else ul.append(renderItem([-1, `${b - a} characters`, () => {
                const arr = []
                for (let i = a; i <= b; i++)
                    arr.push(renderItem([i, name, category]))
                ul.replaceChildren(...arr)
            }]))
        } else {
            // some have Script_Extensions despite not being Common or Inherited
            // is this a unicode bug?
            const [n] = item
            if (last === n) continue
            last = n
            ul.append(renderItem(item))
        }
    }
    else for (const item of items) ul.append(renderItem(item))
    div.append(ul)
    return div
}

const renderScript = ([name, items]) => {
    const div = document.createElement('div')
    const h = document.createElement('h2')
    h.innerText = name
    div.append(h)
    for (const item of items) div.append(renderBlock(item, true))
    return div
}

const showScript = (name, code) => {
    document.getElementById('char-info').classList.add('hidden')
    stack.show('scripts')
    setCurrentScript(name)
    setCurrentBlock()
    const div = renderScript(byScript.get(name))
    const pane = document.getElementById('chars-container')
    pane.replaceChildren(div)
    if (code) {
        const el = div.querySelector(`[data-code="${code}"]`)
        if (el) {
            el.focus()
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
    } else {
        pane.scrollTop = 0
        div.querySelector('[data-code]')?.focus()
    }
}

const showBlock = (name, code) => {
    document.getElementById('char-info').classList.add('hidden')
    stack.show('blocks')
    setCurrentScript()
    setCurrentBlock(name)
    const range = blocks.find(([, n]) => n === name)[0]
    const items = []
    const [a, b] = range
    for (let i = a; i <= b; i++) {
        const item = getCodePointData(i)
        items.push(item)
    }
    const div = renderBlock([name, items])
    const pane = document.getElementById('chars-container')
    pane.replaceChildren(div)
    if (code) {
        const el = div.querySelector(`[data-code="${code}"]`)
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            el.focus()
        }
    } else {
        pane.scrollTop = 0
        div.querySelector('[data-code]')?.focus()
    }
}

const showSearch = str => {
    const q = str.trim().toLowerCase()
    const qs = q.split(/\s/)
    document.getElementById('char-info').classList.add('hidden')
    setCurrentScript()
    setCurrentBlock()
    const items = []
    const compare = x => {
        if (!x) return
        const arr = x.toLowerCase().split(' ')
        return qs.every(q => arr.includes(q))
    }
    for (const item of map.values())
        if (compare(item[1])) items.push(item)

    const pane = document.getElementById('chars-container')
    const div = document.createElement('div')
    const h = document.createElement('h2')
    h.innerText = `Results for “${q}”`
    div.append(h)
    for (const block of groupItemsByBlock(items))
        div.append(renderBlock(block))
    pane.replaceChildren(div)
    pane.scrollTop = 0
    div.querySelector('[data-code]')?.focus()
}

const charsContainer = document.getElementById('chars-container')
let lastFocused

charsContainer.addEventListener('focusin', e => {
    const { target } = e
    const code = target.dataset.code
    document.getElementById('char-info').classList.toggle('hidden', !code)
    if (code) {
        lastFocused = target
        const n = parseInt(code)
        const el = document.createElement('p')
        const [, name, category] = getCodePointData(n)
        document.getElementById('char-info').innerHTML = `
        <span class="expand">
            <strong class="tabular">${formatHex(n)}</strong>
            <span class="dim-label">/ <span class="tabular" title="Decimal">${n}</span> —</span>
            ${name.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}
        </span>
        <span class="small label ${category}" style="margin-left: .25em;" title="${GC.get(category)}">${category}</span>
        `
    }
})

charsContainer.addEventListener('mousedown', e => {
    if (e.detail > 1) e.preventDefault()
})

charsContainer.addEventListener('dblclick', e => {
    console.log(e)
    const { target } = e
    const code = target.dataset.code || target.parentNode.dataset.code
    if (code) {
        textarea.focus()
        document.execCommand('insertText', false, String.fromCodePoint(code))
    }
})

const listViewToggle = document.getElementById('list-view-toggle')
const updateListViewToggle = () => {
    const checked = listViewToggle.checked
    charsContainer.classList.toggle('list-view', checked)
    lastFocused?.scrollIntoView({ block: 'center' })
    lastFocused?.focus()
}
listViewToggle.addEventListener('change', updateListViewToggle)
updateListViewToggle()

const showCodePointInScript = n => {
    if (n == null || isNaN(n)) return
    const scriptName = codePointToScriptName.get(n)
    showScript(scriptName, n)
}
const promptHex = () => {
    const str = globalThis.prompt('Go to code point (hexadecimal)')
    showCodePointInScript(parseInt(str, 16))
}
const promptDec = () => {
    const str = globalThis.prompt('Go to code point (decimal)')
    showCodePointInScript(parseInt(str, 10))
}
const promptSearch = () => {
    const str = globalThis.prompt('Search character by name (whole words only)')
    showSearch(str)
}

/* sidebar
------------------------------------------------------------------------------*/
const scriptsContainer = document.getElementById('scripts-container')
const renderScriptList = names => {
    const i = names.indexOf('Inherited')
    if (i > -1) names.splice(1, 0, names.splice(i, 1))
    const ul = document.createElement('ul')
    for (const name of names) {
        const li = document.createElement('li')
        const a = document.createElement('a')
        a.innerText = name
        a.href = `#${name}`
        a.dataset.scriptName = name
        li.append(a)
        ul.append(li)
    }
    return ul
}
const ul = renderScriptList([...byScript.keys()])
const setCurrentScript = name => {
    const as = scriptsContainer.querySelectorAll('[data-script-name]')
    for (const a of as) {
        if (a.dataset.scriptName === name) {
            a.setAttribute('aria-current', 'page')
            a.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } else {
            a.removeAttribute('aria-current')
        }
    }
}
for (const a of ul.querySelectorAll('a')) {
    a.addEventListener('click', e => {
        e.preventDefault()
        showScript(a.dataset.scriptName)
    })
}
scriptsContainer.replaceChildren(ul)

const blocksContainer = document.getElementById('blocks-container')
const blockUl = document.createElement('ul')
for (const [range, name] of blocks) {
    const li = document.createElement('li')
    const a = document.createElement('a')
    a.innerText = name
    a.href = `#${name}`
    a.dataset.blockName = name
    a.dataset.blockRange = range.join(',')
    li.append(a)
    blockUl.append(li)
}
const setCurrentBlock = name => {
    const as = blocksContainer.querySelectorAll('[data-block-name]')
    for (const a of as) {
        if (a.dataset.blockName === name) {
            a.setAttribute('aria-current', 'page')
            a.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } else {
            a.removeAttribute('aria-current')
        }
    }
}
for (const a of blockUl.querySelectorAll('a')) {
    a.addEventListener('click', e => {
        e.preventDefault()
        showBlock(a.dataset.blockName)
    })
}
blocksContainer.replaceChildren(blockUl)

const filterInput = document.getElementById('filter-input')
const updateLists = () => {
    const q = filterInput.value.trim().toLowerCase()

    const sas = scriptsContainer.querySelectorAll('[data-script-name]')
    for (const a of sas) {
        const match = a.dataset.scriptName.toLowerCase().includes(q)
        a.parentNode.classList.toggle('hidden', !match)
    }
    scriptsContainer.querySelector('[aria-current]')
        ?.scrollIntoView({ block: 'center' })

    const bas = blocksContainer.querySelectorAll('[data-block-name]')
    for (const a of bas) {
        const match = a.dataset.blockName.toLowerCase().includes(q)
        a.parentNode.classList.toggle('hidden', !match)
    }
    blocksContainer.querySelector('[aria-current]')
        ?.scrollIntoView({ block: 'center' })
}
filterInput.addEventListener('input', updateLists)
updateLists()

class Stack {
    #radios = new Map()
    #els = new Map()
    constructor(items) {
        for (const item of items) {
            const { stackName, stackTarget } = item.dataset
            const target = document.getElementById(stackTarget)
            this.#radios.set(stackName, item)
            this.#els.set(stackName, target)
            item.addEventListener('input', () => this.show(stackName))
            target.classList.toggle('hidden', !item.checked)
        }
    }
    show(name) {
        this.#radios.get(name).checked = true
        for (const [k, el] of this.#els.entries()) {
            el.classList.toggle('hidden', k !== name)
        }
    }
}
const stack = new Stack(document.getElementsByName('list-switcher'))

/* text editor
------------------------------------------------------------------------------*/
const textarea = document.getElementById('text-area')
const updateTextInfo = () => {
    const table = document.createElement('table')
    for (const str of textarea.value) {
        const code = str.codePointAt(0)
        const codeStr = formatHex(code)
        const [, name, category] = getCodePointData(code)

        const tr = document.createElement('tr')
        const td1 = document.createElement('td')
        td1.innerText = str
        const td2 = document.createElement('td')
        const a = document.createElement('a')
        a.innerText = codeStr
        a.href = `#${codeStr}`
        a.classList.add('tabular')
        a.addEventListener('click', e => {
            e.preventDefault()
            showCodePointInScript(code)
        })
        td2.append(a)
        const td3 = document.createElement('td')
        td3.innerText = name
        const td4 = document.createElement('td')
        const td4Span = document.createElement('span')
        td4Span.innerText = category
        td4Span.title = GC.get(category)
        td4Span.classList.add('label', category)
        td4.append(td4Span)
        tr.append(td1)
        tr.append(td2)
        tr.append(td3)
        tr.append(td4)
        table.append(tr)
    }
    document.getElementById('text-info').replaceChildren(table)
}
textarea.addEventListener('input', updateTextInfo)
updateTextInfo()

const actions = {
    $clear: () => document.execCommand('delete', false, null),
    $copy: () => document.execCommand('copy', false, null),
    upper: str => str.toUpperCase(),
    lower: str => str.toLowerCase(),
    nfc: str => str.normalize('NFC'),
    nfd: str => str.normalize('NFD'),
    nfkc: str => str.normalize('NFKC'),
    nfkd: str => str.normalize('NFKD'),
}
for (const [name, func] of Object.entries(actions)) {
    document.querySelector(`[data-text-action="${name}"]`)
        ?.addEventListener('click', () => {
            let { selectionStart, selectionEnd, value } = textarea
            if (selectionStart === selectionEnd)
                selectionStart = 0, selectionEnd = value.length
            textarea.select()
            if (name.startsWith('$')) func()
            else {
                textarea.setSelectionRange(selectionStart, selectionEnd)
                const text = func(value.slice(selectionStart, selectionEnd))
                document.execCommand('insertText', false, text)
            }
        })
}

/* fin
------------------------------------------------------------------------------*/
showScript('Latin')
