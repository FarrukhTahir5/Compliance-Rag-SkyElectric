# Chat History Feature

This document briefly explains the chat history feature that was added to the application.

## Features

*   **Chat History:** The application now saves your chat history to your browser's local storage. This means that your chats will be saved even if you close the browser window.
*   **View Previous Chats:** You can view your previous chats in the sidebar. Each chat is listed with the first message of the conversation. Clicking on a chat will load it into the chat dialog.
*   **New Chat:** You can start a new chat at any time by clicking the "New Chat" button in the chat dialog. This will save your current chat to the history and start a new, empty chat.

## How it works

The chat history feature was implemented by making the following changes to the application:

*   The `messages` state, which was previously managed by the `ChatDialog` component, has been lifted up to the `App` component.
*   The `App` component now manages the chat history, which is an array of chat sessions.
*   The chat history is saved to the browser's `localStorage` whenever a new chat is started.
*   The `ChatHistory` component was created to display the chat history in the sidebar.
*   The `Sidebar` component was modified to display the `ChatHistory` component.
*   The `ChatDialog` component was modified to allow starting a new chat.
