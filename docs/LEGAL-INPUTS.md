# Inputs for the legal texts

The privacy notice and the imprint now live in
`src/features/legal/documents.ts`, written from an audit of the code rather
than from a generator. The e-recht24 output was produced as a cross-check and
contributed two sections (email enquiries, encryption); the rest of it was
generic where this app needs to be specific, and wrong in three places.

**The one thing still outstanding is a legal review.** Have the text read once
before anybody outside the household is invited.

This file exists because a generator's output is only as good as the answers fed
into it, and those answers are facts about the software. They were established by
reading the code and the shipped bundle, not from memory. Every claim below is
reproducible; the method is at the bottom.

Until `documents.ts` has text in it, both legal pages say so on their face and
the app refuses to ask anybody for consent.

---

## 1. Who is responsible — and the address question

The generator will ask for the controller. Before answering, decide whether an
imprint is required at all, because **that is the only thing here demanding a
postal address** and publishing a home address is a real cost.

### Does merit need an imprint?

§ 5 DDG applies to *geschäftsmäßige* digital services. Purely private ones are
exempt. `Geschäftsmäßig` is read broadly — sustained activity, with or without
profit — and courts have treated a single advertising banner as enough to lose
the exemption. So the question is not "do I earn anything" but "is this offered
to the public".

What points at **private**, and is true of merit:

- invite-only; no open sign-up, no public registration form
- nothing sold, no advertising, no affiliate links, no payments
- roughly ten to thirty users, all known personally
- `noindex, nofollow` and a `Disallow: /` robots.txt, so it is not in search
  results and not discoverable

What points the other way is the **portfolio framing**: presenting the deployed
app publicly as a demonstration of professional capability is a professional
purpose. That framing lives in the GitHub repository, which is a different
service from the app. Keeping it there — not linking the live app from a CV, a
portfolio site or a public profile — keeps the deployed service private.

**If it stays genuinely private, no imprint is required and no postal address
has to be published.** That is the position to take deliberately rather than by
accident, and it is worth one paid hour with a lawyer to confirm.

### If an imprint is needed anyway

A *ladungsfähige Anschrift* is required: street, number, postcode, town.
Established points:

- A **Postfach is not sufficient** — the BGH has decided this.
- A **c/o address is valid** if you are genuinely reachable there.
- An **Impressumsservice** provides exactly this — a summonable address that is
  not your home, with mail forwarded — from a few euros a month. This is the
  normal answer to this problem in Germany and there is nothing irregular about
  it.

So the options, in the order worth considering them:

1. Establish and keep the private character; publish no imprint.
2. An Impressumsservice address (a few € / month).
3. A c/o address of somebody who agrees, where post genuinely reaches you.
4. Your own address — only if you are comfortable with it, and you have said
   you are not.

### The privacy notice is separate and less demanding

Art. 13(1)(a) GDPR requires the **identity and contact details of the
controller** for anyone whose data is processed. That is a name and a contact
that reliably works — an email address answered promptly is workable. It does
not carry § 5 DDG's summonable-address requirement.

So even with no imprint, the notice still names you and gives an email. Tell the
generator this explicitly; several of them assume an imprint exists and will
otherwise fill the notice with a postal address you do not want to give.

| Field | Value |
|---|---|
| Controller name | *fill in* |
| Contact email | *fill in* |
| Postal address | **decide first** — see above |
| Data protection officer | none — the thresholds in § 38 BDSG are not met |
| VAT ID / register entry | none — no commercial activity |

---

## 2. What the app is

Say this plainly to the generator; several of its questions depend on it.

- A private, non-commercial fitness and nutrition tracker for an invited group of
  roughly ten to thirty friends and family.
- **No** sale of anything, no advertising, no affiliate links, no payments.
- **No** open sign-up. Accounts exist by invitation.
- **Not** a medical device, and it gives no dietary or training advice.
- **No** artificial intelligence in the product, no profiling, and no automated
  decision-making within the meaning of Art. 22 GDPR.
- Users are adults. There is no offer directed at children (Art. 8).

---

## 3. What is processed

### Account data

Email address and a password hash, held by Supabase Auth.
**Legal basis: Art. 6(1)(b)** — without it there is no sign-in.

### Health data — special category, Art. 9(1)

This is the answer that matters most, and generators frequently do not ask for
it unprompted. Say explicitly that the service processes **Gesundheitsdaten**:

- body weight, and optionally body fat percentage
- what the user eats, per day and per meal, with calories and macronutrients
- how the user trains: exercises, sets, repetitions, weights, optional RIR
- optionally height, date of birth, sex, activity level and goal, entered only
  if the user asks the app to calculate a calorie target

**Legal basis: Art. 9(2)(a), explicit consent.** No other Art. 9(2) exception
fits a private app with no medical or employment context. The consent is taken
on a screen of its own before the app can be used; `profiles.consent_at` and
`profiles.consent_version` record when and to which version, so it can be
demonstrated under Art. 7(1).

Withdrawal (Art. 7(3)) is account deletion, because consent is the only basis on
which any of it is kept. The button is on the account screen and acts
immediately.

### Preferences

Language and colour scheme.

### Server logs

Vercel and Supabase keep technical request logs including IP addresses. merit
does not read or analyse them.

---

## 4. Processors and recipients

Both need an Art. 28 agreement (AVV/DPA) in place before anybody is invited.
**Neither has to be signed.** Both DPAs are incorporated into the terms of
service and bind on acceptance — Supabase: "acceptance of the Agreement shall
have the same effect as signing the SCCs"; Vercel: "shall become legally binding
upon Customer entering into the Agreement". What is required is a *copy*, for
Art. 5(2): archive both DPAs and both sub-processor lists as PDFs with the date
of retrieval, kept outside this repository.

Full addresses, for the generator's hosting question:

- Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA
- Supabase Pte. Ltd, 65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513

Supabase's own sub-processor list includes OpenAI. That covers Supabase's
in-dashboard AI features, which merit does not use — but it belongs in the
Art. 30 record, and it is a reason to leave those features switched off.

| Recipient | Role | Where | Note |
|---|---|---|---|
| Supabase Pte. Ltd | database, authentication | EU region, Frankfurt | Singapore; SCCs for third-country access |
| Vercel Inc. | serving the application | edge | sees IP addresses; US company; SCCs |
| Open Food Facts | barcode lookup | France (non-profit) | see below |

**Open Food Facts is the only third party the browser itself contacts**, and
only when the user starts a barcode scan. It receives the scanned barcode and,
unavoidably, the user's IP address. It receives nothing else — not who the user
is, not what else they eat. Resolved products are cached in merit's own database
so the same barcode is never sent twice.

USDA FoodData Central is called from a server-side Edge Function, so no user IP
reaches it.

*Optional improvement, not yet done:* proxying Open Food Facts through an Edge
Function the same way would remove the last client-side third-party request
entirely. Worth considering — it would make "the browser talks to nobody but us"
literally true.

---

## 5. Storage on the device — the cookie question

**The honest answer is that merit needs no cookie banner**, and the reason is
worth giving the generator precisely, because most of them assume otherwise.

- **No cookies at all** are set, first- or third-party.
- `sessionStorage` is never used.
- `localStorage` holds exactly two things:
  1. the **Supabase session token**, which keeps the user signed in. This is
     strictly necessary for the service the user explicitly requested and falls
     under **§ 25(2)(2) TDDDG**.
  2. **`merit.theme`**, written only once the user chooses a colour scheme, or
     when a scheme they chose on another device is mirrored down. A profile set
     to `system` is not a choice and is never written.
- Nothing at all is written before the user acts.

Both claims are enforced as tests in `e2e/probe.spec.ts`:
`nothing is stored on the device before the user acts` and
`the app makes no third-party requests it was not asked to make`.

**No external resources are loaded.** Fonts are IBM Plex, bundled from npm and
served from merit's own origin — there is no Google Fonts request. No analytics,
no tag manager, no tracking pixel, no embedded maps, videos or social buttons,
no CDN.

If the generator insists on producing a cookie section, it should say that no
consent-requiring storage takes place.

---

## 6. Retention

For as long as the account exists. There is no automatic deletion period,
because a multi-year record is the purpose of the app.

On deletion, everything scoped to the account goes by database cascade: profile,
weigh-ins, food log, targets, routines, schedule, workouts, sets.

**One exception that must be stated, because a promise to delete everything has
to be true:** foods and exercises the user added to the *shared catalogue*
survive deletion, with the reference to their account removed
(`created_by … on delete set null`). They are then data about a product, not
about a person.

---

## 7. Data subject rights to describe

All of these are implemented in the app rather than by request:

- **Art. 15 access** and **Art. 20 portability** — a complete JSON export from
  the account screen, immediately, without asking anybody.
- **Art. 17 erasure** — account deletion from the account screen, immediate.
- **Art. 16 rectification** — every entry is editable in the app.
- **Art. 18 restriction** and **Art. 21 objection** — by email.
- **Art. 77 complaint** — to a supervisory authority; the generator will insert
  the right one for the controller's Bundesland.

---

## 8. Still to check, and not by me

- [x] Imprint question decided: merit stays private, so no § 5 DDG imprint and
      no postal address. The page carries a voluntary statement of who runs it.
      **This holds only while merit stays invite-only, unlinked and noindex** —
      a public demo account or a portfolio link ends it.
- [x] Supabase DPA (v1, 1 Aug 2026) and sub-processor list (1 Jun 2026)
      archived. *Still to do: the same two documents from Vercel.*
- [x] **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30) written:
      `docs/ART-30.md`. Not published; produced on request.
- [ ] Have the wording of the consent screen reviewed — it is a product screen,
      but what it asks for is legally operative. Its text is in
      `src/locales/{de,en}.json` under `pages.consent`.
- [ ] Decide whether to proxy Open Food Facts server-side (§4 above).
- [ ] Consider a TOM description (Art. 32) — for this app, essentially: RLS on
      every user table, no service-role key in any client, EU region, TLS
      everywhere, no secrets in the repository.

---

## How the claims above were checked

```bash
npm run build
grep -rhoE 'https?://[^"'\''),]+' dist/ | sort -u
```

Two hosts come back that the app actually calls: the project's own Supabase URL,
and `world.openfoodfacts.org`. Everything else in that list is an XML namespace
or a documentation link inside a library's error message.

```bash
grep -rnE "localStorage|sessionStorage|document\.cookie|indexedDB" src/ index.html
grep -niE "analytics|speed-insights|sentry|posthog|gtag" package.json
```

The first shows the two keys named in §5. The second returns nothing.
