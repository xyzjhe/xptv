

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
    // let pan_list =ext.url.split('&')

    // pan_list.forEach(child=>{
    tracks.push({
        name:'',
        pan: ext.pan,

    })

    // })


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
            vod_id: child.id.toString(),
            vod_name: child.filename.replace(/<\/?em>/g, ''),
            vod_pic:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFGmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjIuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjEtMDctMDFUMTU6NDM6MTgrMDg6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIxLTA3LTIxVDEzOjUzOjEzKzA4OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIxLTA3LTIxVDEzOjUzOjEzKzA4OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmEyODBlMWQzLWY0MTYt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",
            vod_remarks: child.size,
            ext: {
                url: `https://pan.funletu.com/c?uid=${child.id}`,
                pan:`${child.url}`
            },
        })

    })
    return jsonify({
        list: cards,
    })
}




