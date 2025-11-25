const cheerio = createCheerio()
const CryptoJS = createCryptoJS()
//代码修改于y佬，仅用于测试嗅探接口
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let $config = argsify($config_str)
let appConfig = {
    ver: 1,
    title: '厂长嗅探版_兔',
    site: 'https://www.czzymovie.com',
}
let header = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,/;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    Connection: 'keep-alive',
    Referer: appConfig.site + '/',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = [
        {
            name: '电影',
            ext: {
                url: appConfig.site + '/movie_bt/movie_bt_series/dyy',
            },
        },
    ]
    let ignore = ['关于', '公告', '官方', '备用', '群', '地址', '求片', '分类']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site, {
        headers: header,
    })

    // let html
    // if (data.includes('SafeLine')) {
    //     html = testFunc(data)
    // } else html = data
    const $ = cheerio.load(data)

    let allClass = $('ul.submenu_mi > li > a')
    allClass.each((i, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url += `/page/${page}`
    }

    const { data } = await $fetch.get(url, {
        headers: header,
    })

    let html
    if (data.includes('SafeLine')) {
        html = testFunc(data)
    } else html = data

    const $ = cheerio.load(html)

    $('.bt_img.mi_ne_kd.mrb ul > li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('img').attr('alt')
        const cover = $(element).find('img').attr('data-original')
        const subTitle = $(element).find('.jidi span').text()
        const hdinfo = $(element).find('.hdinfo span').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || hdinfo,
            ext: {
                url: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: header,
    })

    let html
    if (data.includes('SafeLine')) {
        html = testFunc(data)
    } else html = data
    const $ = cheerio.load(html)

    $('.paly_list_btn a').each((_, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        tracks.push({
            name: `${name}`,
            pan: '',
            ext: {
                url: href,
            },
        })
    })

    const panlist = $('.ypbt_down_list')
    if (panlist) {
        panlist.find('ul li').each((_, e) => {
            const name = $(e).find('a').text().trim()
            const href = $(e).find('a').attr('href')
            if (!/ali|quark|115|uc/.test(href)) return
            tracks.push({
                name: name,
                pan: href,
            })
        })
    }

    // $utils.toastInfo('不能看的在群裡回報')

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
    let url = ext.url

    const { data } = await $fetch.get(`${$config.sniffer}/getplayurl?url=${url}`, {
        header
    })
    let playurl=argsify(data).result[0].url

    return jsonify({ urls: [playurl], headers: [argsify(data).result[0].headers] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    // let url = `${appConfig.site}/daoyongjiek0shibushiyoubing?q=${text}$f=_all&p=${page}`
    let url = `https://czzy.xn--m7r412advb92j21st65a.tk/czzysearch.php?wd=${text}`
    if (page > 1) return jsonify({ list: [] })

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let results = data.split('$$$')

        results.forEach((part, _) => {
            let info = part.split('|')

            let id = info[0]
            let name = info[1]
            let image = info[2]
            let remark = info[3]

            let url = `${appConfig.site}/movie/${id}.html`

            cards.push({
                vod_id: id.toString(),
                vod_name: name,
                vod_pic: image,
                vod_remarks: remark,
                url: url,
                ext: {
                    url: url,
                },
            })
        })
    } catch (error) {
        $print(error)
    }

    return jsonify({
        list: cards,
    })
}
//
// function testFunc(data) {
//     try {
//         const raw_key = new Uint8Array(JSON.parse(data.match(/var\s+raw_key\s*=\s*(\[[^\]]*\])/)[1]))
//         const iv = new Uint8Array(JSON.parse(data.match(/var\s+iv\s*=\s*new Uint8Array\(\s*(\[[^\]]*\])\s*\)/)[1]))
//         const encrypted = new Uint8Array(
//             JSON.parse(data.match(/var\s+encrypted\s*=\s*new Uint8Array\(\s*(\[[^\]]*\])\s*\)/)[1])
//         )
//         const tag = new Uint8Array(JSON.parse(data.match(/var\s+tag\s*=\s*new Uint8Array\(\s*(\[[^\]]*\])\s*\)/)[1]))
//
//         const ciphertextWithTag = new Uint8Array(encrypted.length + tag.length)
//         ciphertextWithTag.set(encrypted, 0)
//         ciphertextWithTag.set(tag, encrypted.length)
//
//         const decrypted = asmCrypto.AES_GCM.decrypt(ciphertextWithTag, raw_key, iv)
//
//         // let plaintext = ''
//         // for (let i = 0; i < decrypted.length; i++) {
//         //     plaintext += String.fromCharCode(decrypted[i])
//         // }
//         let plaintext = utf8Decode(decrypted)
//         // $print(plaintext)
//         return plaintext
//     } catch (error) {
//         $print(error)
//         return null
//     }
// }

function utf8Decode(bytes) {
    let out = '',
        i = 0
    const len = bytes.length

    while (i < len) {
        let c = bytes[i++]

        if (c < 128) {
            out += String.fromCharCode(c)
        } else if (c > 191 && c < 224) {
            const c2 = bytes[i++]
            out += String.fromCharCode(((c & 31) << 6) | (c2 & 63))
        } else {
            const c2 = bytes[i++]
            const c3 = bytes[i++]
            out += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63))
        }
    }

    return out
}

