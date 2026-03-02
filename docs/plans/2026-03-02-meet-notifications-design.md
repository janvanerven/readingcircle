# Meet Phase Transition Email Notifications

## Summary

Send email notifications to all members when a meet transitions to voting or reading phase. Uses the existing email infrastructure (nodemailer/SMTP). No frontend changes, no new DB tables.

## Trigger Points

Both triggers live in `POST /api/meets/:id/phase` in `server/src/routes/meets.ts`.

### 1. Voting Opened (draft -> voting)

- **Recipients**: All non-temporary users (including the host)
- **Subject**: "Voting is open: [meet label]"
- **Body**: Link to meet page, list of candidate book titles, reminder to vote

### 2. Book Selected / Reading Phase (-> reading)

- **Recipients**: All non-temporary users (including the host)
- **Subject**: "[Book Title] has been selected!"
- **Body**: Winning book title and author, meeting date, link to meet page

## Implementation

### email.ts

Add two new exported functions following the existing template style:

- `sendVotingOpenedEmail(email, meetLabel, meetId, candidates: {title, author}[])`
- `sendBookSelectedEmail(email, bookTitle, bookAuthor, meetDate, meetId)`

Both use the same HTML styling as existing emails (burgundy header, cream background).

### meets.ts (phase handler)

After the successful `db.update` for the phase transition:

1. Query all non-temporary users with their email addresses
2. If transitioning to `voting`: gather candidate books, call `sendVotingOpenedEmail` for each user
3. If transitioning to `reading`: get the selected book and date, call `sendBookSelectedEmail` for each user
4. Fire-and-forget: don't await, catch and log errors

## Files Changed

- `server/src/services/email.ts` — add two email functions
- `server/src/routes/meets.ts` — add notification logic after phase transition
