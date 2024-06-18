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
    eMessage.innerHTML = message

    eMessageLine.append(eUsername)
    eMessageLine.append(eMessage)
    chat.append(eMessageLine)

    chat.scrollTo(0, -chat.scrollHeight) 
})