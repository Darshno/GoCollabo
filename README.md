
GoCollabo

GoCollabo is a platform that helps brands and creative professionals work together on creative projects. It brings campaign briefs, creator discovery, collaboration, and project work into one place.

The goal is simple: help brands explain what they need, find the right creative people, and manage the work from the first idea to the final delivery.
What You Can Do

    Create campaign briefs — Add details such as the campaign goal, content type, visual direction, budget, deadline, and licensing needs.
    Draft briefs with AI — Use the AI Brief Assistant to turn a rough campaign idea into a structured draft. Review and edit AI suggestions before saving.
    Discover creators — Explore creative professionals and their portfolios to find people whose skills fit a project.
    Start collaborations — Connect with creators and move a suitable match into a project.
    Manage project work — Track tasks, progress, and deliverables in one workspace.
    Get creative support from AI — Use AI tools to help develop ideas and improve creative work.

Feature availability may depend on the current setup and deployment.
How It Works

    Create a brief. Describe the campaign and add the details a creator needs.
    Find a creator. Review profiles and portfolios to find a good fit.
    Start a collaboration. Send or respond to a collaboration request.
    Work on the project. Organize tasks, share work, and review updates.
    Review and deliver. Make final changes, approve the work, and complete the project.

Technology

GoCollabo uses:

    React and TypeScript for the user interface
    Vite for development and builds
    Express for server-side features
    Supabase for authentication and data storage
    Gemini for AI-assisted brief creation and creative support

Getting Started

Setup can vary based on the current code and deployment.
Requirements

    Node.js
    pnpm
    A Supabase project
    A Gemini API key for AI features

Install dependencies
pnpm install
Set environment variables

Create a .env file using .env.example as a guide, if the file is available. Add the values required by your setup.

These are examples. Check the code for the exact variable names it uses:
VITE_APP_URL=http://localhost:5173
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key

Keep secret keys on the server. Never put a Supabase service-role key or a private Gemini key in frontend code. Do not commit real secrets to Git.
Run the project
pnpm dev
Check the project
pnpm check
pnpm build

Run these commands from the project folder. If a command is not available, check the scripts in package.json.
Project Structure

The code is grouped around the main parts of the app:

    Client — Pages and components users interact with.
    Server — API routes and logic that connect the app to other services.
    Supabase — Database migrations and project configuration.

Folder names may differ in the current version of the code.
Security Notes

    Keep API keys and other secrets private.
    Use the public Supabase key only where it is meant to be used.
    Keep server-only keys, including the Gemini API key, on the server.
    Set the correct redirect URLs in Supabase for local development and production.
    Do not commit .env files that contain real credentials.

Project Status

GoCollabo is under active development. Some features may need more testing or setup before they are ready for production. Check the current app and environment settings before using it for real campaigns.
Contributing

If you are working on GoCollabo:

    Create a branch for your change.
    Keep changes focused and easy to review.
    Run the relevant checks before sharing your work.
    Update this README when setup steps or features change.

License

A license has not been added yet.

