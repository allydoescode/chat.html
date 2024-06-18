const CLIENT_ID     = ""
const CLIENT_SECRET = ""
const REFRESH_TOKEN = ""

const USERNAME      = ""
const CHANNEL       = ""

function getAccessToken() {
    xhr = new XMLHttpRequest()
    xhr.open("POST", "https://id.twitch.tv/oauth2/token", false)
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
    xhr.send(`client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`)

    if (xhr.status === 200) return JSON.parse(xhr.response).access_token
}

const ACCESS_TOKEN = getAccessToken()

function getTwitchID() {
    xhr = new XMLHttpRequest()
    xhr.open("GET", `https://api.twitch.tv/helix/users?login=${CHANNEL}`, false)
    xhr.setRequestHeader("Authorization", `Bearer ${ACCESS_TOKEN}`)
    xhr.setRequestHeader("Client-Id", CLIENT_ID)
    xhr.send(null)

    if (xhr.status === 200) return JSON.parse(xhr.response).data[0].id
}

function getGlobalEmotes() {
    globalEmotes = {}

    // bttv
    xhr = new XMLHttpRequest()
    xhr.open("GET", "https://api.betterttv.net/3/cached/emotes/global", false)
    xhr.send(null)

    if (xhr.status === 200) {
        JSON.parse(xhr.response).forEach(emote => {
            globalEmotes[emote.code] = {
                url: `https://cdn.betterttv.net/emote/${emote.id}/2x.webp`,
                mod: emote.modifier
            }
        })
    }

    len = Object.keys(globalEmotes).length
    console.log(`Loaded ${len} betterttv global emotes...`)

    // 7tv
    xhr = new XMLHttpRequest()
    xhr.open("GET", "https://7tv.io/v3/emote-sets/global", false)
    xhr.send(null)

    if (xhr.status === 200) {
        JSON.parse(xhr.response).emotes.forEach(emote => {
            globalEmotes[emote.name] = {
                url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
                mod: emote.flags === 1
            }
        })
    }

    len = Object.keys(globalEmotes).length
    console.log(`Loaded ${len} seventv global emotes...`)

    // ffz
    xhr = new XMLHttpRequest()
    xhr.open("GET", "https://api.frankerfacez.com/v1/set/global", false)
    xhr.send(null)

    if (xhr.status === 200) {
        resp = JSON.parse(xhr.response)
        Object.keys(resp.sets).forEach(key => {
            resp.sets[key].emoticons.forEach(emote => {
                globalEmotes[emote.name] = {
                    url: `https://cdn.frankerfacez.com/emote/${emote.id}/2`,
                    mod: emote.modifier
                }
            })
        })
    }

    len = Object.keys(globalEmotes).length
    console.log(`Loaded ${len} frankerfacez global emotes...`)

    return globalEmotes
}

function getAvailableEmotes() {
    availableEmotes = {}
    tid = getTwitchID(CHANNEL)

    // bttv
    xhr = new XMLHttpRequest()
    xhr.open("GET", `https://api.betterttv.net/3/cached/users/twitch/${tid}`, false)
    xhr.send(null)

    if (xhr.status === 200) {
        resp = JSON.parse(xhr.response)

        resp.channelEmotes.forEach(emote => {
            availableEmotes[emote.code] = {
                url: `https://cdn.betterttv.net/emote/${emote.id}/2x.webp`,
                mod: emote.modifier
            }
        })

        resp.sharedEmotes.forEach(emote => {
            availableEmotes[emote.code] = {
                url: `https://cdn.betterttv.net/emote/${emote.id}/2x.webp`,
                mod: emote.modifier
            }
        })
    }

    len = Object.keys(availableEmotes).length
    console.log(`Loaded ${len} betterttv channel emotes...`)

    // 7tv
    xhr = new XMLHttpRequest()
    xhr.open("GET", `https://7tv.io/v3/users/twitch/${tid}`, false)
    xhr.send(null)

    if (xhr.status === 200) {
        JSON.parse(xhr.response).emote_set.emotes.forEach(emote => {
            availableEmotes[emote.name] = {
                url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
                mod: emote.flags === 1
            }
        })
    }

    len = Object.keys(availableEmotes).length
    console.log(`Loaded ${len} seventv channel emotes...`)

    // ffz
    xhr = new XMLHttpRequest()
    xhr.open("GET", `https://api.frankerfacez.com/v1/room/${CHANNEL}`, false)
    xhr.send(null)

    if (xhr.status === 200) {
        resp = JSON.parse(xhr.response)
        Object.keys(resp.sets).forEach(key => {
            resp.sets[key].emoticons.forEach(emote => {
                availableEmotes[emote.name] = {
                    url: `https://cdn.frankerfacez.com/emote/${emote.id}/2`,
                    mod: emote.modifier
                }
            })
        })
    }

    len = Object.keys(availableEmotes).length
    console.log(`Loaded ${len} frankerfacez channel emotes...`)

    return availableEmotes
}

const STORED_EMOTES = {...getGlobalEmotes(), ...getAvailableEmotes()}

function parseMessage(message, tags) {
    // don't parse user inputted html
    message = message.replace(/</gm, "&lt;")
    message = message.replace(/>/gm, "&gt;")

    // parse twitch emotes
    twitchEmotes = {}
    if (tags.emotes !== null) {
        Object.keys(tags.emotes).forEach(emote => {
            start = parseInt(tags.emotes[emote][0].split("-")[0])
            end = parseInt(tags.emotes[emote][0].split("-")[1])
            emoteName = message.substring(start, end + 1)
            twitchEmotes[emoteName] = `https://static-cdn.jtvnw.net/emoticons/v2/${emote}/default/dark/3.0`
        })
    }

    message.split(" ").forEach(word => {
        if (twitchEmotes.hasOwnProperty(word)) {
            message = message.replace(word, `<img class="message-emote" src="${twitchEmotes[word]}"/>`)
        }

        if (STORED_EMOTES.hasOwnProperty(word)) {
            className = STORED_EMOTES[word].mod ? "message-emote-modifier" : ""
            message = message.replace(word, `<img class="message-emote ${className}" src="${STORED_EMOTES[word].url}" />`)
        }
    })

    return message
}

const client = new tmi.Client({
    options: { debug: true },
    connection: {
        reconnect: true,
        secure: true,
    },
    identity: {
        username: USERNAME,
        password: `oauth:${ACCESS_TOKEN}`
    },
    channels: [ CHANNEL ]
})

client.connect()

client.on("message", (channel, tags, message, self) => {
    chat = document.getElementById("chat")

    eMessageLine = document.createElement("div")
    eMessageLine.className = "message-line"
    eMessageLine.id = tags.id

    eUsername = document.createElement("span")
    eUsername.className = "username"
    eUsername.style.color = tags.color
    eUsername.innerText = tags.username

    eMessage = document.createElement("span")
    eMessage.className = "message"
    eMessage.innerHTML = parseMessage(message, tags)

    eMessageLine.append(eUsername)
    eMessageLine.append(eMessage)
    chat.append(eMessageLine)

    chat.scrollTo(0, -chat.scrollHeight) 
})