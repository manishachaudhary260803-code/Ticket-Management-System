"""Seed 50 alternating agent/customer replies on the first ticket."""
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.ticket import Ticket, TicketReply, SenderType
from app.models.user import User, Role

CONVERSATION = [
    # 1 — agent opens
    ("agent", "Thank you for reaching out to us. We've received your ticket and are looking into the matter right away. Can you please confirm the exact error message you're seeing on your screen?"),
    # 2 — customer replies
    ("customer", "Sure! The error says 'Invalid credentials — please try again'. I've triple-checked my password and it's definitely correct. I reset it only an hour ago."),
    # 3 — agent
    ("agent", "Understood. It can sometimes take up to 15 minutes for a password reset to propagate across all systems. Could you try clearing your browser cache and cookies, then attempt to log in again?"),
    # 4 — customer
    ("customer", "I cleared the cache and tried in incognito mode too — same error. Also tried on my phone and got the same thing. Really need access as my assignment is due at midnight."),
    # 5 — agent
    ("agent", "I can see the urgency. I've checked your account and it appears the session token from before your password reset is still cached on our end. I've manually invalidated it. Please try logging in again now."),
    # 6 — customer
    ("customer", "Still no luck. Same 'Invalid credentials' message. Could this be related to the 2FA I set up last week?"),
    # 7 — agent
    ("agent", "Good catch — yes, 2FA can occasionally cause this if the OTP window is out of sync. I've temporarily suspended 2FA on your account so you can log in. You can re-enable it after. Please try now."),
    # 8 — customer
    ("customer", "I can log in now! 2FA screen doesn't appear anymore. But I want to make sure my account is still secure — how do I re-enable 2FA properly once I've submitted my assignment?"),
    # 9 — agent
    ("agent", "Glad to hear you're in! To re-enable 2FA: go to Profile → Security → Two-Factor Authentication and follow the setup wizard. Make sure your Jio number is correctly registered. It should take less than 2 minutes."),
    # 10 — customer
    ("customer", "Perfect, thank you. I've submitted my assignment successfully. Going to re-enable 2FA right now as suggested."),
    # 11 — agent
    ("agent", "Excellent! While you're in the security settings, I also recommend reviewing the 'Active Sessions' panel and revoking any sessions you don't recognise, just as a precaution."),
    # 12 — customer
    ("customer", "Done — I see two unknown sessions from yesterday. Revoked both. Could these be from when I was trying different browsers to log in?"),
    # 13 — agent
    ("agent", "Yes, most likely. Each failed login attempt from a new browser or device creates a partial session token on our end. Revoking those is exactly the right thing to do. Your account looks clean now."),
    # 14 — customer
    ("customer", "2FA is re-enabled and working. I just tested it — got the OTP on my Jio number within seconds. Thanks for the quick help!"),
    # 15 — agent
    ("agent", "Great to hear everything is working. As a follow-up precaution, I've also added a note to your account to flag any login attempts from new devices for the next 30 days. You'll receive an email alert for each."),
    # 16 — customer
    ("customer", "That's reassuring, thank you. One more question — is there a way to use an authenticator app instead of SMS OTP for 2FA? I've heard SMS can be less secure."),
    # 17 — agent
    ("agent", "Absolutely — we do support TOTP authenticator apps (Google Authenticator, Microsoft Authenticator, or Authy). Under Profile → Security → Two-Factor Authentication, switch the method from 'SMS' to 'Authenticator App' and scan the QR code."),
    # 18 — customer
    ("customer", "Switched to Google Authenticator just now. Much more convenient actually since I always have my phone with me. Works perfectly."),
    # 19 — agent
    ("agent", "Smart choice. Authenticator apps are indeed more secure and reliable than SMS since they don't depend on mobile network availability. I've noted the change in your account record."),
    # 20 — customer
    ("customer", "By the way, I noticed the portal is quite slow on mobile — pages take 8–10 seconds to load. Is that a known issue or something specific to my connection?"),
    # 21 — agent
    ("agent", "That's a separate known issue we're currently tracking. Our mobile web team deployed an update two weeks ago that introduced a performance regression. A patch is scheduled for this weekend. Apologies for the inconvenience."),
    # 22 — customer
    ("customer", "No worries, good to know it's being worked on. My assignment portal seems fine on desktop. Will the mobile fix be automatic or do I need to do anything?"),
    # 23 — agent
    ("agent", "Completely automatic — no action needed on your end. You may want to clear the app cache once on Sunday evening after we deploy the patch, just to ensure the updated assets load correctly."),
    # 24 — customer
    ("customer", "Got it, I'll do that. Also, I realised I never set up a backup email for account recovery. Can I add that from within the portal?"),
    # 25 — agent
    ("agent", "Yes — go to Profile → Personal Details → Recovery Email. Add a personal email address (not another university one) and verify it. That way if you're ever locked out, you can recover access without contacting support."),
    # 26 — customer
    ("customer", "Added my Gmail as backup recovery email and verified it. The verification link arrived within 30 seconds. Very smooth."),
    # 27 — agent
    ("agent", "Perfect. You've now significantly improved your account security in one session — 2FA via authenticator, revoked unknown sessions, and a backup recovery email. Well done."),
    # 28 — customer
    ("customer", "Ha, thank you! I didn't expect a support ticket to turn into a full security audit. Very helpful though. One last thing — how long are the support tickets kept open after the issue is resolved?"),
    # 29 — agent
    ("agent", "Tickets remain accessible in the system for 1 year after resolution. You can view the full conversation history any time via the student portal under Help → My Tickets. After 1 year they're archived but not deleted."),
    # 30 — customer
    ("customer", "Good to know. And if the issue recurs, should I open a new ticket or reply to this one?"),
    # 31 — agent
    ("agent", "If the same issue comes back, please reply to this ticket thread within the next 30 days — it keeps the context together and speeds up diagnosis. After 30 days, open a new ticket and reference this ticket's ID in the subject line."),
    # 32 — customer
    ("customer", "Makes sense. I'll note down the ticket ID just in case. Really appreciate how thorough and patient the support has been today."),
    # 33 — agent
    ("agent", "It's our pleasure! Quick summary of what we resolved today: (1) unlocked your account by invalidating the stale session token, (2) helped you switch 2FA to an authenticator app, (3) cleared unknown sessions, and (4) added a backup recovery email."),
    # 34 — customer
    ("customer", "That's a great summary. Could you also send this to my university email so I have a record? Or will it be in the ticket history automatically?"),
    # 35 — agent
    ("agent", "The full conversation is auto-saved in the ticket history under Help → My Tickets, so you'll always have access to it. We don't send email transcripts by default but I can manually trigger one — shall I?"),
    # 36 — customer
    ("customer", "Yes please, if it's not too much trouble. Just so I have an offline copy in case I need to refer back to the steps."),
    # 37 — agent
    ("agent", "Done — I've triggered an email transcript to your registered university email (aarav.sharma.2023@university.ac.in). It should arrive within 5 minutes. The transcript includes all messages and timestamps."),
    # 38 — customer
    ("customer", "Received! The email came through with the full transcript nicely formatted. Thank you so much. Is there a way to rate this support interaction?"),
    # 39 — agent
    ("agent", "Yes! Once this ticket is marked as resolved, you'll receive an automated survey link to your email asking you to rate the interaction (1–5 stars) and leave optional feedback. Usually arrives within an hour of resolution."),
    # 40 — customer
    ("customer", "Will definitely fill that out. You've been incredibly helpful — above and beyond really. I'll give full marks."),
    # 41 — agent
    ("agent", "That's very kind of you, thank you! Before I close the ticket, is there anything else related to your account or portal access that I can help with?"),
    # 42 — customer
    ("customer", "Actually, one quick one — I noticed the 'Timetable' section shows last semester's schedule. Shouldn't it update automatically for the new semester?"),
    # 43 — agent
    ("agent", "The new semester timetable is typically published 3 days before the semester start date. Since we're currently in the inter-semester break, the previous semester's schedule is shown as a placeholder. It'll update automatically on the 27th."),
    # 44 — customer
    ("customer", "Ah, perfect timing then — classes start the 28th and the timetable goes up the 27th. That's well planned. Okay, I think I'm all good now."),
    # 45 — agent
    ("agent", "Great! I'm going to mark this ticket as Resolved now. Don't hesitate to reach out if anything comes up. Have a productive semester!"),
    # 46 — customer
    ("customer", "Thank you! One tiny thing — the portal shows my name as 'Aarav  Sharma' with a double space. Could that be corrected?"),
    # 47 — agent
    ("agent", "Good spot! I can see the double space in the record — this was likely a data entry issue during enrollment. I've raised a correction request with the registrar's data team. It should be fixed within 2 working days."),
    # 48 — customer
    ("customer", "No rush on that one, it's minor. But glad it's being fixed — it shows up on my hall ticket too which looks a bit odd."),
    # 49 — agent
    ("agent", "Agreed, we'll get it corrected before your next exam cycle. I've flagged it as high priority given the hall ticket impact. You'll receive a confirmation email once it's updated in the system."),
    # 50 — customer
    ("customer", "Thank you for everything. Genuinely one of the best support experiences I've had. Closing now — take care!"),
]


def main():
    db = SessionLocal()
    try:
        # Find first ticket ordered by created_at
        ticket = db.query(Ticket).order_by(Ticket.created_at).first()
        if not ticket:
            print("No tickets found. Run seed_tickets.py first.")
            sys.exit(1)

        print(f"Adding replies to ticket: [{ticket.id[:8]}] {ticket.subject}")

        # Get an agent to use as author for agent replies
        agent = db.query(User).filter(User.role == Role.agent, User.deleted_at == None).first()
        if not agent:
            print("No agent user found. Run auth seed first.")
            sys.exit(1)

        print(f"Using agent: {agent.name} ({agent.email})")

        # Delete any existing replies on this ticket to start clean
        existing = db.query(TicketReply).filter(TicketReply.ticket_id == ticket.id).count()
        if existing:
            print(f"Removing {existing} existing replies...")
            db.query(TicketReply).filter(TicketReply.ticket_id == ticket.id).delete()
            db.commit()

        base_time = ticket.created_at + timedelta(minutes=10)

        for i, (sender, body) in enumerate(CONVERSATION):
            reply_time = base_time + timedelta(minutes=i * 7)
            reply = TicketReply(
                ticket_id=ticket.id,
                author_id=agent.id if sender == "agent" else None,
                sender_type=SenderType.agent if sender == "agent" else SenderType.customer,
                body=body,
                created_at=reply_time,
            )
            db.add(reply)

        db.commit()
        print(f"Seeded {len(CONVERSATION)} replies (alternating agent/customer).")

    finally:
        db.close()


if __name__ == "__main__":
    main()
