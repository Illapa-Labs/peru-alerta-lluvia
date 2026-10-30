[Español](experiencia-de-usuario.md) | **English**

# User experience: who uses it and what they need

This document defines who Perú Alerta Lluvia is for and what each person must be able to do, before deciding how it looks. Every design change should be explainable by one of the journeys here.

## How it was made

It follows Google's **critical user journeys** (CUJs): a user, who has a goal, and the tasks they do to reach it, told from their side ("As someone who lives by a ravine I want to know whether there is danger today"). Five to seven are chosen, of two kinds:

- **Toothbrush**: done often, so they must be very fast.
- **Pivotal**: done rarely, but they matter a lot when they happen.

The journeys decide what comes first on screen, what is tested before release and what is measured afterwards. Measuring uses a version of **HEART** (the framework from Google's user experience team: happiness, engagement, adoption, retention and task success), cut down to what can be known without cookies or personal data.

This is a working definition, built from what is known about the warning and the people who read it. It has to be tested with real people (see [How to validate](#how-to-validate)).

## The context

- SENAMHI's warning covers **the next 24 hours** and has three levels: yellow (moderate rain, 10 mm or more), orange (heavy, 40 mm or more) and red (very heavy, 80 mm or more). The real danger is **ravines that flood** (huaicos, debris flows) and rising rivers.
- Almost everyone comes **from a phone**, often through a **WhatsApp** link, on **prepaid data** and sometimes 3G. Many phones are low end.
- **Millimetres** mean nothing to most people. "Very heavy rain" and "stay away from ravines" do.
- It is read **outdoors, in a hurry or scared**: it must make sense at a glance, with one hand.

## The people

**Rosa, 42. Lives in Chosica, a block from a ravine.**
Has a basic Android phone and prepaid data. Gets the link from her neighbourhood WhatsApp group. Does not know what a millimetre of rain is, but remembers the 2017 debris flow.
*Wants to know*: whether there is danger where she lives today, and what to do.
*Dislikes*: long text, numbers with no explanation, slow pages.

**Javier, 35. Driver for a Lima–Huancayo transport company.**
Checks before leaving, on his phone, sometimes from the highlands with poor signal.
*Wants to know*: whether the provinces on his route have a warning today, and whether it is raining now.
*Dislikes*: going district by district.

**Carmen, 30. Lives in Lima; her parents live in Tambo Grande (Piura).**
*Wants to know*: whether her parents are in a warning zone, and to send them the link with what to do.
*Dislikes*: not being able to share that exact place.

**Luis, 45. Works in a municipal disaster-risk office (or is a local journalist).**
Uses a computer at the office and a phone in the field.
*Wants to know*: which districts in his province or department have a warning, how many people live in the ravine zones, and to have the official source at hand.
*Dislikes*: data he cannot cite or date.

## The critical journeys

| # | Journey | Person | Kind |
|---|---|---|---|
| 1 | Know whether there is a warning where I live today and what to do | Rosa | Toothbrush |
| 2 | Open the link to a place someone sent me | Rosa, Carmen | Toothbrush |
| 3 | See where it is raining now and what is coming | Javier | Toothbrush |
| 4 | Check the warnings along a route before travelling | Javier | Pivotal |
| 5 | Send someone the warning for their place | Carmen | Pivotal |
| 6 | Know which districts and how many people are in warning zones | Luis | Pivotal |

### 1. Know whether there is a warning where I live today and what to do (the main one)

Happy path, on a phone:

1. Opens the site. Sees the map of Peru with the warning zones coloured, and at the bottom a sheet with the warning for the place shown.
2. Taps their area on the map (or searches for it by name).
3. Without opening anything else, the sheet shows **the place, the level with its colour and word ("Aviso rojo · Lluvia muy fuerte"), and what to do** ("Aléjate de quebradas y ríos…").

Success: reaches "what to do" in **two taps or fewer and under 10 seconds on 3G**. With no warning, it says so just as clearly ("Sin aviso de lluvia hoy").

### 2. Open the link to a place someone sent me

1. Taps the link in WhatsApp (for example `alerta.illapalabs.org/piura/piura/tambo-grande`). The preview already says what it is.
2. The site opens straight on that district, with the map framed and the sheet showing its warning and what to do. **Zero taps.**

### 3. See where it is raining now and what is coming

1. The current rain is already on the map.
2. With the thumb, taps ▶ or drags the bar: back, what fell in the last hours; forward, the forecast.
3. The scale names the intensity in words (drizzle, moderate, heavy) and, for those who want it, in millimetres per hour.

### 4. Check the warnings along a route before travelling

1. Pans and zooms along the route; warning zones show by colour.
2. Taps the provinces on the way; the sheet shows each one's highest warning.

### 5. Send someone the warning for their place

1. Picks the district (journey 1).
2. Shares the page address: the link opens that place (journey 2).

### 6. Know which districts and how many people are in warning zones

1. Picks the department or province.
2. Opens the sheet (phone) or reads the panel (computer): the districts with a warning, sorted by level; how many people live in villages inside ravine zones; the source and date of the warning.

## Requirements

### Functional

Priority: **Must** (useless without it), **Should** (important, can wait a little), **Could** (if there is time).

| Requirement | Priority | Journey | Today |
|---|---|---|---|
| The map comes first: warning zones visible on opening | Must | 1, 3, 4 | Yes |
| Tapping a place on the map gives its level and what to do, without opening anything else | Must | 1 | Yes (closed sheet) |
| Every place has its address, and the link opens that place | Must | 2, 5 | Yes |
| Say what date the warning is from and that it covers 24 hours, and flag it when it is out of date | Must | 1, 6 | Yes |
| Search for a **district** or province by name, not only a department | Must | 1, 5 | Yes |
| Search by town or city name (Chosica is in the Lurigancho district) | Should | 1 | No |
| The source (SENAMHI), that it is not an official site, and emergency numbers (115, 116) | Must | 6 | Yes (in the open sheet) |
| Rain over the last hours and the forecast, with controls within thumb reach | Should | 3 | Yes |
| A share button (the phone's menu) with the warning text | Should | 5 | No |
| "My location": go to the district I am in, with permission | Should | 1 | No |
| The districts with a warning and the population in ravine zones | Should | 6 | Yes |
| Drag the sheet with a finger to open or close it | Could | 1 | No: a tap opens it |
| Save my places | Could | 1 | No |
| Notify me when my place's warning changes | Could | 1 | No |
| Quechua and other languages | Could | 1 | No |

### Non-functional

- **Fast on a poor signal**: the warning (text) shows before the map; first view in under 2.5 seconds on 4G; heavy data (district shapes, rain) loads later.
- **Clear**: words before numbers; numbers stay, as detail.
- **Accessible**: colour is never alone (always with a word); AA contrast; tap targets at least 44 px; works with a screen reader.
- **One-handed**: what is tapped sits at the bottom; at the top, what is only read (legend, search).
- **Reliable**: if the source fails, the last warning shows with its date, and says so.
- **Private**: no cookies or personal data; visits are counted anonymously.
- **Open and credited**: SENAMHI, NASA, the UK Met Office and OpenStreetMap are credited.

## Design principles

1. **Map first.** It is what people come for.
2. **One answer, then the detail.** The closed sheet answers "is there danger and what do I do?"; the rest is one tap away.
3. **What to do before why.** The explanation comes after the action.
4. **Words before numbers.** "Very heavy rain", and under it "80 mm or more in 24 h".
5. **Colour never alone.** The legend says what each colour means.
6. **Within thumb reach.** Controls at the bottom; at the top, only what is read.
7. **Inform, do not alarm.** The level is given with SENAMHI's number (2, 3 and 4, the one heard on the news: "red alert, level 4"), its colour and its word; no alarm signs.
8. **The same line on phone and computer.** First the summary (place, level, what to do, date), then the detail. On a computer the detail is already in view; on a phone, one tap away.

## How to measure (HEART, without cookies)

| Signal | What is looked at | Where from |
|---|---|---|
| Task success (journeys 1 and 2) | Visits that reach a district's address | Anonymous analytics by path |
| Adoption (journeys 2 and 5) | Visits that come from WhatsApp or other apps | The visit's referrer |
| Engagement (journey 3) | Times the rain is opened | To be decided, without personal data |
| Retention | Visits on days with an orange or red warning | Anonymous analytics by day |
| Happiness | One optional question, "Did this help?" | To be decided |

## How to validate

Before taking these journeys as right, test them with **five people** like the ones above (people living by ravines, drivers, relatives far away), on their own phones:

- Ask for journey 1 without explaining anything, and count taps and seconds.
- Ask what they understand from the legend and the rain scale.
- Note where they hesitate. Each hesitation is a design change or a new requirement.

## Sources

- [Critical User Journeys: The Key UX Technique From Google](https://blog.uxtweak.com/critical-user-journey/) (UXtweak)
- [Unlocking the secrets of UX](https://www.mindtheproduct.com/product-development-and-ux-critical-user-journeys/), Javier Bargas-Avila (Google), at Mind the Product
- [How to Map a Critical User Journey](https://productschool.com/blog/user-experience/critical-user-journey) (Product School)
- [What is the HEART framework?](https://ixdf.org/literature/topics/heart-framework) (Interaction Design Foundation); the original paper is *Measuring the user experience on a large scale* (Rodden, Hutchinson and Fu, CHI 2010)
