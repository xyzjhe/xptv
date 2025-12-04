const cheerio = createCheerio()
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'
const appConfig = {
    ver: 1,
    title: 'SeedHub｜PAN_兔',
    site: 'https://www.seedhub.cc',
    tabs: [
        {
            name: '首页',
            ext: {
                id: '/',
            },
        },
        {
            name: '电影',
            ext: {
                id: '/categories/1/movies/',
            },
        },
        {
            name: '剧集',
            ext: {
                id: '/categories/3/movies/',
            },
        },
        {
            name: '动漫',
            ext: {
                id: '/categories/2/movies/',
            },
        }

    ],
}
async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext
    const url =appConfig.site + id + `?page=${page}`
    const { data } = await $fetch.get(url, {
        headers: {
            "User-Agent": UA,
        },
    });

    const $ = cheerio.load(data)
    const videos = $('.cover')
    videos.each((_, e) => {
        const href = $(e).find('a').attr('href')
        const title = $(e).find('a img').attr('alt')
        const cover = $(e).find('a img').attr('src')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })
    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext);
    let tracks = [];
    let url = ext.url;
    $utils.toastInfo('获取网盘链接中...请耐心等待...')
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    const $ = cheerio.load(data);
    const playlist = $('.pan-links>li');

    if (playlist.length === 0 ) {
        $utils.toastError('没有网盘资源');
        return jsonify({ list: [] });
    }

    const counts = {}; // 记录每个种类的数量
    const maxPerType = 5; // 每种类最多 5 个
    let index=1;
    for (const e of playlist) {
        const links = $(e).find('a').toArray();
        for (const link of links) {
            const urltype = $(link).attr('data-link');
            if (!urltype || urltype.includes("baidu.com") || urltype.includes("xunlei.com")) continue;

            if (!counts[urltype]) counts[urltype] = 0;

            if (counts[urltype] >= maxPerType) continue;

            counts[urltype]++;
            $utils.toastInfo(`正在获取第${index}个网盘链接...`)
            const href = appConfig.site + $(link).attr('href');

            const { data } = await $fetch.get(href, {
                headers: { 'User-Agent': UA },
            });

            tracks.push({
                name: '网盘'+index,
                pan: data.match(/var\s+panLink\s*=\s*["']([^"']+)["']/)[1],
            });
            index=index+1;
        }
    }

    //排序
    const order = ["quark.cn", "alipan.com", "uc.cn", "189.cn", "115cdn"];
    tracks = tracks.sort((a, b) => {
        const ma = a.pan.match(/^https?:\/\/([^\/?#]+)/i);
        const mb = b.pan.match(/^https?:\/\/([^\/?#]+)/i);
        const ha = ma ? ma[1].toLowerCase() : "";
        const hb = mb ? mb[1].toLowerCase() : "";

        let ia = 999;
        for (let i = 0; i < order.length; i++) {
            if (ha.indexOf(order[i]) !== -1) { ia = i; break; }
        }

        let ib = 999;
        for (let i = 0; i < order.length; i++) {
            if (hb.indexOf(order[i]) !== -1) { ib = i; break; }
        }

        return ia - ib;
    })

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    });
}
async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url

    return jsonify({ urls: [ext.url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/s/${text}/?page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    const videos = $('.cover')
    videos.each((_, e) => {
        const href = $(e).find('a').attr('href')
        const title = $(e).find('a img').attr('alt')
        const cover = $(e).find('a img').attr('src')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}
