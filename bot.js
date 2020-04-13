const ah = require("./ah-parse")
const fs = require("fs")
const Telegraf = require("telegraf")
const bot = new Telegraf(process.env.BOT_TOKEN)

const pollIntervalMin = 240 // in seconds
const pollIntervalMax = 360 // in seconds
const stateFile = "state.json"

let trackers = {}

function loadState ()
{
    fs.readFile(stateFile, (err, data) => {
        if (err) return
        try
        {
            const json = JSON.parse(data)
            if (json && json.trackers)
                trackers = json.trackers
            console.log(new Date, "Loaded state", json)
        }
        catch (e) {
            console.error(new Date, "Failed loading state", e)
        }
    });
}

function saveState ()
{
    const json = JSON.stringify({ trackers: trackers }, null, 2)
    fs.writeFile(stateFile, json, (err) => err && console.log(new Date, "saveState failed", json, err))
}

bot.use((ctx, next) => {
    console.log(new Date, "Message from user", ctx.chat, "text:", ctx.message.text)
    return next(ctx)
})

bot.start((ctx) => ctx.reply("Hallo! Welke postcode wil je tracken?"))
bot.command("stop", (ctx) => removeTracking(ctx.chat.id))

bot.on("text", function (ctx)
{
    let postcode = normalizePostcode(ctx.message.text)
    if (postcode)
    {
        ctx.reply("Je krijgt vanaf nu notificaties als er slots beschikbaar zijn voor " + postcode)
        ctx.reply("Stuur /stop om notificaties te stoppen")
        trackPostcode(postcode, ctx.chat.id)
    }
    else
    {
        ctx.reply("Dit is geen postcode?")
    }
})
function normalizePostcode(input)
{
    let postcode = input.match(/(\d{4})\s?([A-Za-z]{2})/)
    if (postcode && postcode.length > 2)
        return postcode[1] + postcode[2].toUpperCase()
    else
        return undefined
}

function newTracker ()
{
    return { chats: [], prevChecked: null, prevSlots: [] }
}

function trackPostcode(postcode, chatId)
{
    if (!trackers[postcode])
        trackers[postcode] = newTracker()
    
    let tracker = trackers[postcode]
    tracker.chats.push(chatId)
    saveState()
}

function removeTracking(chatId)
{
    Object.keys(trackers).forEach(key => removeItem(trackers[key].chats, chatId))
    saveState()
    notify(chatId, "Notificaties gestopt.")
}

function removeItem(array, item)
{
    const index = array.indexOf(item)
    index != -1 && array.splice(index, 1)
}

async function pollPostcode (postcode)
{
    const tracker = trackers[postcode]
    const chats = tracker.chats
    if (chats.length)
    {
        try
        {
            const results = await ah.getAvailability(postcode)
            console.log(new Date, "Results received for ", postcode, results)
            tracker.prevChecked = new Date();
            if (results.length && (results+"")!==(tracker.prevSlots+""))
                chats.forEach(c => notify(c, ah.presentAvailability(results, tracker.prevSlots.length)))
            tracker.prevSlots = results
            saveState()
        }
        catch (error)
        {
            console.log(new Date, "pollPostcode error", error)
        }
    }
}

function notify (user, message)
{
    bot.telegram.sendMessage(user, message)
    console.log(new Date, "Message to", user, message)
}

function poll ()
{
    Object.keys(trackers).forEach(key => pollPostcode(key))

    let nextPoll = Math.round(Math.random() * (pollIntervalMax - pollIntervalMin)) + pollIntervalMin
    console.log(new Date, "Polling again in", nextPoll)
    setTimeout(poll, nextPoll * 1e3)
}

loadState()
bot.launch()
poll()
