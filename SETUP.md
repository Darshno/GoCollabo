# FrameFoundry setup

FrameFoundry uses the managed Webdev React/TypeScript/Express/tRPC/Drizzle starter. The project is configured with managed server and MySQL-compatible database capabilities. `pnpm db:migrate` applies the checked-in schema migrations when the managed database is available; `pnpm dev` starts the full app on port 3000.

Authentication uses the starter Manus OAuth integration. No third-party auth key is required. When a visitor is logged out or the app cannot reach its backend, the interface offers a clearly labeled Demo mode backed by localStorage. Demo records are sample data and are not real authenticated users or verified professionals.

Portfolio generation is intentionally honest: the current MVP provides a deterministic editable fallback based on the creator's answers. A future server procedure can call the managed LLM surface when a real configured capability is available; no provider key is exposed in browser code and the product never claims an AI call succeeded when it did not.

Useful commands are `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm db:migrate`. Payments, full messaging, identity verification, AI media editing, and project management are out of scope for this MVP. Media uploads are represented with previews and an upload-ready UI; durable object storage wiring can be attached to the existing server storage helper without changing the portfolio data model.
