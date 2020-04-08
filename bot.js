const ah = require("./ah-parse")

const Telegraf = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)

let trackers = {}
const pollIntervalMin = 300 // in seconds
const pollIntervalMax = 500 // in seconds

bot.use((ctx, next) => {
    console.log('Message from user', ctx.chat, 'text:', ctx.message.text)
    return next(ctx)
})

bot.start((ctx) => ctx.reply('Hallo! Welke postcode wil je tracken?'))
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

// TODO: add /stop handler

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
}

function removeTracking(chatId)
{
    Object.keys(trackers).forEach(key => removeItem(trackers[key].chats, chatId))
    bot.telegram.sendMessage(chatId, "Notificaties gestopt.")
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
            console.log("Results received: ", results)
            tracker.prevChecked = new Date();
            if (results.length && (results+"")!==(tracker.prevSlots+""))
                chats.forEach(c => bot.telegram.sendMessage(c, ah.presentAvailability(results)))
            tracker.prevSlots = results
        }
        catch (error)
        {
            console.log("pollPostcode error: ", error)
        }
    }
}

function poll ()
{
    Object.keys(trackers).forEach(key => pollPostcode(key))

    let nextPoll = Math.round(Math.random() * (pollIntervalMax - pollIntervalMin)) + pollIntervalMin
    console.log("Polling again in " + nextPoll)    
    setTimeout(poll, nextPoll * 1e3)
}

bot.launch()
poll()
