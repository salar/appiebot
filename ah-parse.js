const request = require("request-promise")

// let data = require("./example-data/ah-2.json")
// let data = require("./example-data/ah-all-full.json")
const daysOfWeek = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"]
const months = ["jan", "feb", "maart", "april", "mei", "juni", "juli", "aug", "sep", "okt", "nov", "dec"]

function isDateAvailable(slot)
{
    let timeSlots = slot.deliveryTimeSlots
    return !!timeSlots.filter(s => s.state != "full").length
}

function processAHResult(result)
{
    let slots = result._embedded.lanes[3]._embedded.items[0]._embedded.deliveryDates
    let available = slots.filter(isDateAvailable)
    return available.map(s => s.date)
}

function processResult(error, response, body)
{
    if (error)
    {
        process.stdout.write("Error!")
        process.stdout.write(response)
        process.stdout.write(body)
        console.log(error)
    }
    else
        process.stdout.write(presentAvailability(processAHResult(body)))
}

function prettyPrintDate(date)
{
    let d = new Date(date)
    return [daysOfWeek[d.getDay()], d.getDate(), months[d.getMonth()]].join(" ")
}

function prettyJoin(s)
{
    return s.length > 1 ? s.slice(0, s.length - 1).join(", ") + " en " + s[s.length - 1] : s[0]
}

exports.presentAvailability = function presentAvailability(slots)
{
    return slots.length
        ? "Nieuwe slots beschikbaar op " + prettyJoin(slots.map(prettyPrintDate)) + "!"
        : "Geen slots beschikbaar."
}

// process.stdout.write("Hello!")
// process.stdout.write(presentAvailability(processAHResult(data)))

// let url = "https://www.ah.nl/servicxe/rest/delegate?url=%2Fkies-moment%2Fbezorgen%2F1052AE"
// request({ url: url, json: true }, processResult)

exports.getAvailability = async function getAvailability(postcode)
{
    try
    {
        console.log("AH.getAvailability for ", postcode)
        const url = "https://www.ah.nl/service/rest/delegate?url=%2Fkies-moment%2Fbezorgen%2F" + postcode
        const result = await request({ url: url, json: true})
        return processAHResult(result)
    }
    catch (error)
    {
        console.log("AH.getAvailability failed", error)
    }
}