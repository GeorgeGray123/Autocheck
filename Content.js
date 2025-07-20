{\rtf1\ansi\ansicpg1252\cocoartf2820
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 (async () => \{\
  const log = console.log;\
  log("\uc0\u55357 \u56960  Estensione check-in avviata");\
\
  const confirmationCodeRegex = /\\b(\\d\{10\})\\b/;\
\
  // 1. Estrai codice di prenotazione da pagina\
  let code = null;\
  const codeMatch = [...document.body.innerText.matchAll(confirmationCodeRegex)];\
  if (codeMatch.length > 0) \{\
    code = codeMatch[0][1];\
    log("\uc0\u9989  Codice prenotazione trovato:", code);\
  \} else \{\
    alert("\uc0\u10060  Nessun codice prenotazione trovato");\
    return;\
  \}\
\
  // 2. Apri nuova tab per cercare il ticket cliente (TSV o altro)\
  const searchUrl = `https://assistenza.tantosvago.it/a/search/tickets?term=$\{code\}`;\
  const searchTab = window.open(searchUrl, '_blank');\
\
  await new Promise(r => setTimeout(r, 2500));\
\
  // 3. Estrai email\
  let clientEmail = null;\
  const allTds = [...document.querySelectorAll("td")];\
  const emailLabel = allTds.find(td => td.textContent.trim().toLowerCase() === "email:");\
  if (emailLabel && emailLabel.nextElementSibling) \{\
    const candidate = emailLabel.nextElementSibling.textContent.trim();\
    if (!candidate.match(/@(hotelston|tantosvago|booking)\\.com$/i)) \{\
      clientEmail = candidate;\
    \}\
  \}\
\
  if (!clientEmail) \{\
    const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+/g;\
    const matches = document.body.innerText.match(emailRegex);\
    if (matches) \{\
      clientEmail = matches.find(e =>\
        !e.endsWith("@property.booking.com") &&\
        !e.endsWith("@noreply.booking.com") &&\
        !e.endsWith("@hotelston.com") &&\
        !e.endsWith("@tantosvago.com") &&\
        !e.endsWith("@booking.com")\
      );\
    \}\
  \}\
\
  if (clientEmail) \{\
    await navigator.clipboard.writeText(clientEmail);\
    log("\uc0\u55357 \u56523  Email copiata negli appunti:", clientEmail);\
  \} else \{\
    alert("\uc0\u10060  Email del cliente non trovata automaticamente");\
    return;\
  \}\
\
  // 4. Torna alla tab originale e clicca su Inoltra\
  const buttons = [...document.querySelectorAll('button')];\
  const inoltraBtn = buttons.find(b => b.innerText.trim().toLowerCase().includes('inoltra'));\
  if (inoltraBtn) \{\
    inoltraBtn.click();\
    log("\uc0\u9989  Bottone 'Inoltra' cliccato");\
  \} else \{\
    alert("\uc0\u10060  Bottone 'Inoltra' non trovato");\
    return;\
  \}\
\
  // 5. Attendi apertura editor\
  await new Promise(r => setTimeout(r, 1200));\
  const editable = document.querySelector('[contenteditable="true"]');\
  if (!editable) \{\
    alert("\uc0\u10060  Campo risposta non trovato");\
    return;\
  \}\
\
  // 6. Rimuovi righe 'please take a look'\
  const parser = new DOMParser();\
  const doc = parser.parseFromString(editable.innerHTML, 'text/html');\
  const toRemove = doc.querySelectorAll('p, div');\
  toRemove.forEach(el => \{\
    if (el.textContent.trim().startsWith("Please take a look at ticket #")) \{\
      el.remove();\
    \}\
  \});\
  editable.innerHTML = doc.body.innerHTML;\
\
  // 7. Incolla header + contenuto clipboard + footer\
  let hotelMessageHTML = "<span style='color:red;'>\uc0\u9888 \u65039  Errore: clipboard non accessibile</span>";\
  try \{\
    const clipboardItems = await navigator.clipboard.read();\
    for (const item of clipboardItems) \{\
      if (item.types.includes("text/html")) \{\
        const blob = await item.getType("text/html");\
        hotelMessageHTML = await blob.text();\
        break;\
      \} else if (item.types.includes("text/plain")) \{\
        const blob = await item.getType("text/plain");\
        const plain = await blob.text();\
        hotelMessageHTML = '<pre>' + plain + '</pre>';\
        break;\
      \}\
    \}\
  \} catch (e) \{\
    log("\uc0\u10060  Clipboard error", e);\
  \}\
\
  const header = `Gentile Cliente,<br><br>La informiamo che abbiamo ricevuto una comunicazione da parte della struttura ricettiva relativa alla Sua prenotazione.<br><br>Messaggio ricevuto dalla struttura:<br><hr>`;\
  const footer = `<hr><br>Cordiali saluti,<br><br>`;\
\
  editable.insertAdjacentHTML("afterbegin", header + hotelMessageHTML + footer);\
  editable.focus();\
  log("\uc0\u9989  Messaggio inserito con template completo");\
\})();\
}