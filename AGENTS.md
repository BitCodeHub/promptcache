# Repository Instructions

This repository contains a Node.js server with React (web) and React Native (mobile) clients.

## Running
- Install dependencies with `npm install` if needed.
- Start the server using `npm start` (runs `node server.js`).
- To run the mobile client, install dependencies inside `mobile` and use `npm run start` from that folder.

## Guidelines for Codex Agents
- Remove merge conflict markers such as `=======`, `7ubkob-codex`, etc., when encountered.
- After making code changes, run `node server.js` to verify the server starts without errors.
- There are currently no automated tests.
6dgucv-codex/review-repo-and-suggest-features
=======
- Use **two spaces** for indentation in JavaScript and JSON files.
- When editing `prompts.json`, keep each prompt in the form `{ id, text, tool, tags, usageCount, lastUsed }`.
- After adding dependencies in either the root or `mobile` folder, run `npm install` in that folder to update `package-lock.json`.
main
