(async () => {
  const log = console.log;
  log('✅ Estensione check-in avviata');

  const confirmationCodeRegex = /\b(\d{10})\b/;

  // 1. Estrai codice di prenotazione da pagina
  let code = null;
  const codeMatch = [...document.body.innerText.matchAll(confirmationCodeRegex)];
  if (codeMatch.length > 0) {
    code = codeMatch[0][1];
    log('✅ Codice prenotazione trovato:', code);
  } else {
    alert('❌ Nessun codice prenotazione trovato');
    return;
  }

  // 2. Apri nuova tab per cercare il ticket cliente (TSV o altro)
  const searchUrl = `https://assistenza.tantosvago.it/a/search/tickets?term=${code}`;
  window.open(searchUrl, '_blank');

  await new Promise(r => setTimeout(r, 2500));

  // 3. Estrai email
  let clientEmail = null;
  const allTds = [...document.querySelectorAll('td')];
  const emailLabel = allTds.find(td => td.textContent.trim().toLowerCase() === 'email:');
  if (emailLabel && emailLabel.nextElementSibling) {
    const candidate = emailLabel.nextElementSibling.textContent.trim();
    if (!candidate.match(/@(hotelston|tantosvago|booking)\.com$/i)) {
      clientEmail = candidate;
    }
  }

  if (!clientEmail) {
    const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
    const matches = document.body.innerText.match(emailRegex);
    if (matches) {
      clientEmail = matches.find(e =>
        !e.endsWith('@property.booking.com') &&
        !e.endsWith('@noreply.booking.com') &&
        !e.endsWith('@hotelston.com') &&
        !e.endsWith('@tantosvago.com') &&
        !e.endsWith('@booking.com')
      );
    }
  }

  if (clientEmail) {
    await navigator.clipboard.writeText(clientEmail);
    log('✅ Email copiata negli appunti:', clientEmail);
  } else {
    alert('❌ Email del cliente non trovata automaticamente');
    return;
  }

  // 4. Torna alla tab originale e clicca su Inoltra
  const buttons = [...document.querySelectorAll('button')];
  const inoltraBtn = buttons.find(b => b.innerText.trim().toLowerCase().includes('inoltra'));
  if (inoltraBtn) {
    inoltraBtn.click();
    log("✅ Bottone 'Inoltra' cliccato");
  } else {
    alert("❌ Bottone 'Inoltra' non trovato");
    return;
  }

  // 5. Attendi apertura editor
  await new Promise(r => setTimeout(r, 1200));
  const editable = document.querySelector('[contenteditable="true"]');
  if (!editable) {
    alert('❌ Campo risposta non trovato');
    return;
  }

  // 6. Rimuovi righe 'please take a look'
  const parser = new DOMParser();
  const doc = parser.parseFromString(editable.innerHTML, 'text/html');
  const toRemove = doc.querySelectorAll('p, div');
  toRemove.forEach(el => {
    if (el.textContent.trim().startsWith('Please take a look at ticket #')) {
      el.remove();
    }
  });
  editable.innerHTML = doc.body.innerHTML;

  // 7. Incolla header + contenuto clipboard + footer
  let hotelMessageHTML = "<span style='color:red;'>⚠️ Errore: clipboard non accessibile</span>";
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        hotelMessageHTML = await blob.text();
        break;
      } else if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        const plain = await blob.text();
        hotelMessageHTML = '<pre>' + plain + '</pre>';
        break;
      }
    }
  } catch (e) {
    log('❌ Clipboard error', e);
  }

  const header = `Gentile Cliente,<br><br>La informiamo che abbiamo ricevuto una comunicazione da parte della struttura ricettiva relativa alla Sua prenotazione.<br><br>Messaggio ricevuto dalla struttura:<br><hr>`;
  const footer = `<hr><br>Cordiali saluti,<br><br>`;

  editable.insertAdjacentHTML('afterbegin', header + hotelMessageHTML + footer);
  editable.focus();
  log('✅ Messaggio inserito con template completo');
})();
