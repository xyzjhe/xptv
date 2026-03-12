const cheerio = createCheerio()

let $config = argsify($config_str)
const SITE = $config.site || "https://a123tv.com"
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const headers = {
    'Referer': `${SITE}/`,
    'Origin': `${SITE}`,
    'User-Agent': UA,
}
const appConfig = {
    ver: 1,
    title: "123TV",
    site: SITE,
    tabs: [{
        name: '电影',
        ext: {
            url: `${SITE}/t/10/p{page}.html`
        },
    }, {
        name: '连续剧',
        ext: {
            url: `${SITE}/t/11/p{page}.html`
        },
    }, {
        name: '综艺',
        ext: {
            url: `${SITE}/t/12/p{page}.html`
        },
    }, {
        name: '动漫',
        ext: {
            url: `${SITE}/t/13/p{page}.html`
        },
    }]
}

async function getConfig() {
    return jsonify(appConfig)
}

let isMovie=true
let isVariety=false
async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let url = ext.url
    isMovie = url.includes("t/10/");
    isVariety = !isMovie && url.includes("t/12/");
    let page = ext.page || 1
    url = url.replace('{page}', page)

    const { data } = await $fetch.get(url, {
        headers
    })

    const $ = cheerio.load(data)
    $('a.w4-item').each((_, each) => {
        const href = $(each).attr('href')
        const pic = $(each).find('img').attr('data-src') || $(each).find('img').attr('src')

        cards.push({
            vod_id: href,
            vod_name: $(each).find('.t').attr('title') || $(each).find('.t').text(),
            vod_pic: pic.startsWith('//') ? 'https:' + pic : appConfig.site + pic,
            vod_remarks: ($(each).find('.r').text() || '').toUpperCase(),
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
    });
}

async function getTracks(ext) {

    ext = argsify(ext)
    const url = ext.url

    const { data } = await $fetch.get(url, { headers })
    const $ = cheerio.load(data)

    const lineMap = new Map()
    const movieTasks = []

    $('.w4-line-item').each((_, el) => {

        const line = $(el).find('.w4-line-info .r').text().trim()
        const speed = $(el).find('.w4-line-info .s span').text().trim()

        if (!line || speed.includes('超时') || lineMap.has(line)) return

        const href = $(el).attr('href')
        const fullUrl = href.startsWith('/') ? appConfig.site + href : href

        if (isMovie || isVariety) {

            movieTasks.push({
                line,
                url: fullUrl
            })

        } else {

            const ttl = $(el).find('.w4-line-info .s').attr('data-ttl')
            const slug = href.split('/')[2]

            const info = $(el).find('.w4-line-cover .i').text()

            let total = 1
            const m = info.match(/(\d+)\s*集/)
            if (m) total = parseInt(m[1])

            const tracks = []

            for (let i = 0; i < total; i++) {
                tracks.push({
                    name: '第' + String(i + 1).padStart(2, '0') + '集',
                    pan: '',
                    ext: {
                        url: `${appConfig.site}/v/${slug}/${ttl}z${i}.html`
                    }
                })
            }

            lineMap.set(line, {
                title: `${line}[共${total}集]`,
                tracks
            })
        }

    })

    /* 电影版本抓取 */
    if ((isMovie||isVariety) && movieTasks.length) {
        const batchSize = 5
        let finished = 0
        for (let i = 0; i < movieTasks.length; i += batchSize) {

            const batch = movieTasks.slice(i, i + batchSize)

            const requests = batch.map(async (task) => {

                try {

                    const { data } = await $fetch.get(task.url, { headers })

                    const $ = cheerio.load(data)

                    const tracks = []

                    $('.w4-episode-list .w a').each((_, a) => {

                        const name = $(a).text().trim()
                        const href = $(a).attr('href')

                        if (!href) return

                        tracks.push({
                            name,
                            pan: '',
                            ext: {
                                url: href.startsWith('/')
                                    ? appConfig.site + href
                                    : href
                            }
                        })

                    })

                    if (tracks.length) {
                        const suffix = isMovie ? "个版本" : isVariety ? "集" : "";
                        lineMap.set(task.line, {
                            title: `${task.line}[共${tracks.length}${suffix}]`,
                            tracks
                        });
                    }

                } catch (e) {
                }

                finished++
                $utils.toastInfo(`线路解析 ${finished}/${movieTasks.length}`)

            })

            await Promise.all(requests)
        }

    }

    const groups = [...lineMap.values()].sort((a, b) => {

        const na = parseInt(a.title.replace(/\D/g, '')) || 0
        const nb = parseInt(b.title.replace(/\D/g, '')) || 0

        return na - nb
    })

    return jsonify({ list: groups })
}
async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const { data } = await $fetch.get(url, {
        headers
    })

    const $ = cheerio.load(data)
    const m3u = $('#awp1').attr('data-src')

    return jsonify({ 'urls': [m3u] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = [];

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    if(page>2){return}
    const url = appConfig.site + `/s/${text}.html`
    const { data } = await $fetch.get(url, {
        headers
    })

    const $ = cheerio.load(data)
    $('a.w4-item').each((_, el) => {

        const $el = $(el)

        const href = $el.attr('href')
        if (!href) return

        const img = $el.find('img')
        const pic = img.attr('data-src') || img.attr('src') || ''

        const remark = $el.find('.s span').text().trim()

        cards.push({
            vod_id: href,
            vod_name: $el.find('.t').attr('title') || $el.find('.t').text().trim(),
            vod_pic: pic.startsWith('//')
                ? 'https:' + pic
                : (pic.startsWith('http') ? pic : appConfig.site + pic),
            vod_remarks: remark,
            ext: {
                url: appConfig.site + href
            }
        })

    })
    return jsonify({
        list: cards,
    })
}
