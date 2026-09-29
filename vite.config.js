import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/padel_match_*.json', '**/saved_matches/**']
    }
  },
  plugins: [
    {
      name: 'local-file-autosave',
      configureServer(server) {
        server.middlewares.use('/api/save-match', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const safeDate = String(data.date || new Date().toISOString().split('T')[0]).replace(/[/\\?%*:|"<>]/g, '-').trim();
                const fileName = `padel_match_${safeDate}.json`;
                const rootFilePath = path.resolve(process.cwd(), fileName);

                // Write directly to project folder without prompting the user
                fs.writeFileSync(rootFilePath, JSON.stringify(data, null, 2), 'utf-8');

                // Also keep a copy in saved_matches/
                const savedDir = path.resolve(process.cwd(), 'saved_matches');
                if (!fs.existsSync(savedDir)) {
                  fs.mkdirSync(savedDir, { recursive: true });
                }
                fs.writeFileSync(path.resolve(savedDir, fileName), JSON.stringify(data, null, 2), 'utf-8');

                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: true, fileName, filePath: rootFilePath }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else {
            res.writeHead(405);
            res.end();
          }
        });
      }
    }
  ]
});
