const CryptoJS = createCryptoJS()
const cheerio = createCheerio()


//自定义配置格式{"cookie":"","only":"","site":""}
//only是过滤网盘用的，内容为域名的截取，如driver.uc.com，就可以填uc，115网盘就写115，用英文逗号,分割
//去观影网页登录账号后，F12打开控制台后随便访问一个页面，在网络标签下你访问的网页，复制标头里的cookie即可
//或者用ALOOK浏览器复制cookie

//跳过人机验证由群友Y佬完成
let $config = argsify($config_str)
const SITE = $config.site || 'https://www.gying.net'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

const appConfig = {
    ver: 1,
    title: '观影网',
    site: SITE,
    tabs: [
        {
            name: '热门电影',
            ext: {
                id: 'hits/mv/day',
            },
        },
        {
            name: '热门剧集',
            ext: {
                id: 'hits/tv/day',
            },
        },
        {
            name: '热门动漫',
            ext: {
                id: 'hits/ac/day',
            },
        },
        {
            name: '电影',
            ext: {
                id: 'mv?page=',
            },
        },
        {
            name: '剧集',
            ext: {
                id: 'tv?page=',
            },
        },
        {
            name: '动漫',
            ext: {
                id: 'ac?page=',
            },
        },
    ],
}
async function getConfig() {
    if ($config.cookie == '' || $config.cookie == undefined) {
        $utils.toastError('cookie未配置！')
        return
    }
    try {
        await bypassPow()
    } catch (error) {
        $print(error)
    }

    return jsonify(appConfig)
}
async function bypassPow() {
    const { data } = await $fetch.get(SITE, {
        headers: {
            'User-Agent': UA,
            Cookie: getCookie(),
        },
    })
    const $ = cheerio.load(data)

    const $title = $('h1.centered-div')
    if ($title.length && $title.text().includes('机器人')) {
        //$utils.toastInfo('正在完成人机验证，请稍等...')
        let script = $('script').html()
        const json = script.match(/const\s+json\s*=\s*(\{.*?\});/s)[1]
        const { id, challenge, diff, salt } = JSON.parse(json)
        const result = powSolve(challenge, diff, salt)

        const verifyResp = await $fetch.post(SITE, encodeFormData({ action: 'verify', id, nonce: result.nonce }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': UA,
                Referer: SITE,
                Cookie: '',
            },
        })
        let setCookie = verifyResp.respHeaders['Set-Cookie']
        let verifyCookie = setCookie.match(/browser_verified=([^;]+)/)[1]
        $cache.set('gying_verifyCookie', `browser_verified=${verifyCookie}`)

        return true
    } else return true

    function powSolve(challenge, diff, salt) {
        let remaining = challenge.map(hexToInt32Array)
        let solvedIndices = new Set()
        const nonceArr = Array(challenge.length).fill(null)
        let nonce = 0,
            hashes = 0

        for (;;) {
            let hash = sha256(nonce + salt)
            hashes++
            for (let i = 0; i < remaining.length; i++) {
                if (!solvedIndices.has(i) && int32ArrayEquals(hash, remaining[i])) {
                    solvedIndices.add(i)
                    nonceArr[i] = nonce
                }
            }
            if (solvedIndices.size === challenge.length || nonce >= diff) {
                return {
                    nonce: nonceArr,
                    hashes,
                }
            }
            nonce++
        }
    }
    function hexToInt32Array(hex) {
        if (hex.length % 8 !== 0) {
            throw new Error('Hex string length must be a multiple of 8 for Int32Array conversion')
        }
        const len = hex.length / 2
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        }
        const int32Arr = new Int32Array(len / 4)
        const view = new DataView(bytes.buffer)
        for (let i = 0; i < int32Arr.length; i++) {
            int32Arr[i] = view.getInt32(i * 4, false)
        }
        return int32Arr
    }
    function int32ArrayEquals(a, b) {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false
        }
        return true
    }
    function sha256(msg) {
        const hash = CryptoJS.SHA256(msg)
        const words = hash.words
        const out = new Int32Array(8)

        for (let i = 0; i < 8; i++) {
            out[i] = words[i] | 0
        }

        return out
    }
    function encodeFormData(data) {
        return Object.keys(data)
            .map((key) => {
                const value = data[key]
                if (Array.isArray(value)) {
                    return value.map((v) => encodeURIComponent(key) + '[]=' + encodeURIComponent(v)).join('&')
                }
                return encodeURIComponent(key) + '=' + encodeURIComponent(value)
            })
            .join('&')
    }
}
// async function opensafari(url) {
//     $utils.openSafari(url, UA)
// }
async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext
    let url
    if (ext.id.includes('hits')) {
        if (page > 1) {
            return
        }
        url = `${appConfig.site}/${id}`
    } else {
        url = `${appConfig.site}/${id}${page}`
    }
    //$utils.toastError(url);
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Cookie: getCookie(),
        },
    })
    const $ = cheerio.load(data)

    // < h1 id = "title" class = "centered-div" > 正在确className机器人！</h1>
    // const $title = $('h1.centered-div')
    // if ($title.length && $title.text().includes('机器人')) {
    //     opensafari(url)
    // }

    $('p.error').text()
    if ($('p.error').length > 0) {
        $utils.openSafari(appConfig.site, UA)
    }

    const scriptContent = $('script')
        .filter((_, script) => {
            return $(script).html().includes('_obj.header')
        })
        .html()

    const jsonStart = scriptContent.indexOf('{')
    const jsonEnd = scriptContent.lastIndexOf('}') + 1
    const jsonString = scriptContent.slice(jsonStart, jsonEnd)

    const inlistMatch = jsonString.match(/_obj\.inlist=({.*});/)
    if (!inlistMatch) {
        $utils.toastError('未找到 _obj.inlist 数据')
    } else {
        const inlistData = JSON.parse(inlistMatch[1])

        inlistData['i'].forEach((item, index) => {
            cards.push({
                vod_id: item,
                vod_name: inlistData['t'][index],
                vod_pic: `https://s.tutu.pm/img/${inlistData['ty']}/${item}/384.webp`,
                vod_remarks: inlistData['g'][index],
                ext: {
                    url: `${appConfig.site}/res/downurl/${inlistData['ty']}/${item}`,
                },
            })
        })
    }
    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Cookie: getCookie(),
        },
    })
    const respstr = parseJsonIfString(data)
    //清洗的结果
    if (respstr.hasOwnProperty('panlist')) {
        const patterns = {
            resolution: /(4K|4k|1080P|1080p)/,
            hdr: /(HDR)/,
            codec: /(高码|极致高码)/,
            lang: /(国语中字|中英|双语字幕|内嵌简中|内嵌中字)/,
            disk: /(原盘)/,
        }

        respstr.panlist.url.forEach((item, index) => {
            item = item.replace('115cdn.com', '115.com')
            const keys = ($config.only ? $config.only.toLowerCase() : '').split(',').filter(Boolean)
            if (keys.length) {
                const match = item.match(/^(https?:\/\/)?([^\/:]+)/i)
                if (!match) {
                    return false
                }
                const domain = match[2].toLowerCase()
                const hit = keys.find((k) => domain.includes(k))
                if (!hit) {
                    return
                }
            }

            const str = respstr.panlist.name[index]
            let tags = []

            for (const key in patterns) {
                const m = str.match(patterns[key])
                if (m) tags.push(m[0])
            }
            let title = tags.length ? tags.join('/') : '未知规格'

            tracks.push({
                name: title + `（${(index + 1).toString()}）`,
                pan: item,
                ext: {
                    url: '',
                },
            })
        })
        const hostCount = {}
        const order = ['quark.cn', 'alipan.com', 'uc.cn', '189.cn', '115cdn']
        tracks = tracks
            .sort((a, b) => {
                const ma = a.pan.match(/^https?:\/\/([^\/?#]+)/i)
                const mb = b.pan.match(/^https?:\/\/([^\/?#]+)/i)
                const ha = ma ? ma[1].toLowerCase() : ''
                const hb = mb ? mb[1].toLowerCase() : ''

                let ia = 999
                for (let i = 0; i < order.length; i++) {
                    if (ha.indexOf(order[i]) !== -1) {
                        ia = i
                        break
                    }
                }

                let ib = 999
                for (let i = 0; i < order.length; i++) {
                    if (hb.indexOf(order[i]) !== -1) {
                        ib = i
                        break
                    }
                }

                return ia - ib
            })
            .filter((item) => {
                const m = item.pan.match(/^https?:\/\/([^\/?#]+)/i)
                const host = m ? m[1].toLowerCase() : ''

                hostCount[host] = (hostCount[host] || 0) + 1

                return hostCount[host] <= 5
            })

        //${respstr.panlist.tname[respstr.panlist.type[index]]}
    } else if (respstr.hasOwnProperty('file')) {
        $utils.toastError('网盘验证掉签请前往主站完成验证数字')
    } else {
        $utils.toastError('没有网盘资源')
    }

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    ext.url

    return jsonify({ urls: [ext.url] })
}
async function search(ext) {
    ext = argsify(ext)
    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/s/1---${page}/${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Cookie: getCookie(),
        },
    })

    let cards = []
    const result = JSON.parse(data.match(/_obj\.search\s*=\s*(\{[\s\S]*?\});/)[1])
    result.l.title.forEach((item, index) => {
        cards.push({
            vod_id: result.l.i[index],
            vod_name: item,
            vod_pic: `https://s.tutu.pm/img/${result.l.d[index]}/${result.l.i[index]}/256.webp`,
            vod_remarks: '豆瓣 ' + result.l.pf.db.s[index],
            ext: {
                url: `${appConfig.site}/res/downurl/${result.l.d[index]}/${result.l.i[index]}`,
            },
        })
    })
    return jsonify({
        list: cards,
    })
}
function parseJsonIfString(input) {
    if (typeof input === 'string') {
        try {
            return JSON.parse(input) // 尝试将字符串解析为 JSON
        } catch (e) {
            console.error('Invalid JSON string', e)
            return null // 如果解析失败，返回 null 或其他错误处理
        }
    }
    return input // 如果输入是对象，直接返回
}

function getCookie() {
    let appAuth = $config.cookie.match(/app_auth=([^;]+)/)[1]
    let verify = $cache.get('gying_verifyCookie') ?? ''
    return `app_auth=${appAuth}; ${verify}`
}
