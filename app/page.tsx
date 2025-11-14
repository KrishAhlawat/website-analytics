export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Website Analytics Platform</h1>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          
          <div className="space-y-4">
            <div className="border border-gray-300 p-4 rounded-lg">
              <h3 className="text-xl font-semibold text-green-600">POST /api/event</h3>
              <p className="text-gray-600 mt-2">Event ingestion endpoint (target &lt;50ms)</p>
              <pre className="bg-gray-100 p-3 rounded mt-2 text-xs overflow-x-auto">
{`{
  "site_id": "my-website",
  "event_type": "pageview",
  "path": "/home",
  "user_id": "user-123"
}`}
              </pre>
            </div>

            <div className="border border-gray-300 p-4 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-600">GET /api/stats</h3>
              <p className="text-gray-600 mt-2">Analytics reporting endpoint</p>
              <pre className="bg-gray-100 p-3 rounded mt-2 text-xs overflow-x-auto">
{`GET /api/stats?site_id=my-website&date=2024-01-15`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Install dependencies: <code className="bg-gray-100 px-2 py-1 rounded">npm install</code></li>
            <li>Copy <code className="bg-gray-100 px-2 py-1 rounded">.env.example</code> to <code className="bg-gray-100 px-2 py-1 rounded">.env</code></li>
            <li>Start MongoDB and Redis</li>
            <li>Run API: <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code></li>
            <li>Run Worker: <code className="bg-gray-100 px-2 py-1 rounded">npm run worker</code></li>
          </ol>
        </div>

        <div className="text-sm text-gray-500">
          <p>📚 See README.md for complete documentation</p>
        </div>
      </div>
    </main>
  );
}
