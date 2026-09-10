/**
 * The legal texts, and the one place they live.
 *
 * The privacy notice below is a **draft written from the code**, not from a
 * generator. That is a deliberate trade: a generator is maintained by people
 * qualified to read the law but knows nothing about this app, and its output
 * for an Art. 9 service is generic where it most needs to be specific. This
 * text is the other way round — every factual claim in it was established by
 * auditing what merit actually does (`docs/LEGAL-INPUTS.md` records the method),
 * and it is structured to cover each item Art. 13 requires.
 *
 * What it is not is legally reviewed. **Have it read once by a lawyer before
 * anybody outside the household is invited.** Prose that looks like a legal
 * document and has never been checked is exactly the failure mode this file
 * used to warn about; the answer is a review, not an absence.
 *
 * `PRIVACY.version` is deliberately left empty, which keeps both legal pages in
 * their "unfinished" state and stops the consent gate from asking anybody for
 * anything. Fill in the two placeholders in `CONTROLLER`, then set the version
 * to its date. That single edit is what puts the app into service.
 */

/** The one place the controller appears. Both documents read from it. */
const CONTROLLER = {
  name: 'Tim Schwietzke',
  email: 'trymerit.app@gmail.com',
} as const

/** One block of a document: an optional heading and its paragraphs. */
export interface Block {
  heading?: string
  paragraphs: string[]
  /** Rendered as a bulleted list under the paragraphs. */
  items?: string[]
}

export interface Document {
  /** ISO date the text was generated. Bumping it re-asks for consent. */
  version: string
  de: Block[]
  en: Block[]
}

export const PRIVACY: Document = {
  version: '2026-09-10',

  de: [
    {
      paragraphs: [
        `merit ist eine private, nicht-kommerzielle Anwendung zur Aufzeichnung von Gewicht, Ernährung und Training. Sie erfasst Gesundheitsdaten, die das Datenschutzrecht besonders schützt. Diese Erklärung sagt, welche Daten das sind, worauf ihre Verarbeitung beruht, wer sie zu sehen bekommt und welche Rechte du hast.`,
      ],
    },
    {
      heading: 'Verantwortlicher',
      paragraphs: [
        `Verantwortlich im Sinne der DSGVO ist:`,
        CONTROLLER.name,
        `E-Mail: ${CONTROLLER.email}`,
        `Ein Datenschutzbeauftragter ist nicht bestellt; die Schwellen des § 38 BDSG sind nicht erreicht.`,
      ],
    },
    {
      heading: 'Was merit ist, und was nicht',
      paragraphs: [
        `merit wird für einen geschlossenen Kreis von etwa zehn bis dreißig Personen betrieben, die alle persönlich bekannt sind. Konten werden ausschließlich auf Einladung angelegt; eine öffentliche Registrierung gibt es nicht.`,
        `Es wird nichts verkauft, es gibt keine Werbung, keine Affiliate-Links und keine Zahlungen. Es findet kein Profiling und keine automatisierte Entscheidungsfindung im Sinne des Art. 22 DSGVO statt. merit ist kein Medizinprodukt und gibt weder Ernährungs- noch Trainingsempfehlungen — die App zeigt dir deine eigenen Zahlen und sonst nichts.`,
        `Das Angebot richtet sich an Erwachsene und nicht an Kinder im Sinne des Art. 8 DSGVO.`,
      ],
    },
    {
      heading: 'Gesundheitsdaten',
      paragraphs: [
        `Den Kern der Anwendung bilden Daten, die Art. 9 Abs. 1 DSGVO als besondere Kategorie personenbezogener Daten einstuft:`,
      ],
      items: [
        'Körpergewicht und optional Körperfettanteil',
        'was du isst, pro Tag und pro Mahlzeit, mit Kalorien und Nährwerten',
        'wie du trainierst: Übungen, Sätze, Wiederholungen, Gewichte und optional RIR',
        'optional Körpergröße, Geburtsdatum, Geschlecht, Aktivitätsniveau und Ziel — nur, wenn du dir ein Kalorienziel berechnen lässt',
      ],
    },
    {
      paragraphs: [
        `Rechtsgrundlage ist deine ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO. Sie wird vor der ersten Nutzung auf einem eigenen Bildschirm eingeholt, getrennt von allem anderen. Festgehalten werden der Zeitpunkt und die Fassung dieser Erklärung, der du zugestimmt hast, damit die Einwilligung nach Art. 7 Abs. 1 DSGVO nachweisbar ist.`,
        `Du kannst die Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO). Der Widerruf ist die Löschung des Kontos, denn die Einwilligung ist die einzige Grundlage, auf der diese Daten aufbewahrt werden. Der entsprechende Knopf liegt im Bereich „konto" und wirkt sofort. Die Rechtmäßigkeit der Verarbeitung bis zum Widerruf bleibt unberührt.`,
        `Wird diese Erklärung inhaltlich geändert, wird erneut gefragt. Eine Einwilligung in eine ältere Fassung beschreibt eine andere Verarbeitung und gilt nicht fort.`,
      ],
    },
    {
      heading: 'Kontodaten',
      paragraphs: [
        `Zum Konto gehören deine E-Mail-Adresse und ein Hash deines Passworts, gespeichert bei Supabase Auth. Das Passwort selbst wird nicht gespeichert und ist nicht wiederherstellbar.`,
        `Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO: ohne diese Daten gibt es keine Anmeldung und damit keine Nutzung.`,
      ],
    },
    {
      heading: 'Einstellungen',
      paragraphs: [
        `Gespeichert werden außerdem die gewählte Sprache und das gewählte Farbschema. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.`,
      ],
    },
    {
      heading: 'Server-Protokolle',
      paragraphs: [
        `Die eingesetzten Hosting-Dienstleister führen technische Protokolle über Zugriffe. Darin enthalten sind in der Regel die IP-Adresse, Datum und Uhrzeit des Zugriffs, die angeforderte Adresse, der Statuscode sowie Angaben zu Browser und Betriebssystem.`,
        `Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im technischen Betrieb und in der Sicherheit der Anwendung. Diese Protokolle werden vom Verantwortlichen nicht ausgewertet und nicht mit anderen Daten zusammengeführt; sie werden von den Dienstleistern nach deren Fristen automatisch gelöscht.`,
      ],
    },
    {
      heading: 'Anfragen per E-Mail',
      paragraphs: [
        `Wenn du dich per E-Mail an die oben genannte Adresse wendest, wird deine Nachricht mit allen daraus hervorgehenden Angaben gespeichert und verarbeitet, um dein Anliegen zu bearbeiten. Weitergegeben wird davon nichts.`,
        `Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO — das berechtigte Interesse an der Bearbeitung der an uns gerichteten Anfragen —, bei Anfragen zu deinem Konto Art. 6 Abs. 1 lit. b DSGVO. Die Nachricht bleibt gespeichert, bis du zur Löschung aufforderst oder der Zweck entfällt, also in der Regel nach abgeschlossener Bearbeitung.`,
      ],
    },
    {
      heading: 'Verschlüsselung',
      paragraphs: [
        `Die Verbindung zwischen deinem Browser und merit ist durchgehend per TLS verschlüsselt, erkennbar am „https://" in der Adresszeile und am Schloss-Symbol. Eine unverschlüsselte Verbindung ist nicht möglich; sie wird technisch erzwungen. Auch die Verbindung zur Datenbank ist verschlüsselt.`,
      ],
    },
    {
      heading: 'Speicherung auf deinem Gerät',
      paragraphs: [
        `merit setzt keine Cookies — weder eigene noch die Dritter. Es gibt kein Tracking, keine Analysewerkzeuge, keine Werbenetzwerke, keine Zählpixel und keine eingebetteten Inhalte fremder Anbieter. Schriften werden vom eigenen Server ausgeliefert; es besteht insbesondere keine Verbindung zu Google Fonts.`,
        `Im lokalen Speicher deines Browsers werden ausschließlich zwei technisch notwendige Angaben abgelegt: das Sitzungs-Token deiner Anmeldung, ohne das der von dir angeforderte Dienst nicht funktioniert, und — sofern du selbst ein Farbschema wählst — diese Auswahl. Vor deiner ersten Handlung wird nichts gespeichert.`,
        `Beides fällt unter § 25 Abs. 2 Nr. 2 TDDDG und ist damit einwilligungsfrei. Ein Cookie-Banner ist deshalb nicht erforderlich.`,
      ],
    },
    {
      heading: 'Empfänger und Auftragsverarbeiter',
      paragraphs: [
        `Deine Daten werden nicht verkauft und nicht zu Werbezwecken weitergegeben. Andere Nutzerinnen und Nutzer der App können deine Einträge nicht sehen. Eingeschaltet sind die folgenden Dienstleister, jeweils als Auftragsverarbeiter auf Grundlage eines Vertrags nach Art. 28 DSGVO:`,
      ],
      items: [
        'Supabase Pte. Ltd, 65 Chulia Street #38-02/03, OCBC Centre, Singapur 049513 — Datenbank und Anmeldung. Die Daten liegen in der Region EU (Frankfurt am Main).',
        'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA — Auslieferung der Anwendung an deinen Browser.',
      ],
    },
    {
      paragraphs: [
        `Beide Unternehmen haben ihren Sitz außerhalb der EU. Für Zugriffe aus einem Drittland gelten die Standardvertragsklauseln der Europäischen Kommission nach Art. 46 Abs. 2 lit. c DSGVO, die Bestandteil der jeweiligen Auftragsverarbeitungsverträge sind. Die Datenbank selbst wird in Frankfurt am Main betrieben.`,
      ],
    },
    {
      heading: 'Barcode-Scan (Open Food Facts)',
      paragraphs: [
        `Wenn — und nur wenn — du einen Barcode scannst, fragt dein Browser die Datenbank von Open Food Facts ab, betrieben von der gemeinnützigen Organisation Open Food Facts mit Sitz in Frankreich. Übermittelt werden dabei die gescannte Nummer und, technisch unvermeidbar, deine IP-Adresse. Es wird nicht übermittelt, wer du bist oder was du sonst isst.`,
        `Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da die Abfrage die von dir angeforderte Funktion ist. Ein einmal gefundenes Produkt wird in der Datenbank von merit gespeichert, sodass dieselbe Nummer kein zweites Mal übermittelt wird.`,
        `Die Textsuche nach Lebensmitteln nutzt die Datenbank FoodData Central des US-amerikanischen Landwirtschaftsministeriums. Diese Abfrage läuft über einen eigenen Server; deine IP-Adresse erreicht den Dienst dabei nicht.`,
      ],
    },
    {
      heading: 'Speicherdauer',
      paragraphs: [
        `Deine Daten werden gespeichert, solange dein Konto besteht. Eine automatische Löschfrist gibt es nicht, weil eine über Jahre fortlaufende Aufzeichnung der Zweck der Anwendung ist.`,
        `Löschst du dein Konto, werden alle daran gebundenen Daten unwiderruflich entfernt: Profil, Gewichtseinträge, Ernährungstagebuch, Ziele, Trainingspläne, Trainingseinheiten und Sätze.`,
        `Eine Ausnahme, die hier stehen muss, damit die Zusage stimmt: Lebensmittel und Übungen, die du dem gemeinsamen Katalog hinzugefügt hast, bleiben erhalten, weil andere sie weiterhin verwenden. Der Verweis auf dein Konto wird dabei entfernt. Es handelt sich dann um Angaben über ein Produkt oder eine Übung, nicht mehr über eine Person.`,
      ],
    },
    {
      heading: 'Deine Rechte',
      paragraphs: [
        `Dir stehen die folgenden Rechte zu. Die beiden wichtigsten sind in die App eingebaut und brauchen keine Anfrage:`,
      ],
      items: [
        'Auskunft (Art. 15) und Datenübertragbarkeit (Art. 20): Du kannst alle deine Daten jederzeit im Bereich „konto" als vollständige Datei herunterladen, sofort und ohne zu fragen.',
        'Löschung (Art. 17): Ebenfalls im Bereich „konto", sofort wirksam.',
        'Berichtigung (Art. 16): Jeder Eintrag ist in der App änderbar.',
        'Einschränkung der Verarbeitung (Art. 18) und Widerspruch (Art. 21): per E-Mail an die oben genannte Adresse.',
        'Widerruf der Einwilligung (Art. 7 Abs. 3): jederzeit, siehe oben.',
      ],
    },
    {
      paragraphs: [
        `Unabhängig davon steht dir nach Art. 77 DSGVO ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, insbesondere bei der Behörde deines gewöhnlichen Aufenthaltsorts oder der für den Verantwortlichen zuständigen Behörde.`,
        `Die Bereitstellung deiner Daten ist weder gesetzlich noch vertraglich vorgeschrieben. Du bist zu nichts verpflichtet; ohne Konto und ohne Einwilligung ist die Nutzung der Anwendung allerdings nicht möglich.`,
      ],
    },
    {
      heading: 'Änderungen',
      paragraphs: [
        `Ändert sich, was die Anwendung tut, wird diese Erklärung angepasst. Die jeweils gültige Fassung ist an ihrem Datum erkennbar. Betrifft die Änderung die Verarbeitung deiner Gesundheitsdaten, wird deine Einwilligung erneut eingeholt.`,
      ],
    },
  ],

  en: [
    {
      paragraphs: [
        `merit is a private, non-commercial application for recording weight, nutrition and training. It processes health data, which data protection law protects specifically. This notice says what that data is, what its processing rests on, who receives it and what rights you have.`,
      ],
    },
    {
      heading: 'Controller',
      paragraphs: [
        `The controller within the meaning of the GDPR is:`,
        CONTROLLER.name,
        `Email: ${CONTROLLER.email}`,
        `No data protection officer has been appointed; the thresholds in § 38 BDSG are not met.`,
      ],
    },
    {
      heading: 'What merit is, and is not',
      paragraphs: [
        `merit is run for a closed group of roughly ten to thirty people, all personally known. Accounts are created by invitation only; there is no public registration.`,
        `Nothing is sold. There is no advertising, no affiliate link and no payment. No profiling takes place, and no automated decision-making within the meaning of Art. 22 GDPR. merit is not a medical device and gives neither dietary nor training advice — it shows you your own numbers and nothing else.`,
        `The service is offered to adults and is not directed at children within the meaning of Art. 8 GDPR.`,
      ],
    },
    {
      heading: 'Health data',
      paragraphs: [
        `At the centre of the application is data that Art. 9(1) GDPR treats as a special category of personal data:`,
      ],
      items: [
        'body weight and, optionally, body fat percentage',
        'what you eat, per day and per meal, with calories and macronutrients',
        'how you train: exercises, sets, repetitions, weights and optionally RIR',
        'optionally height, date of birth, sex, activity level and goal — only if you ask the app to calculate a calorie target',
      ],
    },
    {
      paragraphs: [
        `The legal basis is your explicit consent under Art. 9(2)(a) GDPR. It is taken before first use, on a screen of its own, separate from everything else. The time of consent and the version of this notice you agreed to are recorded, so that consent can be demonstrated under Art. 7(1) GDPR.`,
        `You may withdraw consent at any time with effect for the future (Art. 7(3) GDPR). Withdrawal is deletion of the account, because consent is the only basis on which any of this data is kept. The button sits under "account" and acts immediately. The lawfulness of processing before withdrawal is unaffected.`,
        `If this notice changes in substance, you are asked again. Consent to an earlier version describes different processing and does not carry over.`,
      ],
    },
    {
      heading: 'Account data',
      paragraphs: [
        `An account consists of your email address and a hash of your password, held by Supabase Auth. The password itself is not stored and cannot be recovered.`,
        `The legal basis is Art. 6(1)(b) GDPR: without this there is no sign-in and therefore no service.`,
      ],
    },
    {
      heading: 'Preferences',
      paragraphs: [
        `The language and colour scheme you choose are also stored. The legal basis is Art. 6(1)(b) GDPR.`,
      ],
    },
    {
      heading: 'Server logs',
      paragraphs: [
        `The hosting providers keep technical logs of requests. These typically contain the IP address, the date and time of the request, the address requested, the status code and information about browser and operating system.`,
        `The legal basis is Art. 6(1)(f) GDPR; the legitimate interest is the technical operation and security of the application. These logs are not analysed by the controller and are not combined with other data. They are deleted automatically according to each provider's own retention periods.`,
      ],
    },
    {
      heading: 'Enquiries by email',
      paragraphs: [
        `If you write to the address above, your message and everything in it is stored and processed in order to deal with your enquiry. None of it is passed on.`,
        `The legal basis is Art. 6(1)(f) GDPR — the legitimate interest in handling enquiries addressed to us — or, for questions about your account, Art. 6(1)(b) GDPR. The message is kept until you ask for it to be deleted or the purpose ceases, which is normally once the matter is settled.`,
      ],
    },
    {
      heading: 'Encryption',
      paragraphs: [
        `The connection between your browser and merit is encrypted end to end with TLS, which you can see from the "https://" in the address bar and the padlock icon. An unencrypted connection is not possible; it is enforced technically. The connection to the database is encrypted as well.`,
      ],
    },
    {
      heading: 'Storage on your device',
      paragraphs: [
        `merit sets no cookies, neither its own nor those of third parties. There is no tracking, no analytics tool, no advertising network, no counting pixel and no embedded third-party content. Fonts are served from our own origin; in particular, no connection is made to Google Fonts.`,
        `Two technically necessary items are placed in your browser storage: the session token of your sign-in, without which the service you requested cannot work, and — if you choose a colour scheme yourself — that choice. Nothing at all is stored before you act.`,
        `Both fall under § 25(2)(2) TDDDG and therefore require no consent. No cookie banner is needed.`,
      ],
    },
    {
      heading: 'Recipients and processors',
      paragraphs: [
        `Your data is not sold and not passed on for advertising. Other people using the app cannot see your entries. The following providers are engaged, each as a processor under a contract pursuant to Art. 28 GDPR:`,
      ],
      items: [
        'Supabase Pte. Ltd, 65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513 — database and authentication. The data is held in the EU region (Frankfurt am Main).',
        'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA — delivery of the application to your browser.',
      ],
    },
    {
      paragraphs: [
        `Both companies are established outside the EU. For access from a third country, the European Commission Standard Contractual Clauses under Art. 46(2)(c) GDPR apply; they form part of the respective processing agreements. The database itself runs in Frankfurt am Main.`,
      ],
    },
    {
      heading: 'Barcode scanning (Open Food Facts)',
      paragraphs: [
        `If — and only if — you scan a barcode, your browser queries the Open Food Facts database, run by the non-profit organisation Open Food Facts based in France. The scanned number is sent, together with your IP address, which is technically unavoidable. Who you are and what else you eat are not sent.`,
        `The legal basis is Art. 6(1)(b) GDPR, since the lookup is the function you asked for. A product once found is stored in merit's own database, so the same number is never sent twice.`,
        `Text search for whole foods uses FoodData Central, the database of the United States Department of Agriculture. That query is made by our own server; your IP address does not reach the service.`,
      ],
    },
    {
      heading: 'Retention',
      paragraphs: [
        `Your data is kept for as long as your account exists. There is no automatic deletion period, because a record spanning years is the purpose of the application.`,
        `If you delete your account, everything bound to it is removed irreversibly: profile, weigh-ins, food log, targets, routines, workouts and sets.`,
        `One exception has to be stated here for the promise to be true: foods and exercises you added to the shared catalogue remain, because other people continue to use them. The reference to your account is removed. What is left is information about a product or an exercise, no longer about a person.`,
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        `You have the following rights. The two that matter most are built into the app and need no request:`,
      ],
      items: [
        'Access (Art. 15) and portability (Art. 20): you can download all of your data as a complete file at any time under "account", immediately and without asking anybody.',
        'Erasure (Art. 17): also under "account", effective immediately.',
        'Rectification (Art. 16): every entry can be edited in the app.',
        'Restriction (Art. 18) and objection (Art. 21): by email to the address above.',
        'Withdrawal of consent (Art. 7(3)): at any time, see above.',
      ],
    },
    {
      paragraphs: [
        `Independently of this, Art. 77 GDPR gives you the right to lodge a complaint with a data protection supervisory authority, in particular the authority of your habitual residence or the one competent for the controller.`,
        `Providing your data is neither required by law nor by contract. You are under no obligation; without an account and without consent, however, the application cannot be used.`,
      ],
    },
    {
      heading: 'Changes',
      paragraphs: [
        `If what the application does changes, this notice is updated. The version in force is identified by its date. Where a change affects the processing of your health data, your consent is obtained again.`,
      ],
    },
  ],
}

/**
 * Not an imprint in the § 5 DDG sense, and deliberately so.
 *
 * § 5 DDG applies to *geschäftsmäßige* services. merit is invite-only, sells
 * nothing, carries no advertising, is `noindex` and is linked from nowhere, so
 * the exemption for purely private services applies and no summonable postal
 * address has to be published. What stands below is a voluntary statement of
 * who runs it — which is what a private service can give without publishing a
 * home address. `docs/LEGAL-INPUTS.md` §1 records the reasoning; if merit ever
 * stops being private (a public demo account, a link from a portfolio), this
 * page needs a real address and the position has to be revisited.
 */
export const IMPRINT: Document = {
  version: '2026-09-10',

  de: [
    {
      paragraphs: [
        `merit ist ein privates, nicht-kommerzielles Projekt für einen geschlossenen Kreis eingeladener Personen. Es wird nichts verkauft, es gibt keine Werbung und keine öffentliche Registrierung. Für rein private Dienste schreibt § 5 DDG kein Impressum vor. Die folgenden Angaben stehen hier freiwillig, damit erkennbar ist, wer merit betreibt und wie er erreichbar ist.`,
      ],
    },
    {
      heading: 'Betreiber',
      paragraphs: [CONTROLLER.name, `E-Mail: ${CONTROLLER.email}`],
    },
    {
      heading: 'Verantwortlicher im Sinne der DSGVO',
      paragraphs: [
        `Dieselbe Person. Was mit deinen Daten geschieht, steht in der Datenschutzerklärung.`,
      ],
    },
    {
      heading: 'Haftung für Inhalte',
      paragraphs: [
        `merit zeigt dir deine eigenen Eingaben und Werte aus öffentlichen Lebensmitteldatenbanken. Die Anwendung ist kein Medizinprodukt und gibt weder medizinische noch Ernährungs- oder Trainingsempfehlungen. Für Nährwertangaben aus externen Quellen wird keine Gewähr übernommen.`,
      ],
    },
  ],

  en: [
    {
      paragraphs: [
        `merit is a private, non-commercial project for a closed group of invited people. Nothing is sold, there is no advertising and no public registration. German law requires no imprint for purely private services. The details below are given voluntarily, so that it is clear who runs merit and how they can be reached.`,
      ],
    },
    {
      heading: 'Operator',
      paragraphs: [CONTROLLER.name, `Email: ${CONTROLLER.email}`],
    },
    {
      heading: 'Controller under the GDPR',
      paragraphs: [
        `The same person. What happens to your data is set out in the privacy notice.`,
      ],
    },
    {
      heading: 'Liability for content',
      paragraphs: [
        `merit shows you your own entries and values from public food databases. It is not a medical device and gives no medical, dietary or training advice. No warranty is given for nutritional values taken from external sources.`,
      ],
    },
  ],
}

/** Whether a document still has nothing in it. */
export const isEmpty = (document: Document): boolean =>
  document.version === '' || document.de.length === 0 || document.en.length === 0
