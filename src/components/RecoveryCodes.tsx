import { useState } from 'react';
import { AlertTriangle, Copy, Printer, CheckCircle } from 'lucide-react';

interface RecoveryCodesProps {
  codes: string[];
  onComplete: () => void;
}

export function RecoveryCodes({ codes, onComplete }: RecoveryCodesProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = codes.map((code, i) => `${i + 1}. ${code}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Recovery Codes</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
              }
              h1 {
                color: #1e293b;
                margin-bottom: 20px;
              }
              .warning {
                background: #fef3c7;
                border: 2px solid #fbbf24;
                padding: 15px;
                margin: 20px 0;
                border-radius: 8px;
              }
              .codes {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .code {
                font-family: 'Courier New', monospace;
                font-size: 16px;
                padding: 10px;
                margin: 5px 0;
                background: white;
                border: 1px solid #cbd5e1;
                border-radius: 4px;
              }
              .instructions {
                margin-top: 30px;
                color: #64748b;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <h1>Password Vault - Recovery Codes</h1>
            <div class="warning">
              <strong>⚠️ CRITICAL: Save these codes securely!</strong>
              <p>These recovery codes are the ONLY way to recover your vault if you lose access to all your devices. Store them in a safe place offline.</p>
            </div>
            <div class="codes">
              ${codes.map((code, i) => `<div class="code">${i + 1}. ${code}</div>`).join('')}
            </div>
            <div class="instructions">
              <p><strong>Instructions:</strong></p>
              <ul>
                <li>Each code can only be used once</li>
                <li>Keep these codes in a secure, offline location</li>
                <li>Do not share these codes with anyone</li>
                <li>You can use a recovery code to authorize a new device if you lose access to all authorized devices</li>
              </ul>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Save Your Recovery Codes</h1>
            <p className="text-slate-400">
              These codes are your backup access to your vault. Store them safely offline.
            </p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 mb-6">
            <div className="flex gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-amber-300 font-semibold mb-1">CRITICAL: Read This Carefully</h3>
                <ul className="text-amber-200/90 text-sm space-y-1">
                  <li>• These codes will only be shown ONCE</li>
                  <li>• Each code can only be used ONE time</li>
                  <li>• If you lose all devices, these are your ONLY way to recover</li>
                  <li>• Store them securely offline (printed paper in a safe place)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {codes.map((code, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 font-mono text-sm"
                >
                  <span className="text-slate-500 mr-2">{index + 1}.</span>
                  <span className="text-slate-200">{code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy All
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          <label className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 mb-6 cursor-pointer hover:bg-slate-900/70 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-2 focus:ring-green-500/50"
            />
            <span className="text-slate-300 text-sm">
              I have saved these recovery codes in a secure location. I understand that I will not be able to see them again and they are my only way to recover my vault if I lose all my devices.
            </span>
          </label>

          <button
            onClick={onComplete}
            disabled={!confirmed}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-slate-700 disabled:to-slate-600 text-white rounded-lg font-semibold transition-all disabled:cursor-not-allowed disabled:text-slate-400 shadow-lg disabled:shadow-none"
          >
            Continue to Vault
          </button>
        </div>
      </div>
    </div>
  );
}
