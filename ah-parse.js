const request = require("request-promise")

const daysOfWeek = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"]
const months = ["jan", "feb", "maart", "april", "mei", "juni", "juli", "aug", "sep", "okt", "nov", "dec"]

function isDateAvailable(slot)
{
    let timeSlots = slot.deliveryTimeSlots
    return !!timeSlots.filter(s => s.state != "full").length
}

function processAHResult(result)
{
    try
    {
        let slots = result._embedded.lanes[3]._embedded.items[0]._embedded.deliveryDates
        let available = slots.filter(isDateAvailable)
        return available.map(s => s.date)
    }
    catch (error)
    {
        console.log("AH.processAHResult failed", result)
    }
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

exports.presentAvailability = function presentAvailability(slots, prevSlotsLen)
{
    if (!slots.length)
        return "Geen slots beschikbaar."
    
    const avail = prettyJoin(slots.map(prettyPrintDate))
    if (slots.length < prevSlotsLen)
        return "Nu alleen nog op " + avail
    else if (prevSlotsLen === 0)
        return "Nieuwe slots beschikbaar op " + avail + "!"
    else
        return "Nu ook op " + avail
}

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