import { ChatbotWidget } from '@mth/widget-react';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const domain = import.meta.env.VITE_CHATBOT_DOMAIN ?? 'shop.example.com';

export default function App() {
  return (
    <main className="page">
      <h1>React Host Demo</h1>
      <p>
        This demo proves package consumption of <code>@mth/widget-react</code>{' '}
        from an external-style React host app.
      </p>
      <ul>
        <li>apiBaseUrl: {apiBaseUrl}</li>
        <li>domain: {domain}</li>
        <li>origin expected by backend allowlist: http://localhost:5173</li>
      </ul>

      <ChatbotWidget
        domain={domain}
        apiBaseUrl={apiBaseUrl}
        title="React Host Widget"
        theme="light"
        position="bottom-right"
        welcomeMessage="Hello from the React host demo!"
        primaryColor="#ea580c"
        openByDefault
      />
    </main>
  );
}
