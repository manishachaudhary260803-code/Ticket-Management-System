"""Seed a handful of knowledgebase articles."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.knowledgebase import KnowledgebaseArticle

ARTICLES = [
    (
        "Library Working Hours",
        "The central library is open Monday to Saturday, 8:00 AM to 10:00 PM. "
        "During exam week, hours are extended to 6:00 AM to midnight, seven days a week, "
        "including Sundays. No prior booking is required to enter during extended hours.",
    ),
    (
        "How to Reset Your Password",
        "To reset your student portal password: go to the login page and click 'Forgot Password'. "
        "Enter your registered university email and you'll receive a reset link within 5 minutes. "
        "The link is valid for 30 minutes. If you don't receive it, check your spam folder or "
        "contact the IT helpdesk at ithelp@university.edu.",
    ),
    (
        "Fee Refund Policy",
        "Refunds for course fees are processed within 10-15 business days of an approved withdrawal "
        "request. Refunds are issued to the original payment method. Partial refunds apply if you "
        "withdraw after the add/drop deadline. Contact the accounts office with your transaction ID "
        "to check refund status.",
    ),
    (
        "Campus Wi-Fi Troubleshooting",
        "If you're having trouble connecting to campus Wi-Fi: forget the network on your device and "
        "reconnect using your student ID as the username. Ensure your device's date/time is correct, "
        "as this can cause certificate errors. If the connection drops intermittently, try switching "
        "from the 5GHz to the 2.4GHz network, which has better coverage in older buildings.",
    ),
    (
        "Hostel Fee Payment Schedule",
        "Hostel fees are due in two installments: the first at the start of the semester and the "
        "second by the midpoint of the semester. A late fee of 2% per week applies after the due date. "
        "Payment can be made online via the fee portal or in person at the accounts office.",
    ),
]


def main():
    db = SessionLocal()
    try:
        existing = db.query(KnowledgebaseArticle).count()
        if existing:
            print(f"Removing {existing} existing knowledgebase articles...")
            db.query(KnowledgebaseArticle).delete()
            db.commit()

        for title, content in ARTICLES:
            db.add(KnowledgebaseArticle(title=title, content=content))

        db.commit()
        print(f"Seeded {len(ARTICLES)} knowledgebase articles.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
