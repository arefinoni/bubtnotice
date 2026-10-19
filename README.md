# bubt-telegram-notifier

This is a university hobby project. 
Sole purpose of this repo just to automate the process to getting notices and publish for the students.

Telegram link: https://t.me/bubtnotice

- Created by Arefin (Cs Intake 57)

---

## 🌐 Interactive Architecture & Workflow Showcase

An interactive, responsive web application is included directly in this repository (`index.html`) demonstrating how the automated scraping, rendering, and broadcasting pipeline functions without exposing any sensitive credentials or private tokens:

- **📊 Scraped Metrics Counter**: Tracks all 105 official university notices scraped, rendered, and posted.
- **🔄 8-Stage Interactive Pipeline Flowchart**: Step-by-step interactive visual pipeline with Play/Pause, speed controls, and technical stage inspectors with sanitized code snippets.
- **⚡ Live Sandbox Simulator**: Interactive testing console with real-time terminal logs and Telegram channel preview mockup.
- **📑 Notice Explorer**: Search and filter through all 105 notices categorized by Examinations, Academic, Fees, Tenders, Holidays, and Campus events.
- **🛡️ Zero-Secret Architecture**: Explains how GitHub Secrets and memory-only injection protect Telegram tokens and credentials.

### Viewing the Website Locally
Simply open `index.html` in any web browser, or serve it using Python:
```bash
python -m http.server 5500
# Open http://localhost:5500 in your browser
```
You can also enable **GitHub Pages** in your repository settings (Settings -> Pages -> Deploy from Branch: `main` / root) to host it publicly with one click!
