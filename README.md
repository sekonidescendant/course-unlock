# Course Unlock

Build "Course Correct" — a mobile-first academic prep platform for Federal University Oye-Ekiti (FUOYE) Mass Communication students.

DESIGN LANGUAGE (match exactly — approved design)
- Primary green: #16A34A. Dark navy: #0F172A (hero/footer). Background #FAFAFA, white cards, #E5E7EB borders, rounded-2xl.
- Font: Inter. Clean, card-based, generous whitespace. Study tool, not a marketing site.

CORE CONCEPT
Course Correct solves FUOYE students starting a course with zero preparation. Students browse free, read-only, 10-week course outlines (written in plain English, platform-authored) before a semester starts. Assignments work differently: students upload the actual assignment their lecturer gave them for a course, and the platform automatically sorts each upload under its correct course. Other students can see that an assignment exists and read its basic details for free, but must pay a flat ₦1000 to unlock downloading the full assignment file(s) for that course. This makes assignment content crowdsourced and self-sustaining rather than written by the platform owner.

STRUCTURE
- Home: what Course Correct is + Level selector (100L–400L)
- Level page: Semester selector (First/Second)
- Semester page: list of courses (code + title)
- Course page:
  - 10-week outline, plain English, always free, never downloadable
  - Assignments section: list of assignments students have uploaded for this course (title/date visible free) — download locked until the student pays ₦1000 for that course, which unlocks ALL uploaded assignments for that course, not just one
  - "Upload an assignment" button — any logged-in student can upload an assignment file for a course; they pick the course from a dropdown and the file is automatically filed under that course's assignment section (no manual admin approval needed for v1)

DATA MODEL (courses and assignments as data, not hardcoded pages)
- Course: code, title, level, semester, credit_units, outline (10 week entries: title + description)
- Assignment: course_id, title, uploaded_by (student), file, upload_date
- Track which users have paid to unlock a given course's assignments (persists — pay once per course, permanent access to that course's uploads)

SEED CONTENT — real FUOYE 100L Mass Comm courses, First Semester:
CMS 101 Introduction to Human Communication (2u), MCM101 Foundations of Broadcasting and Film (3u), MCM103 Introduction to Advertising (2u), MCM105 Introduction to Book Publishing (2u), MCM107 African Communication System (2u), FUOYEMCM109 English for Media Studies (3u)
Second Semester:
CMS 102 Writing for the Media (2u), MCM102 Principles of Public Relations (2u), MCM104 Introduction to News Writing (2u), MCM106 Introduction to Photojournalism (2u), FUOYE-MCM108 Media Literacy (2u), FUOYE-MCM110 Introduction to Communication Technology (2u)
Create these 12 course records now (code/title/level/semester/credit_units). I will send full 10-week outline text for each in a follow-up message.

PAYMENT — CRITICAL
Integrate Paystack using their OFFICIAL inline JS SDK (PaystackPop) or hosted checkout popup ONLY. Never build a custom form collecting raw card number/CVV/expiry — that's a PCI-DSS violation. Paystack's widget handles all card entry; the app only initializes the transaction and verifies the reference server-side.

ACCOUNTS
Students need a simple account (to upload assignments and track what they've unlocked). Keep signup minimal — email/name, no unnecessary fields.

SCOPE FOR NOW (skip — v2, not needed yet)
No admin panel, no manual upload moderation/approval queue, no analytics dashboard, no referral system, no past-questions bank. Core loop only: browse outlines → view/upload assignments → pay ₦1000 to unlock a course's downloads.

Mobile-first — most users are on Android phones (Tecno/Infinix), not desktop.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/13064620-2870-426c-886c-d1bd3067bada).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
