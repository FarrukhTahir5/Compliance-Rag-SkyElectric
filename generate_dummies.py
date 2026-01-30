from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def create_pdf(filename, title, content):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 50, title)
    
    # Content
    c.setFont("Helvetica", 12)
    y = height - 100
    for line in content:
        if line.startswith("#"): # Header
            c.setFont("Helvetica-Bold", 12)
            y -= 20
        else:
            c.setFont("Helvetica", 12)
        
        c.drawString(100, y, line)
        y -= 15
        if y < 50:
            c.showPage()
            y = height - 50
            
    c.save()

# Regulation Content
regulation_content = [
    "SECURITY STANDARDS v2026",
    "",
    "1.1 DATA ENCRYPTION",
    "All sensitive data at rest shall be encrypted using industry-standard algorithms",
    "(e.g., AES-256).",
    "",
    "1.2 ACCESS LOGS",
    "Access logs for all production systems must be produced and regularly reviewed",
    "at least quarterly by authorized personnel.",
    "",
    "2.1 PASSWORD POLICY",
    "Organizational passwords shall be at least 12 characters long and include",
    "multiple character types (uppercase, numbers, symbols).",
]

# Customer Policy Content
customer_content = [
    "CloudCorp Internal Security Policy",
    "",
    "Article 1: Data Protection",
    "We encrypt all our database backups at rest using AES-256 encryption.",
    "",
    "Article 2: Monitoring",
    "System logs are collected and stored for 30 days. We review logs only",
    "during security incidents or when requested by management.",
    "",
    "Article 3: Identity Management",
    "Users must choose passwords that are at least 8 characters long to ensures",
    "basic account security.",
]

if __name__ == "__main__":
    os.makedirs("dummy_data", exist_ok=True)
    create_pdf("dummy_data/dummy_regulation.pdf", "Official Compliance Regulation", regulation_content)
    create_pdf("dummy_data/dummy_customer_policy.pdf", "Customer Internal Policy", customer_content)
    print("Dummy PDFs created in dummy_data/")
