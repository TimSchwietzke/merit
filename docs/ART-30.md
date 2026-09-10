# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)

Stand: 10.09.2026

Die Ausnahme für kleine Organisationen (Art. 30 Abs. 5 DSGVO) greift hier
nicht, weil Gesundheitsdaten nach Art. 9 verarbeitet werden. Dieses Verzeichnis
muss also existieren. Es wird nicht veröffentlicht, sondern auf Verlangen einer
Aufsichtsbehörde vorgelegt.

Die Angaben stammen aus dem Quellcode der Anwendung; die Prüfmethode steht in
`LEGAL-INPUTS.md`.

---

## 1. Verantwortlicher

Tim Schwietzke, trymerit.app@gmail.com

Kein Datenschutzbeauftragter — die Schwellen des § 38 BDSG sind nicht erreicht
(eine Person verarbeitet Daten; keine umfangreiche Verarbeitung im Sinne des
Art. 35).

---

## 2. Verarbeitungstätigkeit

**Bezeichnung:** Betrieb der privaten Web-Anwendung merit zur Aufzeichnung von
Gewicht, Ernährung und Training.

**Zweck:** Den Nutzerinnen und Nutzern die eigenen Aufzeichnungen zugänglich
machen und über die Zeit darstellen. Kein Profiling, keine automatisierte
Entscheidungsfindung (Art. 22), keine Werbung, keine Weitergabe zu Zwecken
Dritter.

---

## 3. Kategorien betroffener Personen

Eingeladene Nutzerinnen und Nutzer, etwa zehn bis dreißig erwachsene Personen
aus dem persönlichen Umfeld. Keine öffentliche Registrierung.

---

## 4. Kategorien personenbezogener Daten

| Kategorie | Inhalt | Rechtsgrundlage |
|---|---|---|
| Kontodaten | E-Mail-Adresse, Passwort-Hash | Art. 6 Abs. 1 lit. b |
| **Gesundheitsdaten (Art. 9 Abs. 1)** | Körpergewicht, optional Körperfettanteil; Ernährungstagebuch mit Kalorien und Nährwerten; Trainingsdaten (Übungen, Sätze, Wiederholungen, Gewichte, optional RIR); optional Größe, Geburtsdatum, Geschlecht, Aktivitätsniveau, Ziel | **Art. 9 Abs. 2 lit. a — ausdrückliche Einwilligung** |
| Einstellungen | Sprache, Farbschema | Art. 6 Abs. 1 lit. b |
| Einwilligungsnachweis | Zeitpunkt und Fassung der Einwilligung (`profiles.consent_at`, `profiles.consent_version`) | Art. 7 Abs. 1 |
| Server-Protokolle | IP-Adresse, Zeitpunkt, angeforderte Adresse, Statuscode, Browser/Betriebssystem — bei den Hostern, nicht ausgewertet | Art. 6 Abs. 1 lit. f |
| E-Mail-Anfragen | Nachrichten an die Kontaktadresse | Art. 6 Abs. 1 lit. f, ggf. lit. b |

Die Einwilligung wird vor der ersten Nutzung auf einem eigenen Bildschirm
eingeholt (`src/features/legal/ConsentGate.tsx`), getrennt von jeder anderen
Erklärung, und ist über die gespeicherte Fassung nachweisbar.

---

## 5. Kategorien von Empfängern

| Empfänger | Rolle | Sitz | Grundlage |
|---|---|---|---|
| Supabase Pte. Ltd, 65 Chulia Street #38-02/03, OCBC Centre, Singapur 049513 | Auftragsverarbeiter — Datenbank, Anmeldung | Singapur; **Daten in der EU-Region Frankfurt am Main** | AVV nach Art. 28, in den ToS enthalten; SCCs |
| Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA | Auftragsverarbeiter — Auslieferung der Anwendung | USA | AVV nach Art. 28, in den ToS enthalten; SCCs |
| Open Food Facts, Frankreich | Dritter, kein Auftragsverarbeiter | EU | Art. 6 Abs. 1 lit. b — nur auf ausdrückliche Nutzeraktion (Barcode-Scan); übermittelt werden Barcode und IP-Adresse |
| USDA FoodData Central, USA | Dritter | USA | Abfrage über eigene Edge Function; **keine Nutzer-IP** erreicht den Dienst |

Weitergabe an sonstige Dritte: keine. Kein Verkauf, keine Werbenetzwerke, kein
Analysedienst. Andere Nutzer sehen fremde Einträge nicht (Row Level Security).

**Unterauftragsverarbeiter:** Listen von Supabase und Vercel, archiviert mit
Abrufdatum. Die Supabase-Liste führt unter anderem AWS (Betrieb der EU-Region)
und OpenAI (Dashboard-Funktionen, die merit nicht nutzt).

**Drittlandübermittlung:** Standardvertragsklauseln der EU-Kommission nach
Art. 46 Abs. 2 lit. c, Bestandteil beider Auftragsverarbeitungsverträge.

---

## 6. Löschfristen

Speicherung für die Dauer des Kontos; eine mehrjährige Aufzeichnung ist der
Zweck der Anwendung. Keine automatische Frist.

Bei Kontolöschung — jederzeit selbst auslösbar, sofort wirksam — entfällt per
Datenbank-Kaskade alles Kontogebundene: Profil, Gewichtseinträge,
Ernährungstagebuch, Ziele, Trainingspläne, Trainingseinheiten, Sätze.

**Ausnahme:** Lebensmittel und Übungen im gemeinsamen Katalog bleiben erhalten,
der Verweis auf das Konto wird entfernt (`created_by … on delete set null`).
Danach Produktdaten ohne Personenbezug.

Server-Protokolle: automatische Löschung nach den Fristen der Hoster.

---

## 7. Technische und organisatorische Maßnahmen (Art. 32)

- Row Level Security auf jeder nutzerbezogenen Tabelle; jede Zeile ist an die
  Konto-ID gebunden und für andere Konten nicht lesbar.
- Der Service-Role-Schlüssel erscheint in keinem Client-Code. Der Browser
  arbeitet ausschließlich mit dem anon-Schlüssel unter RLS.
- Passwörter werden ausschließlich als Hash gespeichert (Supabase Auth).
- Transportverschlüsselung durchgehend (TLS erzwungen, kein HTTP).
- Datenhaltung in der EU-Region Frankfurt am Main.
- Keine Secrets im Repository; der USDA-Schlüssel liegt als Secret der Edge
  Function und erreicht den Client nicht.
- Keine Cookies, kein Tracking, keine externen Ressourcen; automatisiert
  geprüft in `e2e/probe.spec.ts`.
- Betroffenenrechte technisch umgesetzt: vollständiger JSON-Export (Art. 15,
  20) und sofortige Kontolöschung (Art. 17) ohne Anfrage.

---

## 8. Verbleibendes Risiko

Diese Verarbeitung betrifft besondere Datenkategorien, aber in kleinem Umfang,
ohne Profiling und ohne öffentlichen Zugang. Eine Datenschutz-Folgenabschätzung
nach Art. 35 ist deshalb nicht erforderlich. Ändert sich das — öffentlicher
Zugang, deutlich mehr Nutzer, Auswertung über Einzelne hinaus — ist die Frage
neu zu stellen.
