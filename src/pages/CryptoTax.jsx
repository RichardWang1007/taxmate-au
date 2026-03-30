import '../styles/pages.css'

const EXCHANGES = [
  { name: 'CoinSpot', status: 'Not connected' },
  { name: 'Binance', status: 'Not connected' },
  { name: 'CoinJar', status: 'Not connected' },
  { name: 'Kraken', status: 'Not connected' },
]

const FEATURES = [
  { title: 'FIFO Cost Base', desc: 'Trades matched using first-in, first-out to calculate accurate cost base per asset.' },
  { title: 'CGT Event Detection', desc: 'Automatic identification of disposal events including sales, swaps, and transfers.' },
  { title: '50% CGT Discount', desc: 'Assets held longer than 12 months are automatically flagged for the ATO discount.' },
  { title: 'Export Summary', desc: 'Generate a CGT schedule ready for your accountant or tax return.' },
]

export default function CryptoTax() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Crypto Tax</h1>
        <p>Upload your exchange transaction history to calculate CGT events and cost base under ATO rules.</p>
      </div>

      <div className="section-heading">
        <h2>Exchange Connections</h2>
        <span className="section-sub">Upload CSV exports from your exchanges</span>
      </div>

      <div className="exchange-grid">
        {EXCHANGES.map((ex) => (
          <div className="exchange-card" key={ex.name}>
            <div className="exchange-name">{ex.name}</div>
            <div className="exchange-status">{ex.status}</div>
            <button className="upload-btn" disabled>Upload CSV</button>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="section-heading">
        <h2>What this module calculates</h2>
      </div>

      <div className="placeholder-grid">
        {FEATURES.map((f) => (
          <div className="placeholder-card" key={f.title}>
            <div className="placeholder-card-title">{f.title}</div>
            <p className="placeholder-card-desc">{f.desc}</p>
            <span className="coming-soon-badge">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  )
}
