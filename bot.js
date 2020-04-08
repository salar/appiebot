const Telegraf = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)

let trackers = {}
const pollIntervalMin = 5 // in seconds
const pollIntervalMax = 10 // in seconds

bot.use((ctx, next) => {
    console.log('Message from user', ctx.chat, 'recieved:', ctx.message.text)
    return next(ctx)
})

bot.start((ctx) => ctx.reply('Hallo! Welke postcode wil je tracken?'))

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
    return { chats: [] }
}

function trackPostcode(postcode, chatId)
{
    if (!trackers[postcode])
        trackers[postcode] = newTracker()
    
    let tracker = trackers[postcode]
    tracker.chats.push(chatId)
}

function pollPostcode (postcode)
{
    console.log("Polling " + postcode)
    trackers[postcode].chats.forEach(c => bot.telegram.sendMessage(c, "Finished polling for you..." + postcode))
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