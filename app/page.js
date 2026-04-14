'use client';
import { useState, useCallback, useEffect } from 'react';

const SAVINGS_RATE = 0.07;

function formatCurrency(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function formatMonths(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toMonthYear(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function toInputDate(date) {
  return date.toISOString().split('T')[0];
}

function calcMortgage(balance, monthlyRate, payment) {
  let bal = balance;
  let totalInterest = 0;
  let months = 0;
  while (bal > 0.01 && months < 1200) {
    const interest = bal * monthlyRate;
    totalInterest += interest;
    bal = bal + interest - payment;
    if (bal < 0) bal = 0;
    months++;
  }
  return { months, totalInterest };
}

function calcSavingsGrowth(monthlyAmount, months) {
  const r = SAVINGS_RATE / 12;
  let total = 0;
  for (let i = 0; i < months; i++) {
    total = (total + monthlyAmount) * (1 + r);
  }
  return total;
}

export default function Home() {
  const [inputs, setInputs] = useState({
    balance: '',
    payment: '',
    rate: '',
    overpayment: '',
  });
  const [endDate, setEndDate] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => {
    setInputs(p => ({ ...p, [k]: v }));
    setResults(null);
  };

  // Auto-calculate end date whenever balance, payment or rate changes
  useEffect(() => {
    const balance = parseFloat(inputs.balance);
    const payment = parseFloat(inputs.payment);
    const rate = parseFloat(inputs.rate);
    if (!balance || !payment || !rate) {
      setEndDate(null);
      return;
    }
    const monthlyRate = rate / 100 / 12;
    const { months } = calcMortgage(balance, monthlyRate, payment);
    if (months >= 1200) {
      setEndDate(null);
      return;
    }
    const today = new Date();
    setEndDate(addMonths(today, months));
  }, [inputs.balance, inputs.payment, inputs.rate]);

  const calculate = useCallback(() => {
    setError('');
    const balance = parseFloat(inputs.balance);
    const payment = parseFloat(inputs.payment);
    const rate = parseFloat(inputs.rate);
    const overpayment = parseFloat(inputs.overpayment) || 0;

    if (!balance || !payment || !rate) {
      setError('Please fill in balance, payment and interest rate.');
      return;
    }
    if (!overpayment) {
      setError('Please enter a monthly overpayment amount.');
      return;
    }
    if (!endDate) {
      setError('Unable to calculate end date — check your inputs.');
      return;
    }

    const monthlyRate = rate / 100 / 12;
    const today = new Date();

    const origMonths =
      (endDate.getFullYear() - today.getFullYear()) * 12 +
      (endDate.getMonth() - today.getMonth());

    const orig = calcMortgage(balance, monthlyRate, payment);
    const over = calcMortgage(balance, monthlyRate, payment + overpayment);
    const overEndDate = addMonths(today, over.months);

    const monthsSaved = Math.max(0, origMonths - over.months);
    const interestSaved = Math.max(0, orig.totalInterest - over.totalInterest);

    // Scenario A: overpay mortgage, then save full payment+overpayment for months saved
    const scenarioA = calcSavingsGrowth(payment + overpayment, monthsSaved);

    // Scenario B: invest overpayment amount for the full original term from day one
    const scenarioB = calcSavingsGrowth(overpayment, origMonths);

    setResults({
      origMonths,
      origEndDate: endDate,
      overMonths: over.months,
      overEndDate,
      monthsSaved,
      interestSaved,
      scenarioA,
      scenarioB,
      payment,
      overpayment,
    });
  }, [inputs, endDate]);

  const winner = results
    ? results.scenarioA > results.scenarioB ? 'A' : 'B'
    : null;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Mortgage Overpayment Calculator
        </div>
        <h1 style={{ fontFamily: 'DM Serif Display', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.1, marginBottom: '0.75rem' }}>
          Should you overpay<br />your mortgage?
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, lineHeight: 1.7, fontSize: '0.95rem' }}>
          Enter your mortgage details to see how overpaying compares to investing that money instead.
        </p>
      </div>

      {/* Input card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div>
            <label style={labelStyle}>Outstanding balance (£)</label>
            <input type="number" placeholder="e.g. 180000" value={inputs.balance} onChange={e => set('balance', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Monthly payment (£)</label>
            <input type="number" placeholder="e.g. 950" value={inputs.payment} onChange={e => set('payment', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Interest rate (%)</label>
            <input type="number" placeholder="e.g. 4.5" step="0.01" value={inputs.rate} onChange={e => set('rate', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>
              Mortgage end date
              {endDate && (
                <span style={{ marginLeft: 8, color: 'var(--accent)', fontSize: '0.65rem', letterSpacing: '0.05em' }}>● auto-calculated</span>
              )}
            </label>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.65rem 0.9rem',
              fontFamily: 'DM Mono',
              fontSize: '0.95rem',
              color: endDate ? 'var(--text)' : 'var(--muted)',
              minHeight: '2.6rem',
              display: 'flex',
              alignItems: 'center',
            }}>
              {endDate
                ? endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Enter balance, payment & rate'}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Monthly overpayment (£)</label>
            <input
              type="number"
              placeholder="e.g. 200 — how much extra you are considering"
              value={inputs.overpayment}
              onChange={e => set('overpayment', e.target.value)}
            />
          </div>

        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>
        )}

        <button
          onClick={calculate}
          style={{
            marginTop: '1.5rem',
            background: 'var(--accent)',
            color: '#0a0f1e',
            border: 'none',
            borderRadius: 8,
            padding: '0.8rem 2rem',
            fontFamily: 'Outfit',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            width: '100%',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={e => e.target.style.opacity = 0.85}
          onMouseOut={e => e.target.style.opacity = 1}
        >
          Calculate
        </button>
      </div>

      {/* Results */}
      {results && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {/* Mortgage impact */}
          <h2 style={sectionHead}>Mortgage impact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard
              label="Current end date"
              value={toMonthYear(results.origEndDate)}
              sub={`${formatMonths(results.origMonths)} remaining`}
            />
            <StatCard
              label="With overpayment"
              value={toMonthYear(results.overEndDate)}
              sub={`${formatMonths(results.overMonths)} remaining`}
              accent
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard
              label="Time saved"
              value={formatMonths(results.monthsSaved)}
              sub="off your mortgage term"
              accent
            />
            <StatCard
              label="Interest saved"
              value={formatCurrency(results.interestSaved)}
              sub="in total interest payments"
              accent
            />
          </div>

          {/* Savings comparison */}
          <h2 style={sectionHead}>
            Savings comparison{' '}
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'DM Mono', fontWeight: 400 }}>
              @ 7% avg. annual return
            </span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

            <div style={{ ...cardStyle, border: winner === 'A' ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
              {winner === 'A' && <div style={winnerBadge}>Winner</div>}
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Option A — Overpay
              </div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: '1.8rem', color: winner === 'A' ? 'var(--accent)' : 'var(--text)', marginBottom: '0.4rem' }}>
                {formatCurrency(results.scenarioA)}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Overpay by {formatCurrency(results.overpayment)}/mo. Once mortgage ends {formatMonths(results.monthsSaved)} early, save the full {formatCurrency(results.payment + results.overpayment)}/mo into a stocks & shares ISA for the remaining {formatMonths(results.monthsSaved)}.
              </p>
            </div>

            <div style={{ ...cardStyle, border: winner === 'B' ? '1px solid var(--accent2)' : '1px solid var(--border)' }}>
              {winner === 'B' && <div style={{ ...winnerBadge, background: 'var(--accent2)' }}>Winner</div>}
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Option B — Invest now
              </div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: '1.8rem', color: winner === 'B' ? 'var(--accent2)' : 'var(--text)', marginBottom: '0.4rem' }}>
                {formatCurrency(results.scenarioB)}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Keep paying standard mortgage. Invest {formatCurrency(results.overpayment)}/mo straight into a stocks & shares ISA for the full {formatMonths(results.origMonths)}.
              </p>
            </div>

          </div>

          {/* Winner summary */}
          <div style={{
            background: 'var(--card)',
            border: `1px solid ${winner === 'A' ? 'var(--accent)' : 'var(--accent2)'}`,
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
          }}>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
              <span style={{ fontWeight: 600, color: winner === 'A' ? 'var(--accent)' : 'var(--accent2)' }}>
                Option {winner} comes out ahead
              </span>{' '}
              by {formatCurrency(Math.abs(results.scenarioA - results.scenarioB))} by {toMonthYear(results.origEndDate)}.
              {winner === 'B'
                ? ' Your mortgage rate is low enough that investing consistently from day one produces better long-term returns than overpaying.'
                : ' Clearing your mortgage early then channelling the full payment into savings wins out here.'}
            </p>
          </div>

          {/* Disclaimer */}
          <p style={{
            marginTop: '2.5rem',
            fontSize: '0.75rem',
            color: 'var(--muted)',
            lineHeight: 1.8,
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
          }}>
            <strong style={{ color: 'var(--text)' }}>Illustrative purposes only.</strong> This calculator is not financial advice. Figures are estimates based on the inputs provided and assume a constant {SAVINGS_RATE * 100}% average annual return on investments — actual returns will vary and are not guaranteed. It does not account for changes in interest rates, early repayment charges, tax treatment of savings, inflation, or individual circumstances. Please consult a qualified financial adviser before making any decisions about your mortgage or investments.
          </p>

        </div>
      )}
    </main>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontFamily: 'DM Mono',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
};

const sectionHead = {
  fontFamily: 'DM Serif Display',
  fontSize: '1.3rem',
  marginBottom: '1rem',
  fontWeight: 400,
};

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 12,
  padding: '1.25rem',
  position: 'relative',
};

const winnerBadge = {
  position: 'absolute',
  top: 12,
  right: 12,
  background: 'var(--accent)',
  color: '#0a0f1e',
  fontSize: '0.65rem',
  fontFamily: 'DM Mono',
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '2px 8px',
  borderRadius: 4,
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Serif Display', fontSize: '1.6rem', color: accent ? 'var(--accent)' : 'var(--text)', marginBottom: '0.2rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
        {sub}
      </div>
    </div>
  );
}