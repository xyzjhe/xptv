
function parseJsonIfString(input) {
    if (typeof input === 'string') {
        try {
            return JSON.parse(input);  // 尝试将字符串解析为 JSON
        } catch (e) {
            console.error("Invalid JSON string", e);
            return null;  // 如果解析失败，返回 null 或其他错误处理
        }
    }
    return input;  // 如果输入是对象，直接返回
}

const cheerio = createCheerio()
const CryptoJS = createCryptoJS()
const headers = {
    'Referer': 'https://pan.funletu.com/',
    'Origin': 'https://pan.funletu.com',
    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    'Content-Type': 'application/json'

}
const appConfig = {
    ver: 1,
    title: "趣盘搜｜PAN_兔",
    site: "https://pan.funletu.com",
    tabs: [{
        name: '只有搜索功能',
        ext: {
            url: '/'
        },
    }]
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let pan_list =ext.pan.split('&&&')

    pan_list.forEach(pan => {
        if (!pan || pan === 'null') return;
        tracks.push({
            name: '',
            pan
        });
    });


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
    return jsonify({
        urls: [],
    })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = [];
    let page = ext.page || 1
    const url = `https://b.funletu.com/search`

    const  data = await $fetch.post(url, {
        keyword:`${ext.text}`,
        categoryid:0,
        filetypeid:0,
        courseid:1,
        page:page,
        pageSize:15,
        sortBy:"sort",
        order:"desc",
        offset:0
    },{
        headers: headers,
    })
    parseJsonIfString(data.data).data.list.forEach(child=>{
        cards.push({
            vod_id: child.id?.toString(),
            vod_name: child.filename?.replace(/<\/?em>/g, '') || ext.text,
            vod_pic:"http://www.kuaipng.com/Uploads/pic/w/2021/04-21/99512/water_99512_698_698_.png",
            vod_remarks: child.size,
            ext: {
                url: `https://pan.funletu.com/c?uid=${child.id}`,
                pan:`${child.link}&&&${child.url}`
            },
        })

    })

    return jsonify({
        list: cards,
    })
}


