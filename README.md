# APSS Emergency Challenge 2.0

## Official title
**Can You Reach First Responders Inside Your Building?**

## Included features
- Lockdown emergency scenario
- Professional simulated portable-radio interface
- Press-and-hold PTT interaction
- Generated radio tones through the browser
- Balanced success outcomes
- Default 30% successful connection rate
- Administrative percentage slider from 0% to 50% in 5% increments
- Exactly matched outcomes in randomized blocks of 20 participants
- One drawing entry for every participant
- One bonus drawing entry for a successful connection
- Trackable checkbox for interest in in-building first responder coverage testing
- Excel-compatible CSV export
- Offline PWA support
- Uploaded APSS icons
- No winner-selection functionality

## Before uploading to GitHub
1. Open `app.js`.
2. Change:
   `const ADMIN_PIN = "5100";`
3. Review the APSS/IFC statement in `index.html`.
4. Confirm the no-cost testing offer is approved for the event.
5. Save all files.

## Data warning
Participant records are stored in the browser profile on the event computer.
- Do not use Incognito or InPrivate mode.
- Do not clear browser/site data.
- Export the CSV regularly.
- Opening the app on a different computer creates a separate data set.

## Balanced mode
The outcome engine uses blocks of 20:
- 5% = 1 successful connection
- 10% = 2
- 20% = 4
- 30% = 6
- 50% = 10

The positions are shuffled within each block.

## Updating the app
When files change, increase the cache version in `service-worker.js`, such as:
`apss-emergency-challenge-v2-2`
