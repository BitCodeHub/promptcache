# PromptCache

Simple prompt management app for creative professionals with a modern dark theme.

## Features
- Add prompts with tool and tags
- Search prompts by keyword and tag

## Usage
1. Run `npm start` to start the server.
2. Open `http://localhost:3000` in your browser to use the web app.

The frontend is built with React and styled with a modern dark theme.

Prompts are stored in `prompts.json`.

## Mobile App

The `mobile` folder contains a small React Native client built with Expo.

### Running

1. Install dependencies inside `mobile` with `npm install`.
2. Run `npm start` from the project root to launch the server.
3. In another terminal, run `npm run start` inside `mobile` to launch the Expo app.
4. Use an emulator or the Expo Go app to open the project.

Android emulators typically access the host server at `10.0.2.2:3000` while iOS simulators use `localhost:3000`.
